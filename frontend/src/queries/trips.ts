import { useQuery } from '@tanstack/react-query';
import { getFromApi } from '../utils/api';

export interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
}

/** Creates the cache key for a user's trips. */
export const tripsQueryKey = (userId?: string) => ['trips', userId] as const;

/** Loads the authenticated user's trips and exposes query state as named values.
 * @param userId - Authenticated user's identifier; disables the query when absent.
 * @returns Trips, loading and error state, plus refetch for retry actions.
 */
export const useTrips = (userId?: string) => {
  const {
    data: trips = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: tripsQueryKey(userId),
    queryFn: async () => {
      const result = await getFromApi<Trip[]>('/trip');
      if (!Array.isArray(result))
        throw new Error('Expected an array of trips.');
      return result;
    },
    enabled: Boolean(userId),
  });

  return { trips, isPending, isError, refetch };
};
