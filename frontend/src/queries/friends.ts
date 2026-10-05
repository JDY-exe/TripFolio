import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFromApi, patchToApi, postToApi } from '../utils/api';

/** Public account details used by search results and friend lists. */
export interface FriendProfile {
  id: string;
  username: string;
  profile_picture?: string | null;
}

/** Incoming or outgoing request paired with the other account. */
export interface FriendRequest {
  id: string;
  createdAt: string;
  user: FriendProfile;
}

/** Relationships returned for the authenticated account. */
export interface FriendsResponse {
  friends: FriendProfile[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
}

/** Relationship state of one searched account relative to the current user. */
export type FriendRelationship =
  'self' | 'friend' | 'incoming' | 'outgoing' | 'none';

interface FriendSearchResponse {
  users: FriendProfile[];
}

interface FriendRequestResponse {
  message: string;
  request: { id: string; status: string; createdAt: string };
}

interface AcceptFriendRequestResponse {
  message: string;
  friendship: { id: string; status: string };
}

/** Creates a cache key scoped to the authenticated account's relationships. */
/**
 * Creates a relationship cache key scoped to the authenticated account ID.
 *
 * @param userId - Authenticated account ID, if available.
 * @returns A React Query key for that account's friends response.
 */
export const friendsQueryKey = (userId?: string) =>
  ['friends', userId] as const;

/** Creates a search cache key scoped to account and normalized username text. */
/**
 * Creates a search cache key from the account ID and normalized username.
 *
 * @param userId - Authenticated account ID, if available.
 * @param query - Trimmed username text used by the search request.
 * @returns A React Query key isolated to this account and search phrase.
 */
export const friendSearchQueryKey = (userId?: string, query?: string) =>
  ['friend-search', userId, query] as const;

/**
 * Resolves the target account's relationship using the authenticated user's ID
 * and the server-provided friend and request collections.
 *
 * @param targetUserId - Account being classified from search results.
 * @param currentUserId - Authenticated account ID from AuthContext.
 * @param relationships - Current server state for the authenticated account.
 * @returns The most relevant relationship state for the target account.
 */
export const classifyFriendRelationship = (
  targetUserId: string,
  currentUserId: string | undefined,
  relationships: FriendsResponse | undefined,
): FriendRelationship => {
  if (currentUserId && targetUserId === currentUserId) return 'self';
  if (!relationships) return 'none';
  if (relationships.friends.some((friend) => friend.id === targetUserId)) {
    return 'friend';
  }
  if (
    relationships.incomingRequests.some(
      (request) => request.user.id === targetUserId,
    )
  ) {
    return 'incoming';
  }
  if (
    relationships.outgoingRequests.some(
      (request) => request.user.id === targetUserId,
    )
  ) {
    return 'outgoing';
  }
  return 'none';
};

/**
 * Loads the authenticated user's friend list and request inbox from the API.
 *
 * @param userId - Authenticated account ID; disables fetching when absent.
 * @returns Relationship data, pending/error flags, and a retry function.
 */
export const useFriends = (userId?: string) => {
  const query = useQuery({
    queryKey: friendsQueryKey(userId),
    queryFn: () => getFromApi<FriendsResponse>('/users/friends'),
    enabled: Boolean(userId),
  });

  return {
    friends: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Searches public accounts by username after the user enters two characters.
 *
 * @param query - Username text to send to the server.
 * @param userId - Authenticated account ID used to isolate cached results.
 * @param enabled - Whether relationship data is ready for result classification.
 * @returns Matching users, query state, and a retry function.
 */
export const useFriendSearch = (
  query: string,
  userId?: string,
  enabled = true,
) => {
  const normalizedQuery = query.trim();
  const search = useQuery({
    queryKey: friendSearchQueryKey(userId, normalizedQuery),
    queryFn: async () => {
      const response = await getFromApi<FriendSearchResponse>('/users/search', {
        params: { username: normalizedQuery },
      });
      return response.users;
    },
    enabled: Boolean(userId) && enabled && normalizedQuery.length >= 2,
  });

  return {
    users: search.data ?? [],
    isPending: search.isPending,
    isError: search.isError,
    error: search.error,
    refetch: search.refetch,
  };
};

/**
 * Sends a friend request and refreshes the authenticated user's relationships.
 *
 * @param userId - Authenticated account ID whose relationship cache is updated.
 * @returns A mutation accepting the ID of the requested account.
 */
export const useSendFriendRequest = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) =>
      postToApi<FriendRequestResponse, { targetUserId: string }>(
        '/users/friends/request',
        { targetUserId },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: friendsQueryKey(userId),
      });
    },
  });
};

/**
 * Accepts an incoming request and refreshes the authenticated user's relationships.
 *
 * @param userId - Authenticated account ID whose relationship cache is updated.
 * @returns A mutation accepting the incoming request ID.
 */
export const useAcceptFriendRequest = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      patchToApi<AcceptFriendRequestResponse, { requestId: string }>(
        '/users/friends/accept',
        { requestId },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: friendsQueryKey(userId),
      });
    },
  });
};
