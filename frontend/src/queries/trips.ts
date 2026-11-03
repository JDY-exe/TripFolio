import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getFromApi, patchToApi, postToApi } from '../utils/api';

export interface TripTraveler {
  id: string;
  username: string;
  profile_picture?: string | null;
}

export type TripMemberRole = 'owner' | 'editor' | 'viewer';

export interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
  ownerId?: string;
  users?: string[];
  viewerIds?: string[];
  memberRoles?: Record<string, TripMemberRole>;
  travelers?: TripTraveler[];
}

/** Creates the cache key for a user's trips. */
export const tripsQueryKey = (userId?: string) => ['trips', userId] as const;

/** Creates a separate cache key for archived trips without colliding with active lists. */
export const archivedTripsQueryKey = (userId?: string) =>
  ['archived-trips', userId] as const;

export interface TripDetails extends Trip {
  isPublic: boolean;
  currentUserRole: TripMemberRole | null;
  hiddenUsers?: string[];
  archived: boolean;
}

export interface UpdateTripMemberRoleInput {
  tripId: string;
  userId: string;
  role: Exclude<TripMemberRole, 'owner'>;
}

interface UpdateTripMemberRoleResponse {
  message: string;
  member: {
    userId: string;
    role: Exclude<TripMemberRole, 'owner'>;
  };
}

/**
 * Applies a member role to cached trip data while retaining legacy viewer IDs.
 * @param trip - Cached trip record to update.
 * @param userId - Member whose role changed.
 * @param role - New editable member role.
 * @returns A trip copy with synchronized role fields.
 */
const applyTripMemberRole = <T extends Trip>(
  trip: T,
  userId: string,
  role: Exclude<TripMemberRole, 'owner'>,
): T => ({
  ...trip,
  memberRoles: { ...trip.memberRoles, [userId]: role },
  viewerIds:
    role === 'viewer'
      ? [...new Set([...(trip.viewerIds ?? []), userId])]
      : (trip.viewerIds ?? []).filter((memberId) => memberId !== userId),
});

/**
 * Persists a trip member role and synchronizes trip detail/list caches.
 * @param userId - Current user's identifier for the user's trip-list cache.
 * @returns A mutation accepting the trip, member, and new role.
 */
export const useUpdateTripMemberRole = (userId?: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      tripId,
      userId: memberId,
      role,
    }: UpdateTripMemberRoleInput) =>
      patchToApi<UpdateTripMemberRoleResponse>(
        `/trip/${tripId}/members/${memberId}/role`,
        { role },
      ),
    onSuccess: ({ member }, { tripId }) => {
      client.setQueryData<TripDetails>(['trip-settings', tripId], (current) =>
        current
          ? applyTripMemberRole(current, member.userId, member.role)
          : current,
      );
      client.setQueryData<Trip[]>(tripsQueryKey(userId), (current) =>
        current?.map((trip) =>
          trip._id === tripId
            ? applyTripMemberRole(trip, member.userId, member.role)
            : trip,
        ),
      );
      void client.invalidateQueries({ queryKey: tripsQueryKey(userId) });
    },
  });
};

/** Loads shared trip details, including archive status and the current user's permissions.
 * @param tripId - Trip identifier; disables fetching when absent.
 * @returns The cached trip detail query.
 */
export const useTripDetails = (tripId?: string) =>
  useQuery({
    queryKey: ['trip-settings', tripId],
    queryFn: () => getFromApi<TripDetails>(`/trip/${tripId}`),
    enabled: Boolean(tripId),
  });

/** Loads the authenticated user's trips and exposes query state as named values.
 * @param userId - Authenticated user's identifier; disables the query when absent.
 * @param archived - Selects the archived endpoint and its separate cache key.
 * @returns Trips, loading and error state, plus refetch for retry actions.
 */
export const useTrips = (userId?: string, archived = false) => {
  const {
    data: trips = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: archived ? archivedTripsQueryKey(userId) : tripsQueryKey(userId),
    queryFn: async () => {
      const result = await getFromApi<Trip[]>(
        archived ? '/trip/archived' : '/trip',
      );
      if (!Array.isArray(result))
        throw new Error('Expected an array of trips.');
      return result;
    },
    enabled: Boolean(userId),
  });

  return { trips, isPending, isError, refetch };
};

/** Loads the user's archived trips using an isolated archive-list cache.
 * @param userId - Authenticated user's identifier.
 * @returns Trips and their query state.
 */
export const useArchivedTrips = (userId?: string) => useTrips(userId, true);

export interface TripInvitation {
  _id: string;
  trip: Trip & {
    owner?: { username: string; profile_picture?: string | null } | null;
  };
  inviter: { username: string } | null;
}

interface TripInvitationsResponse {
  invites: TripInvitation[];
}

/** Loads pending invitations for a signed-in user.
 * @param userId - Recipient identifier used to isolate cached data.
 * @returns The invitation query including retry and loading state.
 */
export const useTripInvitations = (userId?: string) =>
  useQuery({
    queryKey: ['trip-invitations', userId],
    queryFn: async () => {
      const response = await getFromApi<
        TripInvitation[] | TripInvitationsResponse
      >('/trip/invitations');
      if (Array.isArray(response)) return response;
      if (!Array.isArray(response.invites)) {
        throw new Error('Expected trip invitations in the API response.');
      }
      return response.invites;
    },
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
