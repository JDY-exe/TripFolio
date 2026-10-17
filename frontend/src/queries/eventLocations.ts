import { useQueries } from '@tanstack/react-query';
import { getFromApi } from '../utils/api';
import type { EventData } from './events';

export interface EventLocation {
  lat: number;
  lng: number;
}
export type LocatedEvent = EventData & EventLocation;

/** Checks whether an event already contains a valid coordinate pair.
 * @param event - Event returned by the API.
 * @returns Whether its coordinates can be passed directly to the map.
 */
const hasCoordinates = (event: EventData): event is LocatedEvent =>
  typeof event.lat === 'number' &&
  Number.isFinite(event.lat) &&
  Math.abs(event.lat) <= 90 &&
  typeof event.lng === 'number' &&
  Number.isFinite(event.lng) &&
  Math.abs(event.lng) <= 180;

/** Uses saved event coordinates directly and resolves older events only as needed.
 * @param events - Events to locate, with the active day's events ordered first.
 * @returns Located events and progressive lookup status, including missing places.
 */
export const useEventLocations = (events: EventData[]) => {
  const results = useQueries({
    queries: events.map((event) => ({
      queryKey: ['event-location', event._id, event.placeId, event.address],
      queryFn: () =>
        getFromApi<{ location: EventLocation | null }>(
          `/event/${event._id}/location`,
        ),
      enabled:
        !hasCoordinates(event) && Boolean(event.placeId || event.address),
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const locatedEvents: LocatedEvent[] = events.flatMap((event, index) => {
    const location = hasCoordinates(event)
      ? { lat: event.lat, lng: event.lng }
      : results[index].data?.location;
    return location ? [{ ...event, ...location }] : [];
  });
  return {
    locatedEvents,
    isLoading: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    missingCount: events.length - locatedEvents.length,
    retry: () =>
      results.forEach((result, index) => {
        if (
          !hasCoordinates(events[index]) &&
          (events[index].placeId || events[index].address) &&
          !result.data?.location
        )
          void result.refetch();
      }),
  };
};
