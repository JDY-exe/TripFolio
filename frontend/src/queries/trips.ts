import { useTripEditing } from './tripEditing';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { deleteFromApi, getFromApi, patchToApi, postToApi } from '../utils/api';

export interface TripTraveler {
  id: string;
  username: string;
  profile_picture?: string | null;
}

export interface Trip {
  version: number;
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
  travelers?: TripTraveler[];
  isPublic: boolean;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  users?: string[];
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
  trip: Pick<
    Trip,
    '_id' | 'name' | 'startDate' | 'endDate' | 'profilePictureId'
  > & {
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

export interface SendTripInvitationsInput {
  tripId: string;
  recipientIds: string[];
}

export interface SendTripInvitationsResponse {
  message: string;
  invitations: {
    _id: string;
    trip: string;
    recipient: string;
    inviter: string;
    status: 'pending';
  }[];
}

/** Sends a single atomic invitation batch without changing trip membership.
 * @returns A mutation with batch pending, success, and error state; retries are manual.
 */
export const useSendTripInvitations = () =>
  useMutation({
    mutationFn: ({ tripId, recipientIds }: SendTripInvitationsInput) =>
      postToApi<SendTripInvitationsResponse, { recipientIds: string[] }>(
        `/trip/${tripId}/share`,
        { recipientIds },
      ),
    retry: 0,
  });

/** Loads trip settings through the shared entity cache.
 * @param tripId - Trip to load.
 * @returns The trip and its loading and error state.
 */
export const useTrip = (tripId?: string) =>
  useQuery({
    queryKey: ['trip-settings', tripId],
    queryFn: () => getFromApi<Trip>(`/trip/${tripId}`),
    enabled: Boolean(tripId),
  });

/** Saves trip visibility against the version captured before the write action.
 * @returns A mutation accepting the original trip and desired visibility.
 */
export const useSaveTripVisibility = () => {
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async ({
      baseline,
      isPublic,
    }: {
      baseline: Trip;
      isPublic: boolean;
    }) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      return editing.write({
        kind: 'trip',
        baseline,
        draft: { isPublic },
        send: (expectedVersion) =>
          patchToApi<Trip>(`/trip/${baseline._id}/visibility`, {
            isPublic,
            expectedVersion,
          }),
      });
    },
  });
};

/** Replaces a trip cover with version protection and retains the selected file on conflict.
 * @returns A mutation accepting the original trip and cropped image file.
 */
export const useSaveTripPicture = () => {
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async ({ baseline, file }: { baseline: Trip; file: File }) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      return editing.write({
        kind: 'trip',
        baseline,
        draft: { profilePictureId: file },
        send: (expectedVersion) => {
          const image = new FormData();
          image.append('image', file);
          image.append('expectedVersion', String(expectedVersion));
          return patchToApi<{ trip: Trip }>(
            `/trip/${baseline._id}/profile_picture`,
            image,
          );
        },
      });
    },
  });
};

/** Deletes the reviewed trip and clears its settings cache after success.
 * @returns A mutation requiring the version shown in the confirmation flow.
 */
export const useDeleteTrip = () => {
  const editing = useTripEditing();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (baseline: Trip) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      await editing.write({
        kind: 'trip',
        baseline,
        draft: {},
        deleting: true,
        send: (expectedVersion) =>
          deleteFromApi(`/trip/${baseline._id}`, { data: { expectedVersion } }),
      });
      client.removeQueries({ queryKey: ['trip-settings', baseline._id] });
    },
  });
};
