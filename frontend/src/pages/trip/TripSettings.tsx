import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { EditConflict } from '../../utils/checkedSave';
import { resolveEditConflict } from '../../components/common/EditConflictDialog/conflictStore';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button,
  ImageUploadField,
  Modal,
  ShareWithFriends,
  Text,
  TextField,
  Switch,
  Skeleton,
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
import { useReactToPrint } from 'react-to-print';
import {
  PrintableItinerary,
  type ExportedTripData,
} from './itinerary/PrintableItinerary';
import { toPng } from 'html-to-image';
import { TripStatsCard, type TripStatsData } from './itinerary/TripStatsCard';
import {
  deleteFromApi,
  getBlobFromApi,
  getApiErrorMessage,
  patchToApi,
  getFromApi,
} from '../../utils/api';
import { createCheckedPatch, saveChecked } from '../../utils/checkedSave';
import TripMembersPanel from './settings/TripMembersPanel';
import { getTripMembers } from './settings/tripMembers';
import { useItinerary } from '../../queries/itineraries';
import ItineraryDescription from './itinerary/ItineraryDescription';
import SettingsSection from './settings/SettingsSection';
import SettingsRow from './settings/SettingsRow';
import { Download, UserPlus } from 'lucide-react';

type TripSettingsData = TripDetails;

interface TripPictureResponse {
  trip: Pick<TripSettingsData, '_id' | 'profilePictureId'>;
}

