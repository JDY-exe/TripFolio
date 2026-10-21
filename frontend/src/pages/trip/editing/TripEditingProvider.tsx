import { useLoading } from '../../../contexts/LoadingContext';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { Button, Modal } from '../../../components/common';
import {
  TripEditingContext,
  TripWriteCancelled,
  editingTargetKey,
  refreshEditingDocument,
} from '../../../queries/tripEditing';
import type {
  EditingTarget,
  RefreshState,
  TripWriteOptions,
  VersionedDocument,
} from '../../../queries/tripEditing';
import { getApiErrorMessage } from '../../../utils/api';
import {
  itineraryQueryKey,
  type Itinerary,
} from '../../../queries/itineraries';
import { eventsQueryKey } from '../../../queries/events';
import { reservationsQueryKey } from '../../../queries/reservations';
import ConflictComparison from './ConflictComparison';

type Choice = 'saved' | 'draft' | 'edit';
interface Conflict {
  current: VersionedDocument;
  draft: Record<string, unknown>;
  deleting: boolean;
}

/** Coordinates fresh reads and document-level conflict resolution for trip editors.
 * @param props - Editable trip views.
 * @returns Views plus the shared refresh and conflict dialogs.
 */
const TripEditingProvider = ({ children }: { children: ReactNode }) => {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const { setLoading } = useLoading();
  const [busy, setBusy] = useState(false);
  const [refreshStates, setRefreshStates] = useState<
    Record<string, RefreshState>
  >({});
  const inFlight = useRef(
    new Map<string, Promise<VersionedDocument | undefined>>(),
  );
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const resolve = useRef<((choice: Choice) => void) | null>(null);
  const active = useRef(false);
  useEffect(
    () => () => {
      resolve.current?.('edit');
      setLoading(false);
    },
    [setLoading],
  );

  /** Shares a pending read only with actions targeting the same document. */
  const refresh = (
    target: EditingTarget,
  ): Promise<VersionedDocument | undefined> => {
    const key = editingTargetKey(target);
    const pending = inFlight.current.get(key);
    if (pending) return pending;
    setRefreshStates((states) => ({
      ...states,
      [key]: { isRefreshing: true, refreshError: null },
    }));
    const request = refreshEditingDocument(client, id, target)
      .then((document) => {
        setRefreshStates((states) => ({
          ...states,
          [key]: { isRefreshing: false, refreshError: null },
        }));
        return document;
      })
      .catch((error: unknown) => {
        setRefreshStates((states) => ({
          ...states,
          [key]: {
            isRefreshing: false,
            refreshError: getApiErrorMessage(
              error,
              'Could not check for updates. Your draft is safe.',
            ),
          },
        }));
        throw error;
      })
      .finally(() => {
        inFlight.current.delete(key);
      });
    inFlight.current.set(key, request);
    return request;
  };

  /** Opens immediately and revalidates an existing document without replacing its draft. */
  const prepare = async (open: () => void, target?: EditingTarget) => {
    open();
    if (!target) return;
    try {
      await refresh(target);
    } catch {
      /* The dialog shows a persistent retry action; retain the open draft. */
    }
  };

  /** Settles the displayed conflict while preserving the original draft. */
  const choose = (choice: Choice) => {
    resolve.current?.(choice);
    resolve.current = null;
    setConflict(null);
  };

  /** Waits for an explicit choice against the exact saved version being displayed. */
  const ask = (
    current: VersionedDocument,
    draft: Record<string, unknown>,
    deleting: boolean,
  ) =>
    new Promise<Choice>((done) => {
      setLoading(false);
      resolve.current = done;
      setConflict({ current, draft, deleting });
    });

  /** Refreshes and compare-and-swaps a write, repeating resolution for intervening saves. */
  const write = async <T,>({
    kind,
    baseline,
    draft,
    deleting = false,
    send,
  }: TripWriteOptions<T>): Promise<T> => {
    if (active.current) throw new TripWriteCancelled();
    active.current = true;
    setBusy(true);
    let expectedVersion = baseline.version;
    try {
      const target = { kind, id: baseline._id, type: baseline.type };
      let current = await refresh(target);
      if (!current)
        throw new Error(
          'This item has been deleted. Your draft has been kept.',
        );
      let serverConflict = false;
      for (;;) {
        if (serverConflict || current.version !== expectedVersion) {
          const choice = await ask(current, draft, deleting);
          if (choice === 'saved') await refresh(target);
          if (choice !== 'draft')
            throw new TripWriteCancelled(choice === 'saved');
          expectedVersion = current.version;
          serverConflict = false;
        }
        try {
          // Only the actual write blocks the screen; GET revalidation stays inside the editor.
          setLoading(true);
          let result: T;
          try {
            result = await send(expectedVersion);
          } finally {
            setLoading(false);
          }
          if (deleting && kind === 'trip')
            client.removeQueries({ queryKey: ['trip-settings', baseline._id] });
          const itinerary = client.getQueryData<Itinerary>(
            itineraryQueryKey(id),
          );
          const keys: (readonly unknown[])[] = [];
          if (kind === 'trip') keys.push(['trips'], ['trip-settings', id]);
          if (kind === 'itinerary') keys.push(itineraryQueryKey(id));
          if (kind === 'event') keys.push(eventsQueryKey(itinerary?._id));
          if (kind === 'reservation') {
            keys.push(reservationsQueryKey(id, baseline.type));
            if (deleting) keys.push(['trips'], ['trip-settings', id]);
          }
          if (kind !== 'reservation')
            keys.push(['public-itinerary', id], ['public-itinerary-feed']);
          if (kind === 'trip' && deleting)
            keys.push(itineraryQueryKey(id), eventsQueryKey(itinerary?._id), [
              'reservations',
              id,
            ]);
          await Promise.all(
            keys.map((queryKey) => client.invalidateQueries({ queryKey })),
          );
          return result;
        } catch (error) {
          if (
            !axios.isAxiosError<{ code?: string; current?: VersionedDocument }>(
              error,
            ) ||
            error.response?.status !== 409 ||
            error.response.data.code !== 'VERSION_CONFLICT' ||
            !error.response.data.current
          )
            throw error;
          current = error.response.data.current;
          serverConflict = true;
        }
      }
    } finally {
      active.current = false;
      setBusy(false);
      setLoading(false);
    }
  };

  return (
    <TripEditingContext.Provider
      value={{ busy, refreshStates, refresh, prepare, write }}
    >
      {children}
      <Modal
        data-cy="trip-conflict-dialog"
        open={Boolean(conflict)}
        title={
          conflict?.deleting
            ? 'This item changed. Delete the saved version?'
            : 'Resolve conflicting changes'
        }
        description="Someone saved changes after you started. Review the saved version before continuing."
        onClose={() => choose('edit')}
        panelClassName="max-w-4xl"
        footer={
          <>
            <Button
              data-cy="conflict-edit"
              variant="secondary"
              onClick={() => choose('edit')}
            >
              Return to editing
            </Button>
            <Button
              data-cy="conflict-saved"
              variant="outline"
              onClick={() => choose('saved')}
            >
              Use saved version
            </Button>
            <Button
              data-cy="conflict-draft"
              variant={conflict?.deleting ? 'danger' : 'primary'}
              onClick={() => choose('draft')}
            >
              {conflict?.deleting ? 'Delete saved version' : 'Keep my draft'}
            </Button>
          </>
        }
      >
        {conflict && (
          <ConflictComparison
            current={conflict.current as unknown as Record<string, unknown>}
            draft={conflict.draft}
            tripId={id}
          />
        )}
      </Modal>
    </TripEditingContext.Provider>
  );
};
export default TripEditingProvider;
