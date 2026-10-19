import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { UserRound } from 'lucide-react';
import {
  Button,
  ImageUploadField,
  LoadingIndicator,
  Modal,
  TextField,
  Text,
  displayAlert,
  tripCoverImagePreset,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useFriends } from '../../queries/friends';
import { tripsQueryKey } from '../../queries/trips';
import {
  deleteFromApi,
  getBlobFromApi,
  getApiErrorMessage,
  getFromApi,
  patchToApi,
  postToApi,
} from '../../utils/api';

type TripRole = 'owner' | 'editor' | 'viewer' | null;

interface TripSettingsData {
  _id: string;
  name: string;
  isPublic: boolean;
  currentUserRole: TripRole;
  users?: string[];
  profilePictureId?: string;
}

interface TripShareResponse {
  message: string;
}

interface TripPictureResponse {
  trip: Pick<TripSettingsData, '_id' | 'profilePictureId'>;
}

/**
 * Loads trip settings and the current user's role, then lets the owner change
 * the picture or visibility and confirm deletion through the API.
 *
 * @returns The trip settings and their loading or failure state.
 */
const TripSettings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string>();
  const [pictureFile, setPictureFile] = useState<File>();
  const [coverImage, setCoverImage] = useState<{
    pictureId: string;
    url: string;
  }>();
  const queryClient = useQueryClient();
  const friendsQuery = useFriends(user?.id);
  const queryKey = ['trip-settings', id] as const;
  const tripQuery = useQuery({
    queryKey,
    queryFn: () => getFromApi<TripSettingsData>(`/trip/${id}`),
    enabled: Boolean(id),
  });
  const profilePictureId = tripQuery.data?.profilePictureId;

  useEffect(() => {
    if (!id || !profilePictureId) return;

    let active = true;
    let objectUrl: string | undefined;
    void getBlobFromApi(`/trip/${id}/profile_picture?v=${profilePictureId}`)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setCoverImage({ pictureId: profilePictureId, url: objectUrl });
      })
      .catch(() => {
        if (active) setCoverImage(undefined);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, profilePictureId]);

  const pictureMutation = useMutation({
    mutationFn: (image: FormData) =>
      patchToApi<TripPictureResponse>(`/trip/${id}/profile_picture`, image),
    onSuccess: (response) => {
      queryClient.setQueryData<TripSettingsData>(queryKey, (current) =>
        current
          ? { ...current, profilePictureId: response.trip.profilePictureId }
          : current,
      );
      void queryClient.invalidateQueries({
        queryKey: tripsQueryKey(user?.id),
      });
      displayAlert({ message: 'Trip picture updated.', tone: 'success' });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip picture could not be updated.',
        ),
        tone: 'error',
      });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      patchToApi<TripSettingsData>(`/trip/${id}/visibility`, { isPublic }),
    onSuccess: (trip) => {
      queryClient.setQueryData(queryKey, trip);
      displayAlert({
        message: `Trip is now ${trip.isPublic ? 'public' : 'private'}.`,
        tone: 'success',
      });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip visibility could not be updated.',
        ),
        tone: 'error',
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (tripId: string) => deleteFromApi(`/trip/${tripId}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
      displayAlert({ message: 'Trip deleted.', tone: 'success' });
      navigate('/my-trips', { replace: true });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(error, 'Trip could not be deleted.'),
        tone: 'error',
      });
    },
  });
  const shareMutation = useMutation({
    mutationFn: (recipientId: string) =>
      postToApi<TripShareResponse, { recipientId: string }>(
        `/trip/${id}/share`,
        { recipientId },
      ),
    onSuccess: (response) => {
      setShareModalOpen(false);
      setFriendSearch('');
      setSelectedFriendId(undefined);
      displayAlert({ message: response.message, tone: 'success' });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip invitation could not be sent.',
        ),
        tone: 'error',
      });
    },
  });

  if (!id) {
    return <Text color="error">Trip not found.</Text>;
  }
  if (tripQuery.isPending) {
    return <Text color="muted">Loading trip settings...</Text>;
  }
  if (tripQuery.isError || !tripQuery.data) {
    return <Text color="error">Trip settings could not be loaded.</Text>;
  }

  const trip = tripQuery.data;
  const canChangeVisibility = trip.currentUserRole === 'owner';
  const canShareTrip =
    trip.currentUserRole === 'owner' || trip.currentUserRole === 'editor';
  const normalizedFriendSearch = friendSearch.trim().toLocaleLowerCase();
  const tripMemberIds = new Set(
    (trip.users ?? []).map((memberId) => String(memberId)),
  );
  const filteredFriends = (friendsQuery.friends?.friends ?? []).filter(
    (friend) =>
      friend.username.toLocaleLowerCase().includes(normalizedFriendSearch),
  );
  const existingImageUrl =
    profilePictureId && coverImage?.pictureId === profilePictureId
      ? coverImage.url
      : undefined;

  return (
    <>
      <section aria-labelledby="trip-settings-heading" className="min-w-0">
        <header className="mb-6">
          <Text
            as="h2"
            data-cy="trip-settings-title"
            id="trip-settings-heading"
            variant="title"
          >
            Trip settings
          </Text>
        </header>
        {canChangeVisibility ? (
          <div className="mb-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              Trip picture
            </Text>
            <ImageUploadField
              className="mt-4"
              disabled={pictureMutation.isPending}
              existingImageUrl={existingImageUrl}
              label="Add a trip picture"
              name="trip-picture"
              onAccept={async (file) => {
                const image = new FormData();
                image.append('image', file);
                await pictureMutation.mutateAsync(image);
                setPictureFile(file);
              }}
              pickerHeight={240}
              preset={tripCoverImagePreset}
              previewAlt="Current trip picture"
              replaceLabel="Change trip picture"
              value={pictureFile}
            />
          </div>
        ) : null}
        {canShareTrip ? (
          <div className="mb-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              Share trip
            </Text>
            <Text color="muted" className="mt-1 mb-4">
              Invite a friend who already has a TripFolio profile.
            </Text>
            <Button
              data-cy="share-trip-open"
              onClick={() => setShareModalOpen(true)}
            >
              Share trip
            </Button>
          </div>
        ) : null}
        <label className="flex max-w-2xl items-center justify-between gap-5 rounded-panel border border-outline-variant bg-surface-container-low p-5">
          <span>
            <Text as="span" variant="label">
              Public trip
            </Text>
            <Text color="muted" className="mt-1">
              Only trip owners and members can access confidential information
              such as flights and hotels.
            </Text>
          </span>
          <input
            data-cy="trip-visibility"
            type="checkbox"
            role="switch"
            aria-label="Public trip"
            checked={trip.isPublic}
            disabled={!canChangeVisibility || visibilityMutation.isPending}
            onChange={(event) =>
              visibilityMutation.mutate(event.target.checked)
            }
            className="size-5 shrink-0 accent-primary"
          />
        </label>
        {!canChangeVisibility ? (
          <Text color="muted" className="mt-3">
            Only the trip owner can change visibility.
          </Text>
        ) : null}
        {canChangeVisibility ? (
          <div className="mt-8 max-w-2xl rounded-panel border border-error/30 bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              Delete trip
            </Text>
            <Text color="muted" className="mt-1 mb-4">
              Permanently remove this trip and its itinerary.
            </Text>
            <Button
              data-cy="delete-trip-open"
              variant="danger"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete trip
            </Button>
          </div>
        ) : null}
      </section>
      <Modal
        data-cy="share-trip-dialog"
        open={shareModalOpen}
        title="Share trip"
        description="Choose a friend with an existing TripFolio profile."
        onClose={() => {
          setShareModalOpen(false);
          setFriendSearch('');
          setSelectedFriendId(undefined);
        }}
        dismissDisabled={shareMutation.isPending}
        footer={(requestClose) => (
          <>
            <Button
              data-cy="share-trip-cancel"
              disabled={shareMutation.isPending}
              onClick={requestClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              data-cy="share-trip-submit"
              disabled={!selectedFriendId || shareMutation.isPending}
              onClick={() => {
                if (selectedFriendId) shareMutation.mutate(selectedFriendId);
              }}
            >
              {shareMutation.isPending ? 'Sending...' : 'Send invite'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <TextField
          data-cy="share-trip-friend-search"
          autoComplete="off"
          id="share-trip-friend-search"
          label="Search friends"
          onChange={(event) => {
            setFriendSearch(event.target.value);
            setSelectedFriendId(undefined);
          }}
          placeholder="Search by username"
          type="search"
          value={friendSearch}
        />
        <div className="mt-4">
          {friendsQuery.isPending ? (
            <LoadingIndicator label="Loading friends" size={36} />
          ) : friendsQuery.isError ? (
            <div className="flex flex-wrap items-center gap-3" role="alert">
              <Text color="error">
                {getApiErrorMessage(
                  friendsQuery.error,
                  'Could not load your friends.',
                )}
              </Text>
              <Button
                onClick={() => void friendsQuery.refetch()}
                size="sm"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : filteredFriends.length ? (
            <ul
              aria-label="Friends available to invite"
              className="max-h-72 divide-y divide-outline-variant overflow-y-auto"
              data-cy="share-trip-friends"
            >
              {filteredFriends.map((friend) => {
                const isTripMember = tripMemberIds.has(friend.id);
                return (
                  <li
                    className="flex items-center gap-3 py-3 first:pt-1"
                    key={friend.id}
                  >
                    <Button
                      aria-pressed={
                        !isTripMember && selectedFriendId === friend.id
                      }
                      className="flex min-w-0 flex-1 items-center justify-start gap-3 text-left"
                      data-cy={`share-trip-friend-${friend.id}`}
                      disabled={isTripMember || shareMutation.isPending}
                      onClick={() => setSelectedFriendId(friend.id)}
                      variant="ghost"
                    >
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary-container text-on-secondary-container">
                        {friend.profile_picture ? (
                          <img
                            alt=""
                            className="size-full object-cover"
                            src={friend.profile_picture}
                          />
                        ) : (
                          <UserRound aria-hidden size={20} />
                        )}
                      </span>
                      <Text className="truncate" variant="label">
                        {friend.username}
                      </Text>
                    </Button>
                    {isTripMember ? (
                      <Text
                        className="shrink-0 rounded-full bg-surface-container-high px-3 py-1"
                        color="muted"
                        data-cy={`share-trip-member-badge-${friend.id}`}
                        variant="caption"
                      >
                        Already a participant
                      </Text>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Text color="muted">
              {friendSearch.trim()
                ? 'No friends match your search.'
                : 'You do not have any friends to invite yet.'}
            </Text>
          )}
        </div>
      </Modal>
      <Modal
        data-cy="delete-trip-dialog"
        open={deleteModalOpen}
        title={`Delete ${trip.name}?`}
        onClose={() => setDeleteModalOpen(false)}
        dismissDisabled={deleteMutation.isPending}
        footer={(requestClose) => (
          <>
            <Button
              data-cy="delete-trip-cancel"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
              data-cy="delete-trip-confirm"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete trip'}
            </Button>
          </>
        )}
      >
        <Text>This permanently removes the trip and its itinerary.</Text>
      </Modal>
    </>
  );
};

export default TripSettings;
