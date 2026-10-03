import { useQuery } from '@tanstack/react-query';
import { useLoading } from '../contexts/LoadingContext';
import { getFromApi } from '../utils/api';

export interface Itinerary {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

/** Creates the cache key for a trip's itinerary. */
export const itineraryQueryKey = (tripId?: string) =>
  ['itinerary', tripId] as const;

/** Loads a trip's itinerary and returns its data and query state by name.
 * @param tripId - Trip identifier; disables the query when absent.
 * @returns Itinerary data, loading and error state, and a retry function.
 */
export const useItinerary = (tripId?: string) => {
  const { setLoading } = useLoading();
  const {
    data: itinerary,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: itineraryQueryKey(tripId),
    queryFn: async () => {
      setLoading(true);
      try {
        return await getFromApi<Itinerary>(`/itinerary?id=${tripId}`);
      } finally {
        setLoading(false);
      }
    },
    enabled: Boolean(tripId),
  });

  return { itinerary, isPending, isError, refetch };
};
