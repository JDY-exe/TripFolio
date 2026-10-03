import { useQuery } from '@tanstack/react-query';
import { useLoading } from '../contexts/LoadingContext';
import { getFromApi } from '../utils/api';

export interface EventData {
  _id: string;
  title: string;
  address: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

/** Creates the cache key for an itinerary's event collection. */
export const eventsQueryKey = (itineraryId?: string) =>
  ['events', itineraryId] as const;

/** Loads events for an itinerary and exposes the result as named properties.
 * @param itineraryId - Itinerary identifier; disables the query when absent.
 * @returns Events, loading and error state, and a retry function.
 */
export const useEvents = (itineraryId?: string) => {
  const { setLoading } = useLoading();
  const {
    data: events = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: eventsQueryKey(itineraryId),
    queryFn: async () => {
      setLoading(true);
      try {
        return await getFromApi<EventData[]>(
          `/event?itinerary_id=${itineraryId}`,
        );
      } finally {
        setLoading(false);
      }
    },
    staleTime: 30_000,
    enabled: Boolean(itineraryId),
  });

  return { events, isPending, isError, refetch };
};
