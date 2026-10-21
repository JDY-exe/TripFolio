import TripRefreshStatus from './editing/TripRefreshStatus';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button,
  ImageUploadField,
  Modal,
  ShareWithFriends,
  Text,
  displayAlert,
  tripCoverImagePreset,
} from '../../components/common';
import { TripWriteCancelled, useTripEditing } from '../../queries/tripEditing';
import {
  useTrip,
  useSendTripInvitations,
  useSaveTripPicture,
  useSaveTripVisibility,
  useDeleteTrip,
} from '../../queries/trips';
import type { Trip } from '../../queries/trips';
import { getBlobFromApi, getApiErrorMessage } from '../../utils/api';

/**
 * Loads trip settings and the current user's role, then lets the owner change
 * the picture or visibility and confirm deletion through the API.
 *
 * @returns The trip settings and their loading or failure state.
 */
const TripSettings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = useTripEditing();
  const [baseline, setBaseline] = useState<Trip>();
  const [pictureModalOpen, setPictureModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>();
  const [pictureFile, setPictureFile] = useState<File>();
  const [coverImage, setCoverImage] = useState<{
    pictureId: string;
    url: string;
  }>();
  const tripQuery = useTrip(id);
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

  const pictureMutation = useSaveTripPicture();
  const visibilityMutation = useSaveTripVisibility();
  const deleteMutation = useDeleteTrip();

  /** Reports write failures while treating conflict choices as deliberate cancellation. */
  const reportError = (error: unknown, fallback: string) => {
    if (error instanceof TripWriteCancelled) return;
    displayAlert({
      message: getApiErrorMessage(
        error,
        error instanceof Error ? error.message : fallback,
      ),
      tone: 'error',
    });
  };

  /** Applies visibility intent after refreshing, retaining the originally displayed version. */
  const changeVisibility = async (isPublic: boolean) => {
    if (!tripQuery.data) return;
    try {
      const updated = await visibilityMutation.mutateAsync({
        baseline: tripQuery.data,
        isPublic,
      });
      displayAlert({
        message: `Trip is now ${updated.isPublic ? 'public' : 'private'}.`,
        tone: 'success',
      });
    } catch (error) {
      reportError(error, 'Trip visibility could not be updated.');
    }
  };

  /** Deletes the reviewed trip after another refresh and version check. */
  const confirmDelete = async () => {
    if (!baseline) return;
    try {
      await deleteMutation.mutateAsync(baseline);
      displayAlert({ message: 'Trip deleted.', tone: 'success' });
      navigate('/my-trips', { replace: true });
    } catch (error) {
      if (error instanceof TripWriteCancelled && error.discarded)
        setDeleteModalOpen(false);
      reportError(error, 'Trip could not be deleted.');
    }
  };

  /** Saves a cropped cover, retaining the draft when resolution returns to editing. */
  const savePicture = async (file: File) => {
    if (!baseline) return;
    setPictureFile(file);
    try {
      await pictureMutation.mutateAsync({ baseline, file });
      setPictureModalOpen(false);
      setPictureFile(undefined);
      displayAlert({ message: 'Trip picture updated.', tone: 'success' });
    } catch (error) {
      if (error instanceof TripWriteCancelled && error.discarded) {
        setPictureModalOpen(false);
        setPictureFile(undefined);
      }
      reportError(error, 'Trip picture could not be updated.');
    }
  };
  const shareMutation = useSendTripInvitations();

  /** Sends the selected friend's invitation and preserves the selection on failure.
   * @returns A promise that resolves after feedback and modal state are updated.
   */
  const sendInvitation = async () => {
    if (!id || !selectedFriendId) return;
    try {
      await editing?.refresh({ kind: 'trip', id });
      const response = await shareMutation.mutateAsync({
        tripId: id,
        recipientIds: [selectedFriendId],
      });
      setShareModalOpen(false);
      setSelectedFriendId(undefined);
      displayAlert({ message: response.message, tone: 'success' });
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip invitation could not be sent.',
        ),
        tone: 'error',
      });
    }
  };

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
        {canChangeVisibility && (
          <div className="mb-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              Trip picture
            </Text>
            {existingImageUrl && (
              <img
                src={existingImageUrl}
                alt="Current trip picture"
                className="my-4 aspect-video w-full rounded-panel object-cover"
              />
            )}
            <Button
              data-cy="trip-picture-open"
              className="mt-4"
              onClick={() =>
                void editing?.prepare(
                  () => {
                    setBaseline(trip);
                    setPictureFile(undefined);
                    setPictureModalOpen(true);
                  },
                  { kind: 'trip', id: trip._id },
                )
              }
            >
              {profilePictureId ? 'Change trip picture' : 'Add a trip picture'}
            </Button>
          </div>
        )}
        {canShareTrip && (
          <div className="mb-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              Share trip
            </Text>
            <Text color="muted" className="mt-1 mb-4">
              Invite a friend who already has a TripFolio profile.
            </Text>
            <Button
              data-cy="share-trip-open"
              onClick={() =>
                void editing?.prepare(() => setShareModalOpen(true), {
                  kind: 'trip',
                  id: trip._id,
                })
              }
            >
              Share trip
            </Button>
          </div>
        )}
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
            onChange={(event) => void changeVisibility(event.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
        </label>
        {!canChangeVisibility && (
          <Text color="muted" className="mt-3">
            Only the trip owner can change visibility.
          </Text>
        )}
        {canChangeVisibility && (
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
              onClick={() =>
                void editing?.prepare(
                  () => {
                    setBaseline(trip);
                    setDeleteModalOpen(true);
                  },
                  { kind: 'trip', id: trip._id },
                )
              }
            >
              Delete trip
            </Button>
          </div>
        )}
      </section>
      <Modal
        open={pictureModalOpen}
        title="Change trip picture"
        onClose={() => setPictureModalOpen(false)}
        dismissDisabled={pictureMutation.isPending}
        status={<TripRefreshStatus kind="trip" baseline={baseline} />}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={pictureMutation.isPending}
              onClick={() => setPictureModalOpen(false)}
            >
              Cancel
            </Button>
            {pictureFile && (
              <Button
                data-cy="trip-picture-save"
                disabled={pictureMutation.isPending}
                onClick={() => void savePicture(pictureFile)}
              >
                Save picture
              </Button>
            )}
          </>
        }
      >
        <ImageUploadField
          label="Add a trip picture"
          name="trip-picture"
          disabled={pictureMutation.isPending}
          existingImageUrl={existingImageUrl}
          onAccept={savePicture}
          pickerHeight={240}
          preset={tripCoverImagePreset}
          previewAlt="Selected trip cover"
          value={pictureFile}
        />
      </Modal>
      <Modal
        data-cy="share-trip-dialog"
        open={shareModalOpen}
        title="Share trip"
        description="Choose a friend with an existing TripFolio profile."
        onClose={() => {
          setShareModalOpen(false);
          setSelectedFriendId(undefined);
        }}
        dismissDisabled={shareMutation.isPending}
        status={<TripRefreshStatus kind="trip" baseline={trip} />}
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
              onClick={() => void sendInvitation()}
            >
              {shareMutation.isPending ? 'Sending...' : 'Send invite'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <ShareWithFriends
          key={String(shareModalOpen)}
          selectedFriendIds={selectedFriendId ? [selectedFriendId] : []}
          onSelectionChange={(ids) => setSelectedFriendId(ids[0])}
          memberIds={trip.users}
          disabled={shareMutation.isPending}
        />
      </Modal>
      <Modal
        data-cy="delete-trip-dialog"
        open={deleteModalOpen}
        title={`Delete ${trip.name}?`}
        onClose={() => setDeleteModalOpen(false)}
        dismissDisabled={deleteMutation.isPending}
        status={<TripRefreshStatus kind="trip" baseline={baseline} />}
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
              onClick={() => void confirmDelete()}
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
