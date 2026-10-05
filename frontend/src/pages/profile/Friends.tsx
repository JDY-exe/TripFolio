import { useState, type ChangeEvent } from 'react';
import { Bell, Check, Clock3, UserPlus, UserRound } from 'lucide-react';
import {
  Button,
  LoadingIndicator,
  Text,
  TextField,
  displayAlert,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  classifyFriendRelationship,
  useAcceptFriendRequest,
  useFriendSearch,
  useFriends,
  useSendFriendRequest,
  type FriendProfile,
} from '../../queries/friends';
import { getApiErrorMessage } from '../../utils/api';

interface FriendIdentityProps {
  user: FriendProfile;
}

/** Displays a person's avatar and username in a compact relationship row.
 * @param props - Public user details to display.
 * @returns The user's avatar and username.
 */
const FriendIdentity = ({ user }: FriendIdentityProps) => (
  <div className="flex min-w-0 items-center gap-3">
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary-container text-on-secondary-container">
      {user.profile_picture ? (
        <img
          alt=""
          className="size-full object-cover"
          src={user.profile_picture}
        />
      ) : (
        <UserRound aria-hidden size={20} />
      )}
    </span>
    <Text className="truncate" variant="label">
      {user.username}
    </Text>
  </div>
);

/** Formats a request timestamp for concise list metadata.
 * @param createdAt - ISO timestamp returned by the friends API.
 * @returns A localized date, or an empty string for invalid timestamps.
 */
const formatRequestDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Provides account search, request actions, and chronological relationship lists.
 *
 * @returns The authenticated user's friend management section.
 */
