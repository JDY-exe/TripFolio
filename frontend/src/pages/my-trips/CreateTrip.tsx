import { useState } from 'react';
import {
  Button,
  ImageUploadField,
  Modal,
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
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);
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
            type="submit"
            form="create-trip-form"
            disabled={isSaving || cropStatus.active}
          >
            Create Trip
          </Button>
        </>
      )}
    >
      {error ? (
        <Text color="error" role="alert" className="mb-4">
          {error}
        </Text>
      ) : null}

      <form
        id="create-trip-form"
        onSubmit={handleSubmit}
        className="grid gap-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]"
      >
        <div className="grid content-start gap-7">
          <TextField
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

        <div className="grid content-start gap-6 md:border-l md:border-outline md:pl-8">
          <div>
            <Text as="h3" variant="title">
              Travel dates
            </Text>
          </div>
          <TextField
            id="trip-start-date"
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
          <TextField
            id="trip-end-date"
            label="End Date *"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
          <label className="flex items-start gap-3 rounded-panel border border-outline-variant p-4">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              disabled={isSaving}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span>
              <Text as="span" variant="label">
                Make this trip public
              </Text>
              <Text color="muted" className="mt-1">
                Any signed-in user can view a public trip.
              </Text>
            </span>
          </label>
          <Text as="h3" variant="title">
            Add friends (coming soon!)
          </Text>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTrip;
