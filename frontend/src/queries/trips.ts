import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getFromApi, patchToApi } from '../utils/api';

export interface TripTraveler {
  id: string;
  username: string;
  profile_picture?: string | null;
}

export interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
  travelers?: TripTraveler[];
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

export interface TripInvitation {
  _id: string;
  trip: Trip & {
    owner?: { username: string; profile_picture?: string | null } | null;
  };
  inviter: { username: string } | null;
}

/** Loads pending invitations for a signed-in user.
 * @param userId - Recipient identifier used to isolate cached data.
 * @returns The invitation query including retry and loading state.
 */
export const useTripInvitations = (userId?: string) =>
  useQuery({
    queryKey: ['trip-invitations', userId],
    queryFn: () => getFromApi<TripInvitation[]>('/trip/invitations'),
    enabled: Boolean(userId),
  });

/** Persists an invitation response and refreshes membership and pending invitations.
 * @param userId - Current recipient identifier.
 * @returns A mutation accepting an invitation ID and response status.
 */
export const useRespondToTripInvitation = (userId?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'accepted' | 'declined';
    }) => patchToApi(`/trip/invitations/${id}`, { status }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['trip-invitations', userId] }),
        client.invalidateQueries({ queryKey: tripsQueryKey(userId) }),
      ]);
    },
  });
};
