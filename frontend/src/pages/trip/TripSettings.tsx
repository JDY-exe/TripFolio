import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button,
  ImageUploadField,
  Modal,
  Text,
  displayAlert,
  tripCoverImagePreset,
} from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { tripsQueryKey } from '../../queries/trips';
import {
  deleteFromApi,
  getBlobFromApi,
  getApiErrorMessage,
  getFromApi,
  patchToApi,
} from '../../utils/api';

type TripRole = 'owner' | 'editor' | 'viewer' | null;

interface TripSettingsData {
  _id: string;
  name: string;
  isPublic: boolean;
  currentUserRole: TripRole;
  profilePictureId?: string;
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
  const [pictureFile, setPictureFile] = useState<File>();
  const [coverImage, setCoverImage] = useState<{
    pictureId: string;
    url: string;
  }>();
  const queryClient = useQueryClient();
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
  const existingImageUrl =
    profilePictureId && coverImage?.pictureId === profilePictureId
      ? coverImage.url
      : undefined;

  return (
    <>
      <section aria-labelledby="trip-settings-heading" className="min-w-0">
        <header className="mb-6">
          <Text as="h2" id="trip-settings-heading" variant="title">
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
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
              Delete trip
            </Button>
          </div>
        ) : null}
      </section>
      <Modal
        open={deleteModalOpen}
        title={`Delete ${trip.name}?`}
        onClose={() => setDeleteModalOpen(false)}
        dismissDisabled={deleteMutation.isPending}
        footer={(requestClose) => (
          <>
            <Button
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
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
