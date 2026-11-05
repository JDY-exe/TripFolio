import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { EditConflict } from '../../utils/checkedSave';
import { resolveEditConflict } from '../../components/common/EditConflictDialog/conflictStore';
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
import { useAuth } from '../../contexts/AuthContext';
import {
  archivedTripsQueryKey,
  tripsQueryKey,
  useSendTripInvitations,
  useTripDetails,
  useUpdateTripMemberRole,
  useTrips,
  type TripDetails,
  type TripMemberRole,
} from '../../queries/trips';
import {
  deleteFromApi,
  getBlobFromApi,
  getApiErrorMessage,
  patchToApi,
} from '../../utils/api';
import { createCheckedPatch, saveChecked } from '../../utils/checkedSave';
import TripMembersPanel from './settings/TripMembersPanel';
import { getTripMembers } from './settings/tripMembers';

type TripSettingsData = TripDetails;

interface TripPictureResponse {
  trip: Pick<TripSettingsData, '_id' | 'profilePictureId'>;
}

/**
 * Loads trip settings and the current user's role, then lets the owner change
 * the picture or visibility and confirm deletion through the API.
 *
 * @param props - Whether to hide trip editing while retaining personal and archive actions.
 * @returns The trip settings and their loading or failure state.
 */
const TripSettings = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteVersion, setDeleteVersion] = useState<number>();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>();
  const [inviteRole, setInviteRole] =
    useState<Exclude<TripMemberRole, 'owner'>>('editor');
  const [pictureFile, setPictureFile] = useState<File>();
  const [coverImage, setCoverImage] = useState<{
    pictureId: string;
    url: string;
  }>();
  const queryClient = useQueryClient();
  const queryKey = ['trip-settings', id] as const;
  const tripQuery = useTripDetails(id);
  const tripsQuery = useTrips(user?.id);
  const profilePictureId = tripQuery.data?.profilePictureId;
  const hideUserMutation = useMutation({
    mutationFn: () =>
      saveChecked<{ hidden: boolean; version: number }>(
        '/trip/hideUser',
        createCheckedPatch(tripQuery.data!, {
          hiddenUsers: tripQuery.data!.hiddenUsers?.includes(user!.id)
            ? tripQuery.data!.hiddenUsers.filter(
                (memberId) => memberId !== user!.id,
              )
            : [...(tripQuery.data!.hiddenUsers ?? []), user!.id],
        }),
        { tripId: id },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<TripSettingsData>(queryKey, (current) =>
        current
          ? {
              ...current,
              version: response.version,
              hiddenUsers: response.hidden
                ? [
                    ...(current.hiddenUsers ?? []).filter(
                      (userId) => userId !== user?.id,
                    ),
                    user!.id,
                  ]
                : (current.hiddenUsers ?? []).filter(
                    (userId) => userId !== user?.id,
                  ),
            }
          : current,
      );

      displayAlert({
        message: response.hidden
          ? 'You are now hidden from the public traveler list.'
          : 'You are now visible on the public traveler list.',
        tone: 'success',
      });
    },
    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Could not update your visibility preference.',
        ),
        tone: 'error',
      });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: () =>
      saveChecked<{ archived: boolean }>(
        `/trip/archive`,
        createCheckedPatch(tripQuery.data!, {
          archived: !tripQuery.data!.archived,
        }),
        { tripId: id },
      ),

    onSuccess: (updatedTrip) => {
      // Update the settings page immediately.
      queryClient.setQueryData<TripSettingsData>(queryKey, (current) =>
        current ? { ...current, archived: updatedTrip.archived } : current,
      );

      // Refresh both lists and permissions before showing the destination view.
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
      void queryClient.invalidateQueries({
        queryKey: archivedTripsQueryKey(user?.id),
      });
      navigate(updatedTrip.archived ? `/trip/archived/${id}` : `/trip/${id}`, {
        replace: true,
      });

      displayAlert({
        message: updatedTrip.archived ? 'Trip archived.' : 'Trip unarchived.',
        tone: 'success',
      });
    },

    onError: (error) => {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip archive status could not be updated.',
        ),
        tone: 'error',
      });
    },
  });

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
    mutationFn: async (image: FormData) => {
      let original = tripQuery.data!;
      for (;;) {
        image.set('expectedVersion', String(original.version));
        image.set('originalProfilePictureId', original.profilePictureId ?? '');
        try {
          return await patchToApi<TripPictureResponse>(
            `/trip/${id}/profile_picture`,
            image,
          );
        } catch (error) {
          if (
            !axios.isAxiosError<EditConflict>(error) ||
            error.response?.data.code !== 'EDIT_CONFLICT'
          )
            throw error;
          const conflict = error.response.data;
          const choices = await resolveEditConflict({
            ...conflict,
            conflicts: conflict.conflicts.map((field) => ({
              ...field,
              submitted: 'Your selected picture',
            })),
          });
          if (!choices)
            throw new Error('Picture change cancelled.', { cause: error });
          original = conflict.current as unknown as TripSettingsData;
          if (choices.profilePictureId === 'saved') return { trip: original };
        }
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<TripSettingsData>(queryKey, (current) =>
        current
          ? { ...current, profilePictureId: response.trip.profilePictureId }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey });
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
      saveChecked<TripSettingsData>(
        `/trip/${id}/visibility`,
        createCheckedPatch(tripQuery.data!, { isPublic }),
      ),
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
    mutationFn: (tripId: string) =>
      deleteFromApi(`/trip/${tripId}`, {
        data: { expectedVersion: deleteVersion },
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
      displayAlert({ message: 'Trip deleted.', tone: 'success' });
      navigate('/my-trips', { replace: true });
    },
    onError: (error) => {
      setDeleteModalOpen(false);
      void queryClient.invalidateQueries({ queryKey });
      displayAlert({
        message: getApiErrorMessage(error, 'Trip could not be deleted.'),
        tone: 'error',
      });
    },
  });
  const shareMutation = useSendTripInvitations();
  const memberRoleMutation = useUpdateTripMemberRole(user?.id);

  /** Persists a selected participant role and reports success or failure.
   * @param userId - Member whose role is changing.
   * @param role - New editor or viewer role.
   * @returns Nothing; query caches are synchronized by the mutation hook.
   */
  const updateMemberRole = async (
    userId: string,
    role: 'editor' | 'viewer',
  ) => {
    if (!id) return;
    try {
      await memberRoleMutation.mutateAsync({ tripId: id, userId, role });
      displayAlert({ message: 'Trip member role updated.', tone: 'success' });
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Trip member role could not be updated.',
        ),
        tone: 'error',
      });
    }
  };

  /** Sends the selected friend's invitation and preserves the selection on failure.
   * @returns A promise that resolves after feedback and modal state are updated.
   */
  const sendInvitation = async () => {
    if (!id || !selectedFriendId) return;
    try {
      const response = await shareMutation.mutateAsync({
        tripId: id,
        recipientIds: [selectedFriendId],
        role: inviteRole,
      });
      setShareModalOpen(false);
      setSelectedFriendId(undefined);
      setInviteRole('editor');
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
  const canChangeVisibility =
    !readOnly && !trip.archived && trip.currentUserRole === 'owner';
  const canShareTrip =
    !readOnly &&
    !trip.archived &&
    (trip.currentUserRole === 'owner' || trip.currentUserRole === 'editor');
  const canManageMembers =
    !readOnly &&
    !trip.archived &&
    (trip.currentUserRole === 'owner' || trip.currentUserRole === 'editor');
  const canChangeArchive =
    (trip.currentUserRole === 'owner' || trip.currentUserRole === 'editor') &&
    (!readOnly || trip.archived);
  const tripListEntry = tripsQuery.trips.find(
    (candidate) => candidate._id === id,
  );
  const tripMembers = getTripMembers(
    trip.users ?? [],
    tripListEntry?.travelers ?? [],
    trip.ownerId,
    trip.viewerIds,
    trip.memberRoles,
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
        {canChangeVisibility && (
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
              onClick={() => setShareModalOpen(true)}
            >
              Share trip
            </Button>
          </div>
        )}
        {tripMembers.length > 0 && (
          <TripMembersPanel
            members={tripMembers}
            canManageMembers={canManageMembers}
            updatingMemberId={
              memberRoleMutation.isPending
                ? memberRoleMutation.variables?.userId
                : undefined
            }
            onRoleChange={(userId, role) => void updateMemberRole(userId, role)}
          />
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
            onChange={(event) =>
              visibilityMutation.mutate(event.target.checked)
            }
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
              onClick={() => {
                setDeleteVersion(trip.version);
                setDeleteModalOpen(true);
              }}
            >
              Delete trip
            </Button>
          </div>
        )}
        <label className="mt-4 flex max-w-2xl items-center justify-between gap-5 rounded-panel border border-outline-variant bg-surface-container-low p-5">
          <span>
            <Text as="span" variant="label">
              Hide myself
            </Text>
            <Text color="muted" className="mt-1">
              Hide your profile from the public traveler list for this trip.
            </Text>
          </span>

          <input
            type="checkbox"
            role="switch"
            aria-label="Hide myself"
            checked={Boolean(trip.hiddenUsers?.includes(user?.id ?? ''))}
            disabled={hideUserMutation.isPending}
            onChange={() => hideUserMutation.mutate()}
            className="size-5 shrink-0 accent-primary"
          />
        </label>
        {canChangeArchive && (
          <div className="mt-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5">
            <Text as="h3" variant="title">
              {trip.archived ? 'Unarchive trip' : 'Archive trip'}
            </Text>

            <Text color="muted" className="mt-1 mb-4">
              {trip.archived
                ? 'Restore this trip from your archived trips.'
                : 'Move this trip to your archived trips. You can unarchive it later.'}
            </Text>

            <Button
              data-cy="toggle-trip-archive"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {archiveMutation.isPending
                ? 'Updating...'
                : trip.archived
                  ? 'Unarchive trip'
                  : 'Archive trip'}
            </Button>
          </div>
        )}
      </section>
      <Modal
        data-cy="share-trip-dialog"
        open={shareModalOpen}
        title="Share trip"
        description="Choose a friend with an existing TripFolio profile."
        onClose={() => {
          setShareModalOpen(false);
          setSelectedFriendId(undefined);
          setInviteRole('editor');
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
              onClick={() => void sendInvitation()}
            >
              {shareMutation.isPending ? 'Sending...' : 'Send invite'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <label className="mb-4 grid gap-2" htmlFor="share-trip-role">
          <Text as="span" variant="label">
            Invite as
          </Text>
          <select
            id="share-trip-role"
            data-cy="share-trip-role"
            aria-label="Invite as"
            className="min-h-12 w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200"
            disabled={shareMutation.isPending}
            value={inviteRole}
            onChange={(event) =>
              setInviteRole(
                event.target.value === 'viewer' ? 'viewer' : 'editor',
              )
            }
          >
            <option value="editor">Editor</option>
            <option value="viewer">View only</option>
          </select>
        </label>
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
