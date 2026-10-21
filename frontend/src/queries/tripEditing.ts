import { createContext, useContext } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { getFromApi } from '../utils/api';
import { eventsQueryKey, type EventData } from './events';
import { itineraryQueryKey, type Itinerary } from './itineraries';
import {
  reservationsQueryKey,
  ReservationType,
  type Reservation,
} from './reservations';
import type { Trip } from './trips';

export interface VersionedDocument {
  _id: string;
  version: number;
}
export type DocumentKind = 'trip' | 'itinerary' | 'event' | 'reservation';
export interface EditingTarget {
  kind: DocumentKind;
  id: string;
  type?: ReservationType;
}
export interface RefreshState {
  isRefreshing: boolean;
  refreshError: string | null;
}
export interface TripWriteOptions<T> {
  kind: DocumentKind;
  baseline: VersionedDocument & { type?: ReservationType };
  draft: Record<string, unknown>;
  deleting?: boolean;
  send: (expectedVersion: number) => Promise<T>;
}
export interface TripEditing {
  busy: boolean;
  refreshStates: Record<string, RefreshState>;
  refresh: (target: EditingTarget) => Promise<VersionedDocument | undefined>;
  prepare: (open: () => void, target?: EditingTarget) => Promise<void>;
  write: <T>(options: TripWriteOptions<T>) => Promise<T>;
}
export const TripEditingContext = createContext<TripEditing | null>(null);

/** Reads the trip's editing coordinator; public read-only views need no provider.
 * @returns The editing context, or null outside an editable trip.
 */
export const useTripEditing = () => useContext(TripEditingContext);

/** Signals that conflict resolution returned to editing or discarded the draft. */
export class TripWriteCancelled extends Error {
  readonly discarded: boolean;
  constructor(discarded = false) {
    super('Save cancelled');
    this.discarded = discarded;
  }
}

/** Identifies refresh state and in-flight reads for one document.
 * @param target - Document to refresh.
 * @returns A stable key shared by its editor and save action.
 */
export const editingTargetKey = (target: EditingTarget) =>
  JSON.stringify([target.kind, target.id, target.type]);

/** Pulls only the edited document and merges it into the relevant entity cache.
 * @param client - Shared React Query cache.
 * @param tripId - Trip owning the document.
 * @param target - Document and, for reservations, its category.
 * @returns Its latest saved version, or undefined when it was deleted.
 */
export const refreshEditingDocument = async (
  client: QueryClient,
  tripId: string,
  target: EditingTarget,
): Promise<VersionedDocument | undefined> => {
  if (target.kind === 'trip') {
    const queryKey = ['trip-settings', tripId];
    await client.cancelQueries({ queryKey, exact: true });
    const trip = await getFromApi<Trip>(`/trip/${tripId}`);
    client.setQueryData(queryKey, trip);
    client.setQueriesData<Trip[]>({ queryKey: ['trips'] }, (current) =>
      current?.map((item) =>
        item._id === tripId ? { ...item, ...trip } : item,
      ),
    );
    return trip._id === target.id ? trip : undefined;
  }
  if (target.kind === 'itinerary') {
    const queryKey = itineraryQueryKey(tripId);
    await client.cancelQueries({ queryKey, exact: true });
    const itinerary = await getFromApi<Itinerary>(`/itinerary?id=${tripId}`);
    client.setQueryData(queryKey, itinerary);
    return itinerary._id === target.id ? itinerary : undefined;
  }
  const itinerary = client.getQueryData<Itinerary>(itineraryQueryKey(tripId));
  if (target.kind === 'event' && !itinerary)
    throw new Error('The itinerary must be loaded before editing an event.');
  if (target.kind === 'reservation' && !target.type)
    throw new Error('The reservation category is required.');
  const queryKey =
    target.kind === 'event'
      ? eventsQueryKey(itinerary!._id)
      : reservationsQueryKey(tripId, target.type);
  await client.cancelQueries({ queryKey, exact: true });
  const paths = {
    [ReservationType.Flights]: 'flights',
    [ReservationType.Accommodations]: 'hotels',
    [ReservationType.Rentals]: 'rental_cars',
  };
  const records =
    target.kind === 'event'
      ? await getFromApi<EventData[]>(
          `/event?itinerary_id=${itinerary!._id}&id=${target.id}`,
        )
      : (
          await getFromApi<{ reservations: Reservation[] }>(
            `/logistics/${paths[target.type!]}`,
            { params: { tripId, id: target.id } },
          )
        ).reservations;
  const document = records.find((item) => item._id === target.id);
  // A single-record response must not replace its siblings or invent a partial list.
  client.setQueryData<(EventData | Reservation)[]>(queryKey, (current) => {
    if (!current) return current;
    if (!document) return current.filter((item) => item._id !== target.id);
    if (!current.some((item) => item._id === target.id))
      return [...current, document];
    return current.map((item) => (item._id === target.id ? document : item));
  });
  return document;
};

/** Keeps only fields whose serialized draft values differ from the original document.
 * @param baseline - Original values used to initialize the editor.
 * @param values - Submitted editable fields.
 * @returns A patch containing intentional changes.
 */
export const changedValues = (
  baseline: object,
  values: object,
): Record<string, unknown> => {
  const original = baseline as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => JSON.stringify(original[key]) !== JSON.stringify(value),
    ),
  );
};