/**
 * Groups trip details, membership, privacy, exports, and lifecycle actions
 * while retaining role-based permissions and synchronized server state.
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
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
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
  const itineraryQuery = useItinerary(id);
  const tripsQuery = useTrips(user?.id);
  const profilePictureId = tripQuery.data?.profilePictureId;
  // --- PDF Export Logic ---
  const printComponentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<ExportedTripData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `${tripQuery.data?.name || 'Trip'}_Itinerary`,
    onAfterPrint: () => setIsPrinting(false),
  });

  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsPrinting(true);
    try {
      const data = await getFromApi<ExportedTripData>(
        `/itinerary/${id}/export`,
      );
      setPrintData(data);
      // Brief timeout allows React to render the hidden component with the new data before capturing
      setTimeout(() => {
        handlePrint();
      }, 100);
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(error, 'Could not export itinerary.'),
        tone: 'error',
      });
      setIsPrinting(false);
    }
  };

  // Trip Stats PNG Export Logic
  const statsCardRef = useRef<HTMLDivElement>(null);
  const [statsData, setStatsData] = useState<TripStatsData | null>(null);
  const [isExportingStats, setIsExportingStats] = useState(false);

  const handleExportStats = async () => {
    if (!id || isExportingStats) return;
    setIsExportingStats(true);
    try {
      const data = await getFromApi<TripStatsData>(`/trip/${id}/stats`);
      setStatsData(data);

      setTimeout(async () => {
        try {
          if (!statsCardRef.current) {
            throw new Error('Stats card element not ready.');
          }
          const dataUrl = await toPng(statsCardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
          });

          const safeName = (data.tripName || 'trip')
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();
          const link = document.createElement('a');
          link.download = `${safeName}_stats.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          link.remove();

          displayAlert({
            message: 'Trip stats image downloaded!',
            tone: 'success',
          });
        } catch (err) {
          displayAlert({
            message: getApiErrorMessage(err, 'Could not generate stats image.'),
            tone: 'error',
          });
        } finally {
          setIsExportingStats(false);
        }
      }, 150);
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(error, 'Could not fetch trip statistics.'),
        tone: 'error',
      });
      setIsExportingStats(false);
    }
  };

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

      void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
      void queryClient.invalidateQueries({
        queryKey: ['public-itinerary', id],
      });

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
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
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

  /** Sends the selected friends' invitations and preserves the selection on failure.
   * @returns A promise that resolves after feedback and modal state are updated.
   */
  const sendInvitation = async () => {
    if (!id || selectedFriendIds.length === 0 || shareMutation.isPending)
      return;
    try {
      const response = await shareMutation.mutateAsync({
        tripId: id,
        recipientIds: selectedFriendIds,
        role: inviteRole,
      });
      setShareModalOpen(false);
      setSelectedFriendIds([]);
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
      <section
        aria-labelledby="trip-settings-heading"
        className="min-w-0 max-w-5xl pb-8"
      >
        <header className="mb-8">
          <Text
            as="h2"
            data-cy="trip-settings-title"
            id="trip-settings-heading"
            variant="headline"
          >
            Trip settings
          </Text>
          <Text color="muted" className="mt-2">
            Manage the details, people, and privacy of {trip.name}.
          </Text>
        </header>
        <SettingsSection
          id="trip-details-heading"
          title="Trip details"
          description="Give your trip a picture and a little context."
        >
          {canChangeVisibility && (
            <div className="border-b border-outline-variant py-6">
              <Text as="h4" variant="label">
                Trip picture
              </Text>
              <Text color="muted" className="mt-1 mb-4">
                The cover shown on your trip card.
              </Text>
              <ImageUploadField
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
                pickerButtonOnly
                preset={tripCoverImagePreset}
                previewAlt="Current trip picture"
                replaceLabel="Change trip picture"
                value={pictureFile}
              />
            </div>
          )}
          <div className="py-6">
            {itineraryQuery.isPending && (
              <div role="status" aria-label="Loading description">
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {itineraryQuery.isError && (
              <div role="alert">
                <Text color="error">Could not load the description.</Text>
                <Button
                  variant="ghost"
                  onClick={() => void itineraryQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!itineraryQuery.isPending &&
              !itineraryQuery.isError &&
              itineraryQuery.itinerary && (
                <ItineraryDescription
                  itinerary={itineraryQuery.itinerary}
                  tripId={id}
                  readOnly={readOnly || trip.archived}
                  embedded
                />
              )}
          </div>
        </SettingsSection>
        <SettingsSection
          id="trip-people-heading"
          title="People & privacy"
          description="Choose who can take part and what others can see."
        >
          <div className="border-b border-outline-variant py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text as="h4" variant="label">
                Trip members
                {tripMembers.length > 0 ? ` · ${tripMembers.length}` : ''}
              </Text>
              {canShareTrip && (
                <Button
                  data-cy="share-trip-open"
                  size="sm"
                  leadingIcon={<UserPlus size={16} />}
                  onClick={() => setShareModalOpen(true)}
                >
                  Invite friends
                </Button>
              )}
            </div>
            {tripMembers.length > 0 && (
              <TripMembersPanel
                embedded
                members={tripMembers}
                canManageMembers={canManageMembers}
                updatingMemberId={
                  memberRoleMutation.isPending
                    ? memberRoleMutation.variables?.userId
                    : undefined
                }
                onRoleChange={(userId, role) =>
                  void updateMemberRole(userId, role)
                }
              />
            )}
            {tripMembers.length === 0 && (
              <Text color="muted" className="mt-3">
                Members will appear here when their profiles are available.
              </Text>
            )}
          </div>
          <div className="border-b border-outline-variant py-5">
            <div className="flex items-center justify-between gap-6">
              <div>
                <Text as="label" htmlFor="trip-public-access" variant="label">
                  Public trip
                </Text>
                <Text color="muted" className="mt-1">
                  {trip.isPublic
                    ? 'Any signed-in user can discover and view your itinerary.'
                    : 'Only invited members can view this trip.'}
                </Text>
              </div>
              <Switch
                id="trip-public-access"
                label="Public trip"
                data-cy="trip-visibility"
                checked={trip.isPublic}
                disabled={!canChangeVisibility || visibilityMutation.isPending}
                onChange={(event) =>
                  visibilityMutation.mutate(event.target.checked)
                }
              />
            </div>
            <Text color="muted" variant="caption" className="mt-3">
              Only trip owners and members can access confidential information
              such as flights and hotels.
            </Text>
            {!canChangeVisibility && (
              <Text color="muted" variant="caption" className="mt-2">
                {trip.archived
                  ? 'Unarchive this trip to change visibility.'
                  : 'Only the trip owner can change visibility.'}
              </Text>
            )}
          </div>
          <div className="flex items-center justify-between gap-6 py-5">
            <div>
              <Text
                as="label"
                htmlFor="trip-profile-visibility"
                variant="label"
              >
                Show me on the public traveler list
              </Text>
              <Text color="muted" className="mt-1">
                Your profile can appear with this trip when it is public.
                Members can still see you if you turn this off.
              </Text>
            </div>
            <Switch
              id="trip-profile-visibility"
              label="Show me on the public traveler list"
              data-cy="trip-profile-visibility"
              checked={!trip.hiddenUsers?.includes(user?.id ?? '')}
              disabled={hideUserMutation.isPending}
              onChange={() => hideUserMutation.mutate()}
            />
          </div>
        </SettingsSection>
        <SettingsSection
          id="trip-exports-heading"
          title="Export & trip management"
          description="Take your plans with you or manage the trip when you’re done."
        >
          <SettingsRow
            title="Itinerary PDF"
            description="A printer-friendly copy of your complete itinerary for offline access."
          >
            <Button
              variant="outline"
              data-cy="download-pdf-btn"
              leadingIcon={<Download size={16} />}
              onClick={() => void handleDownloadPdf()}
              disabled={isPrinting}
            >
              {isPrinting ? 'Preparing…' : 'Download PDF'}
            </Button>
          </SettingsRow>
          <SettingsRow
            title="Trip statistics"
            description="A shareable image of your trip’s highlights, expenses, and distance."
          >
            <Button
              variant="outline"
              data-cy="export-trip-stats-btn"
              leadingIcon={<Download size={16} />}
              onClick={() => void handleExportStats()}
              disabled={isExportingStats}
            >
              {isExportingStats ? 'Preparing…' : 'Download image'}
            </Button>
          </SettingsRow>
          {canChangeArchive && (
            <SettingsRow
              title={trip.archived ? 'Unarchive trip' : 'Archive trip'}
              description={
                trip.archived
                  ? 'Return this trip to your active trips and resume editing.'
                  : 'Move this trip to your archive. You can restore it any time.'
              }
            >
              <Button
                variant="outline"
                data-cy="toggle-trip-archive"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
              >
                {archiveMutation.isPending
                  ? 'Updating…'
                  : trip.archived
                    ? 'Unarchive trip'
                    : 'Archive trip'}
              </Button>
            </SettingsRow>
          )}
          {canChangeVisibility && (
            <SettingsRow
              title="Delete trip"
              description="Permanently remove this trip and its itinerary. This cannot be undone."
              danger
            >
              <Button
                data-cy="delete-trip-open"
                variant="dangerGhost"
                onClick={() => {
                  setDeleteVersion(trip.version);
                  setDeleteModalOpen(true);
                }}
              >
                Delete trip
              </Button>
            </SettingsRow>
          )}
        </SettingsSection>
        <div className="hidden">
          <PrintableItinerary ref={printComponentRef} tripData={printData} />
        </div>
        <div
          className="pointer-events-none fixed -left-[10000px] top-0 overflow-hidden"
          aria-hidden="true"
        >
          <TripStatsCard ref={statsCardRef} stats={statsData} />
        </div>
      </section>
      <Modal
        data-cy="share-trip-dialog"
        open={shareModalOpen}
        title="Invite friends"
        description="Choose friends with existing TripFolio profiles."
        onClose={() => {
          setShareModalOpen(false);
          setSelectedFriendIds([]);
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
              disabled={
                selectedFriendIds.length === 0 || shareMutation.isPending
              }
              onClick={() => void sendInvitation()}
            >
              {shareMutation.isPending
                ? 'Sending...'
                : selectedFriendIds.length > 0
                  ? `Invite ${selectedFriendIds.length} as ${inviteRole === 'editor' ? (selectedFriendIds.length === 1 ? 'an editor' : 'editors') : selectedFriendIds.length === 1 ? 'a viewer' : 'viewers'}`
                  : 'Send invite'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <ShareWithFriends
          key={String(shareModalOpen)}
          presentation="grid"
          searchAction={
            <div className="w-32">
              <TextField
                as="select"
                id="share-trip-role"
                label="Access for selected friends"
                hideLabel
                data-cy="share-trip-role"
                disabled={shareMutation.isPending}
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value === 'viewer' ? 'viewer' : 'editor',
                  )
                }
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </TextField>
            </div>
          }
          multiple
          selectedFriendIds={selectedFriendIds}
          onSelectionChange={setSelectedFriendIds}
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
