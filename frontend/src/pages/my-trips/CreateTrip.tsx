import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  MediaUpload,
  Text,
  displayAlert,
} from '../../components/common';
import { useLoading } from '../../contexts/LoadingContext';
import { patchToApi, postToApi } from '../../utils/api';
import {
  compressTripCoverImage,
  validateTripCoverImage,
} from './tripCoverImage';

/** Creates a trip and optionally uploads a compressed cover image. */
function CreateTrip() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState<File>();
  const [coverPreview, setCoverPreview] = useState<string>();
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  /** Validates and locally compresses the selected trip cover. */
  const handleCoverPicked = async (files: readonly File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    const validationMessage = validateTripCoverImage(selectedFile);
    if (validationMessage) {
      setCoverFile(undefined);
      setCoverPreview(undefined);
      displayAlert({
        title: 'Unable to use this image',
        message: validationMessage,
        tone: 'error',
      });
      return;
    }

    setIsCompressing(true);
    try {
      const compressedFile = await compressTripCoverImage(selectedFile);
      setCoverFile(compressedFile);
      setCoverPreview(URL.createObjectURL(compressedFile));
    } catch {
      setCoverFile(undefined);
      setCoverPreview(undefined);
      displayAlert({
        title: 'Image compression failed',
        message: 'Choose another JPEG or PNG image and try again.',
        tone: 'error',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  /** Validates trip details, saves the trip, then uploads its optional cover. */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name || !startDate || !endDate) {
      setError('Please fill out all required fields.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('Ending date must come after starting date.');
      return;
    }

    setLoading(true);
    try {
      const response = await postToApi<{ savedTrip: { _id: string } }>(
        '/trip',
        {
          name,
          startDate,
          endDate,
        },
      );

      if (coverFile) {
        const imageData = new FormData();
        imageData.append('image', coverFile);

        try {
          await patchToApi(
            `/trip/${response.savedTrip._id}/profile_picture`,
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

      navigate('/my-trips');
    } catch {
      setError('Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-lg text-on-surface">
      <Text as="h1" variant="headline" className="mb-6">
        Create a New Trip
      </Text>

      {error ? <p className="mb-4 text-error">{error}</p> : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="trip-name" className="mb-1 block">
            Trip Name *
          </label>
          <input
            id="trip-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded bg-surface-container p-2 text-on-surface"
            required
          />
        </div>
        <div>
          <label htmlFor="trip-start-date" className="mb-1 block">
            Start Date *
          </label>
          <input
            id="trip-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded bg-surface-container p-2 text-on-surface"
            required
          />
        </div>
        <div>
          <label htmlFor="trip-end-date" className="mb-1 block">
            End Date *
          </label>
          <input
            id="trip-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded bg-surface-container p-2 text-on-surface"
            required
          />
        </div>

        <div className="mt-2">
          <Text as="h2" variant="title">
            Trip cover
          </Text>
          <Text color="muted" className="mt-1 text-sm">
            Optional. JPEG or PNG, up to 16 MB.
          </Text>

          {coverPreview ? (
            <img
              src={coverPreview}
              alt="Selected trip cover preview"
              className="mt-4 aspect-video w-full rounded-panel object-cover"
            />
          ) : null}

          <MediaUpload
            className="mt-4"
            height={isCompressing ? 176 : 136}
            label={coverFile ? 'Replace cover image' : 'Add a cover image'}
            loading={isCompressing}
            loadingLabel="Compressing trip cover"
            mediaType="image"
            name="trip-cover"
            onFilesPicked={handleCoverPicked}
          />
        </div>

        <Button type="submit" className="mt-2" disabled={isCompressing}>
          Create Trip
        </Button>
      </form>
    </section>
  );
}

export default CreateTrip;
