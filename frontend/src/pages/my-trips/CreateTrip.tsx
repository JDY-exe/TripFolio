import { useState } from 'react';
import { useSendTripInvitations } from '../../queries/trips';
import {
  Button,
  ImageUploadField,
  Modal,
  ShareWithFriends,
  Switch,
  InfoPopover,
  Text,
  TextField,
  displayAlert,
  tripCoverImagePreset,
  type ImageCropStatus,
} from '../../components/common';
import { useLoading } from '../../contexts/LoadingContext';
import { patchToApi, postToApi } from '../../utils/api';

interface TripResponse {
  savedTrip: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

interface CreateTripProps {
  /** Closes the creation dialog. */
  onClose: () => void;
  /** Refreshes the trip collection after creation succeeds. */
  onCreated: () => void;
}

/**
 * Presents trip creation in a modal and saves its optional cover after the trip.
 *
 * @param props - Callbacks for dismissing the dialog and refreshing trips.
 * @returns The trip creation modal and its form.
 */
const CreateTrip = ({ onClose, onCreated }: CreateTripProps) => {
  const { setLoading } = useLoading();
  const sendInvitations = useSendTripInvitations();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState<File>();
  const [cropStatus, setCropStatus] = useState<ImageCropStatus>({
    active: false,
    processing: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  /**
   * Validates trip details, creates the itinerary, and uploads the optional cover.
   *
   * @param e - Submission event from the creation form.
   * @returns A promise that settles when saving and feedback finish.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving || cropStatus.active) return;
    setError('');

    if (!name || !startDate || !endDate) {
      setError('Please fill out all required fields.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Ending date must come after starting date.');
      return;
    }

    setIsSaving(true);
    setLoading(true);
    try {
      const newTrip = await postToApi<TripResponse>('/trip', {
        name,
        startDate,
        endDate,
        isPublic,
      });
      await postToApi('/itinerary', {
        tripId: newTrip.savedTrip._id,
        title: 'Blank Itinerary',
        description: '',
        startDate,
        endDate,
      });

      if (coverFile) {
        const imageData = new FormData();
        imageData.append('image', coverFile);

        try {
          await patchToApi(
            `/trip/${newTrip.savedTrip._id}/profile_picture`,
            imageData,
          );
        } catch {
          displayAlert({
            title: 'Trip created without a cover',
            message: 'The trip was saved, but its cover could not be uploaded.',
            tone: 'error',
          });
        }
      }

      if (selectedFriendIds.length > 0) {
        try {
          await sendInvitations.mutateAsync({
            tripId: newTrip.savedTrip._id,
            recipientIds: selectedFriendIds,
          });
        } catch {
          displayAlert({
            title: 'Trip created with unsent invitations',
            message:
              'The invitation batch could not be confirmed. You can retry from trip settings.',
            tone: 'warning',
          });
        }
      }

      setIsOpen(false);
    } catch {
      setError('Failed to create trip. Please try again.');
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      title="Create a New Trip"
      onClose={onClose}
      onExited={onCreated}
      dismissDisabled={isSaving || cropStatus.processing}
      className="[align-items:safe_center]"
      panelClassName="max-w-5xl"
      footer={(requestClose) => (
        <>
          <Button onClick={requestClose} variant="secondary">
            Cancel
          </Button>
          <Button
            data-cy="create-trip"
            type="submit"
            form="create-trip-form"
            disabled={isSaving || cropStatus.active}
          >
            Create Trip
          </Button>
        </>
      )}
    >
      {error && (
        <Text
          data-cy="create-trip-error"
          color="error"
          role="alert"
          className="mb-4"
        >
          {error}
        </Text>
      )}

      <form
        id="create-trip-form"
        onSubmit={handleSubmit}
        className="grid gap-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]"
      >
        <div className="grid content-start gap-7">
          <TextField
            data-cy="trip-name"
            id="trip-name"
            label="Trip Name *"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <div>
            <Text as="h3" variant="title">
              Trip cover
            </Text>
            <Text color="muted" className="mt-1">
              Optional. Crop and zoom your cover image.
            </Text>
            <ImageUploadField
              className="mt-4"
              disabled={isSaving}
              label="Add a cover image"
              name="trip-cover"
              onAccept={setCoverFile}
              onCropStatusChange={setCropStatus}
              pickerHeight={384}
              preset={tripCoverImagePreset}
              previewAlt="Selected trip cover preview"
              replaceLabel="Replace cover image"
              value={coverFile}
            />
          </div>
        </div>

        <div className="grid content-start gap-7 md:border-l md:border-outline-variant md:pl-8">
          <section
            aria-labelledby="create-trip-dates-heading"
            className="grid gap-4"
          >
            <Text as="h3" id="create-trip-dates-heading" variant="title">
              Travel dates
            </Text>
            <TextField
              data-cy="trip-start-date"
              id="trip-start-date"
              label="Start date *"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
            <TextField
              data-cy="trip-end-date"
              id="trip-end-date"
              label="End date *"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </section>

          <section
            aria-labelledby="create-trip-share-heading"
            className="border-t border-outline-variant pt-6"
          >
            <Text as="h3" id="create-trip-share-heading" variant="title">
              Sharing
            </Text>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1">
                <Text
                  as="label"
                  htmlFor="trip-public"
                  variant="label"
                  className="cursor-pointer"
                >
                  Make this trip public
                </Text>
                <InfoPopover label="About public trips">
                  Any signed-in user can view a public trip.
                </InfoPopover>
              </div>
              <Switch
                id="trip-public"
                data-cy="trip-public"
                label="Make this trip public"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                disabled={isSaving}
              />
            </div>

            <div>
              <ShareWithFriends
                label="Invite friends"
                description="Optional. Invitations are sent after you create the trip."
                multiple
                selectedFriendIds={selectedFriendIds}
                onSelectionChange={setSelectedFriendIds}
                disabled={isSaving}
              />
            </div>
          </section>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTrip;
