import { useQuery } from '@tanstack/react-query';
import { getFromApi } from '../utils/api';

export const EVENT_TYPE = {
  ACTIVITY: 'activity',
  RESTAURANT: 'restaurant',
  HOTEL_CHECKIN: 'hotel_checkin',
  HOTEL_CHECKOUT: 'hotel_checkout',
  RENTALCAR_PICKUP: 'rentalcar_pickup',
  RENTALCAR_RETURN: 'rentalcar_return',
  FLIGHT: 'flight',
} as const;
export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
export interface ItineraryAction {
  _id?: string;
  version?: number;
  eventType: EventType;
  startTime: string;
  endTime: string;
}

export interface EventData {
  version: number;
  eventType: EventType;
  reservation?: string | null;
  _id: string;
  title: string;
  placeId?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  startTime: string;
  endTime: string;
  notes?: string;
  reservationMade?: boolean;
}

export interface EventPhotoData {
  url: string;
  sourceUrl: string;
  authorAttributions: { displayName: string; uri?: string }[];
}

/** Creates the cache key for an itinerary's event collection. */
export const eventsQueryKey = (itineraryId?: string) =>
  ['events', itineraryId] as const;

/** Loads events for an itinerary and exposes the result as named properties.
 * @param itineraryId - Itinerary identifier; disables the query when absent.
 * @returns Events, loading and error state, and a retry function.
 */
export const useEvents = (itineraryId?: string) => {
  const {
    data: events = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: eventsQueryKey(itineraryId),
    queryFn: () =>
      getFromApi<EventData[]>(`/event?itinerary_id=${itineraryId}`),
    staleTime: 30_000,
    enabled: Boolean(itineraryId),
  });

  return { events, isPending, isError, refetch };
};

/** Loads a short-lived Google place photo only when its event card is visible.
 * @param eventId - Event whose selected place supplies the photo.
 * @param placeId - Selected Google place ID, used to refresh when the match changes.
 * @param enabled - Whether the event has a place and is near the viewport.
 * @returns Photo details, if the place has a usable image.
 */
export const useEventPhoto = (
  eventId: string,
  placeId: string | null | undefined,
  enabled: boolean,
) => {
  const { data, isPending } = useQuery({
    queryKey: ['event-photo', eventId, placeId],
    queryFn: () =>
      getFromApi<{ photo: EventPhotoData | null }>(`/event/${eventId}/photo`),
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { photo: data?.photo ?? null, isPending };
};
