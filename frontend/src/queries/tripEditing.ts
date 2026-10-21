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
export interface TripEditingData {
  trip: Trip;
  itinerary: Itinerary;
  events: EventData[];
  reservations: Reservation[];
}
export type DocumentKind = 'trip' | 'itinerary' | 'event' | 'reservation';
export interface TripWriteOptions<T> {
  kind: DocumentKind;
  baseline: VersionedDocument;
  draft: Record<string, unknown>;
  deleting?: boolean;
  send: (expectedVersion: number) => Promise<T>;
}
export interface TripEditing {
  busy: boolean;
  isRefreshing: boolean;
  refreshError: string | null;
  refresh: () => Promise<TripEditingData>;
  prepare: (open: () => void) => Promise<void>;
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

/** Finds an edited document in freshly fetched entity collections.
 * @param data - Latest trip data.
 * @param kind - Entity collection to inspect.
 * @param id - Target identifier.
 * @returns The current document, if it still exists.
 */
export const findEditingDocument = (
  data: TripEditingData,
  kind: DocumentKind,
  id: string,
): VersionedDocument | undefined => {
  if (kind === 'trip') return data.trip._id === id ? data.trip : undefined;
  if (kind === 'itinerary')
    return data.itinerary._id === id ? data.itinerary : undefined;
  return (kind === 'event' ? data.events : data.reservations).find(
    (item) => item._id === id,
  );
};

/** Fetches existing endpoints directly, then replaces entity caches after all succeed.
 * @param client - Shared React Query cache.
 * @param tripId - Trip whose unseen changes should be pulled.
 * @returns Fresh trip entities, independent of query staleness or mount state.
 */
export const refreshTripEditingData = async (
  client: QueryClient,
  tripId: string,
): Promise<TripEditingData> => {
  const keys = [
    ['trip-settings', tripId],
    itineraryQueryKey(tripId),
    ['reservations', tripId],
    ['events'],
  ];
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
  const [trip, itinerary, flights, accommodations, rentals] = await Promise.all(
    [
      getFromApi<Trip>(`/trip/${tripId}`),
      getFromApi<Itinerary>(`/itinerary?id=${tripId}`),
      getFromApi<{ reservations: Reservation[] }>('/logistics/flights', {
        params: { tripId },
      }),
      getFromApi<{ reservations: Reservation[] }>('/logistics/hotels', {
        params: { tripId },
      }),
      getFromApi<{ reservations: Reservation[] }>('/logistics/rental_cars', {
        params: { tripId },
      }),
    ],
  );
  const events = await getFromApi<EventData[]>(
    `/event?itinerary_id=${itinerary._id}`,
  );
  client.setQueryData(['trip-settings', tripId], trip);
  client.setQueryData(itineraryQueryKey(tripId), itinerary);
  client.setQueryData(eventsQueryKey(itinerary._id), events);
  for (const [type, records] of [
    [ReservationType.Flights, flights.reservations],
    [ReservationType.Accommodations, accommodations.reservations],
    [ReservationType.Rentals, rentals.reservations],
  ] as const) {
    client.setQueryData(reservationsQueryKey(tripId, type), records);
  }
  client.setQueriesData<Trip[]>({ queryKey: ['trips'] }, (current) =>
    current?.map((item) => (item._id === tripId ? { ...item, ...trip } : item)),
  );
  return {
    trip,
    itinerary,
    events,
    reservations: [
      ...flights.reservations,
      ...accommodations.reservations,
      ...rentals.reservations,
    ],
  };
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