const Friends = () => {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const { friends, isPending, isError, error, refetch } = useFriends(user?.id);
  const searchQuery = searchText.trim();
  const {
    users: searchResults,
    isPending: isSearchPending,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
  } = useFriendSearch(searchQuery, user?.id, Boolean(friends) && !isError);
  const sendRequest = useSendFriendRequest(user?.id);
  const acceptRequest = useAcceptFriendRequest(user?.id);

  /** Updates the username text that keys the search query.
   * @param event - Native input event from the username field.
   * @returns Nothing; the search draft is stored in component state.
   */
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  /** Sends a request and reports the server result through the shared toast.
   * @param targetUserId - Account selected from username search.
   * @returns A promise that settles after the request mutation completes.
   */
  const handleSendRequest = async (targetUserId: string): Promise<void> => {
    try {
      const response = await sendRequest.mutateAsync(targetUserId);
      displayAlert({ message: response.message, tone: 'success' });
    } catch (requestError) {
      displayAlert({
        message: getApiErrorMessage(
          requestError,
          'Could not send the request.',
        ),
        tone: 'error',
      });
    }
  };

  /** Accepts an incoming request and reports the server result through the shared toast.
   * @param requestId - Incoming request identifier returned by the API.
   * @returns A promise that settles after the accept mutation completes.
   */
  const handleAcceptRequest = async (requestId: string): Promise<void> => {
    try {
      const response = await acceptRequest.mutateAsync(requestId);
      displayAlert({ message: response.message, tone: 'success' });
    } catch (requestError) {
      displayAlert({
        message: getApiErrorMessage(
          requestError,
          'Could not accept the request.',
        ),
        tone: 'error',
      });
    }
  };

  const isRelationshipPending =
    sendRequest.isPending || acceptRequest.isPending;

  return (
    <section aria-labelledby="friends-heading" className="text-on-surface">
      <Text as="h2" id="friends-heading" variant="title">
        Friends
      </Text>

      <div className="mt-6 grid gap-9">
        <section aria-labelledby="incoming-requests-heading">
          <header className="mb-3 flex items-center justify-between gap-3">
            <Text as="h3" id="incoming-requests-heading" variant="label">
              <span className="inline-flex items-center gap-2">
                <Bell aria-hidden size={17} /> Incoming requests
              </span>
            </Text>
            <Text aria-live="polite" color="muted" variant="caption">
              {friends?.incomingRequests.length ?? 0}
            </Text>
          </header>

          {isPending ? (
            <LoadingIndicator label="Loading friend requests" size={36} />
          ) : isError ? (
            <div className="flex flex-wrap items-center gap-3" role="alert">
              <Text color="error">
                {getApiErrorMessage(error, 'Could not load your friends.')}
              </Text>
              <Button
                onClick={() => void refetch()}
                size="sm"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : friends?.incomingRequests.length ? (
            <ul className="divide-y divide-outline-variant">
              {friends.incomingRequests.map((request) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1"
                  key={request.id}
                >
                  <div className="min-w-0 flex-1">
                    <FriendIdentity user={request.user} />
                    <Text
                      className="ml-13 mt-1"
                      color="muted"
                      variant="caption"
                    >
                      {formatRequestDate(request.createdAt)}
                    </Text>
                  </div>
                  <Button
                    disabled={isRelationshipPending}
                    leadingIcon={<Check aria-hidden size={17} />}
                    onClick={() => void handleAcceptRequest(request.id)}
                    size="sm"
                  >
                    Accept
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Text color="muted">No new requests.</Text>
          )}
        </section>

        <section aria-labelledby="search-friends-heading">
          <Text
            as="h3"
            className="mb-3"
            id="search-friends-heading"
            variant="label"
          >
            Find people
          </Text>
          <TextField
            autoComplete="off"
            id="friend-search"
            label="Username"
            onChange={handleSearchChange}
            placeholder="Search usernames"
            type="search"
            value={searchText}
          />

          {searchQuery.length > 0 && searchQuery.length < 2 ? (
            <Text className="mt-3" color="muted" variant="caption">
              Enter at least two characters.
            </Text>
          ) : null}
          {searchQuery.length >= 2 && isPending ? (
            <Text className="mt-3" color="muted">
              Checking your relationships before search.
            </Text>
          ) : null}
          {searchQuery.length >= 2 && isError ? (
            <Text className="mt-3" color="error" role="alert">
              Load your friends before searching.
            </Text>
          ) : null}
          {searchQuery.length >= 2 && !isPending && !isError ? (
            isSearchPending ? (
              <LoadingIndicator
                className="mt-4"
                label="Searching people"
                size={36}
              />
            ) : isSearchError ? (
              <div
                className="mt-3 flex flex-wrap items-center gap-3"
                role="alert"
              >
                <Text color="error">
                  {getApiErrorMessage(
                    searchError,
                    'Could not search usernames.',
                  )}
                </Text>
                <Button
                  onClick={() => void refetchSearch()}
                  size="sm"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : searchResults.length ? (
              <ul className="mt-3 divide-y divide-outline-variant">
                {searchResults.map((result) => {
                  const relationship = classifyFriendRelationship(
                    result.id,
                    user?.id,
                    friends,
                  );
                  const incomingRequest = friends?.incomingRequests.find(
                    (request) => request.user.id === result.id,
                  );

                  return (
                    <li
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1"
                      key={result.id}
                    >
                      <FriendIdentity user={result} />
                      {relationship === 'none' ? (
                        <Button
                          disabled={isRelationshipPending}
                          leadingIcon={<UserPlus aria-hidden size={17} />}
                          onClick={() => void handleSendRequest(result.id)}
                          size="sm"
                          variant="outline"
                        >
                          Add friend
                        </Button>
                      ) : relationship === 'incoming' && incomingRequest ? (
                        <Button
                          disabled={isRelationshipPending}
                          leadingIcon={<Check aria-hidden size={17} />}
                          onClick={() =>
                            void handleAcceptRequest(incomingRequest.id)
                          }
                          size="sm"
                        >
                          Accept
                        </Button>
                      ) : (
                        <Text
                          className="inline-flex items-center gap-1.5"
                          color="muted"
                          variant="caption"
                        >
                          {relationship === 'self' ? (
                            'You'
                          ) : relationship === 'friend' ? (
                            <>
                              <Check aria-hidden size={15} /> Friends
                            </>
                          ) : relationship === 'incoming' ? (
                            'Request received'
                          ) : (
                            <>
                              <Clock3 aria-hidden size={15} /> Request sent
                            </>
                          )}
                        </Text>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Text className="mt-3" color="muted">
                No accounts found.
              </Text>
            )
          ) : null}
        </section>

        <section aria-labelledby="sent-requests-heading">
          <Text
            as="h3"
            className="mb-3"
            id="sent-requests-heading"
            variant="label"
          >
            Sent requests
          </Text>
          {friends?.outgoingRequests.length ? (
            <ul className="divide-y divide-outline-variant">
              {friends.outgoingRequests.map((request) => (
                <li
                  className="flex items-center justify-between gap-3 py-3 first:pt-1"
                  key={request.id}
                >
                  <FriendIdentity user={request.user} />
                  <Text className="shrink-0" color="muted" variant="caption">
                    {formatRequestDate(request.createdAt)}
                  </Text>
                </li>
              ))}
            </ul>
          ) : (
            <Text color="muted">No sent requests.</Text>
          )}
        </section>

        <section aria-labelledby="all-friends-heading">
          <Text
            as="h3"
            className="mb-3"
            id="all-friends-heading"
            variant="label"
          >
            Your friends
          </Text>
          {friends?.friends.length ? (
            <ul className="divide-y divide-outline-variant">
              {friends.friends.map((friend) => (
                <li className="py-3 first:pt-1" key={friend.id}>
                  <FriendIdentity user={friend} />
                </li>
              ))}
            </ul>
          ) : (
            <Text color="muted">Your friends will appear here.</Text>
          )}
        </section>
      </div>
    </section>
  );
};

export default Friends;
