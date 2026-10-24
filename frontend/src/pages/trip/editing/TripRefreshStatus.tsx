import { useEffect, useState } from 'react';
import { useCachedQuery } from '../../../queries/useCachedQuery';
import { useParams } from 'react-router';
import { Button, Text } from '../../../components/common';
import { editingTargetKey, useTripEditing } from '../../../queries/tripEditing';
import type {
  DocumentKind,
  VersionedDocument,
} from '../../../queries/tripEditing';
import type { Trip } from '../../../queries/trips';
import {
  itineraryQueryKey,
  type Itinerary,
} from '../../../queries/itineraries';
import { eventsQueryKey, type EventData } from '../../../queries/events';
import {
  reservationsQueryKey,
  type Reservation,
  type ReservationType,
} from '../../../queries/reservations';

interface TripRefreshStatusProps {
  kind?: DocumentKind;
  baseline?: VersionedDocument & { type?: ReservationType };
}

/** Shows a local refresh notice without changing the draft or its version baseline.
 * @param props - The optional document captured when this editor opened.
 * @returns Delayed refresh feedback, a retry action, or a notice about unseen changes.
 */
const TripRefreshStatus = ({ kind, baseline }: TripRefreshStatusProps) => {
  const editing = useTripEditing();
  const { id } = useParams();
  const target =
    kind && baseline
      ? { kind, id: baseline._id, type: baseline.type }
      : undefined;
  const refreshState = target
    ? editing?.refreshStates[editingTargetKey(target)]
    : undefined;
  const refreshing = refreshState?.isRefreshing ?? false;
  const refreshError = refreshState?.refreshError;
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setShowPending(refreshing),
      refreshing ? 400 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [refreshing]);
  const itinerary = useCachedQuery<Itinerary>(itineraryQueryKey(id));
  let queryKey: readonly unknown[] = ['trip-refresh-status'];
  if (kind === 'trip') queryKey = ['trip-settings', id];
  if (kind === 'itinerary') queryKey = itineraryQueryKey(id);
  if (kind === 'event') queryKey = eventsQueryKey(itinerary?._id);
  if (kind === 'reservation')
    queryKey = reservationsQueryKey(id, baseline?.type);
  const data = useCachedQuery<Trip | Itinerary | EventData[] | Reservation[]>(
    queryKey,
  );
  const current = Array.isArray(data)
    ? data.find((item) => item._id === baseline?._id)
    : data;
  const changed = Boolean(
    baseline && current && current.version !== baseline.version,
  );
  const deleted = Boolean(
    baseline && kind && !current && !refreshing && !refreshError,
  );

  return (
    <div data-cy="trip-refresh-status" className="min-h-6" aria-live="polite">
      {refreshing && showPending && (
        <Text
          data-cy="trip-refresh-pending"
          variant="caption"
          color="muted"
          role="status"
        >
          {editing?.busy
            ? 'Checking for updates before saving…'
            : 'Checking for updates… You can keep editing.'}
        </Text>
      )}
      {!refreshing && refreshError && (
        <div className="flex flex-wrap items-center gap-2">
          <Text data-cy="trip-refresh-error" variant="caption" color="error">
            {refreshError} You can keep editing; save will check again.
          </Text>
          <Button
            data-cy="trip-refresh-retry"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (target) void editing?.refresh(target).catch(() => undefined);
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {!refreshing && !refreshError && changed && (
        <Text data-cy="trip-refresh-changed" variant="caption" color="muted">
          Newer changes are available. Your draft is unchanged; review them when
          you save.
        </Text>
      )}
      {deleted && (
        <Text data-cy="trip-refresh-deleted" variant="caption" color="error">
          This item was deleted. Your draft is still here.
        </Text>
      )}
    </div>
  );
};
export default TripRefreshStatus;
