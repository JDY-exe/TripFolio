import { changedValues, useTripEditing } from './tripEditing';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFromApi, getFromApi, patchToApi, postToApi } from '../utils/api';

export interface EventData {
  version: number;
  _id: string;
  title: string;
  placeId?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  startTime: string;
  endTime: string;
  notes?: string;
  restaurant?: boolean;
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

/** Saves an event through the trip coordinator and refreshes all event consumers.
 * @returns A mutation accepting editable values and the editor's original event.
 */
export const useSaveEvent = () => {
  const editing = useTripEditing();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itineraryId,
      values,
      baseline,
    }: {
      itineraryId: string;
      values: Omit<EventData, '_id' | 'version' | 'lat' | 'lng'>;
      baseline?: EventData;
    }) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      if (baseline) {
        const patch = changedValues(
          {
            ...baseline,
            notes: baseline.notes ?? '',
            restaurant: baseline.restaurant ?? false,
            reservationMade: baseline.reservationMade ?? false,
            placeId: baseline.placeId ?? null,
            address: baseline.address ?? '',
          },
          values,
        );
        return editing.write({
          kind: 'event',
          baseline,
          draft: patch,
          send: (expectedVersion) =>
            patchToApi<EventData>(`/event/${baseline._id}`, {
              ...patch,
              expectedVersion,
            }),
        });
      }
      await editing.refresh();
      return postToApi<EventData>('/event', {
        itineraryID: itineraryId,
        ...values,
      });
    },
    onSuccess: async (_event, variables) => {
      if (variables.baseline) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['events'] }),
        client.invalidateQueries({ queryKey: ['public-itinerary'] }),
        client.invalidateQueries({ queryKey: ['public-itinerary-feed'] }),
      ]);
    },
  });
};

/** Deletes the reviewed event with document version protection.
 * @returns A mutation that prompts again when the event changed after confirmation opened.
 */
export const useDeleteEvent = () => {
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async (baseline: EventData) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      return editing.write({
        kind: 'event',
        baseline,
        draft: {},
        deleting: true,
        send: (expectedVersion) =>
          deleteFromApi(`/event/${baseline._id}`, {
            data: { expectedVersion },
          }),
      });
    },
  });
};
