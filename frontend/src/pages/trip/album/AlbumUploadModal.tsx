import { useState } from 'react';
import {
  Button,
  displayAlert,
  MediaUpload,
  Modal,
  Text,
} from '../../../components/common';
import { useUploadPhoto } from '../../../queries/photos';
import { getApiErrorMessage } from '../../../utils/api';
import { MAX_ALBUM_PHOTO_BYTES, PHOTO_ACCEPT, validatePhotoUpload } from '../../../utils/photoUpload';
import { useQuery } from '@tanstack/react-query';

interface AlbumUploadModalProps {
  tripId: string;
  open: boolean;
  onClose: () => void;
}

/** Keeps original-photo selection, batch upload, and progress in a focused dialog.
 * @param props - Destination trip, dialog visibility, and dismissal callback.
 * @returns The shared upload surface inside a modal that cannot close mid-upload.
 */
const AlbumUploadModal = ({ tripId, open, onClose }: AlbumUploadModalProps) => {
  const { mutateAsync } = useUploadPhoto(tripId);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  // Fetch the itinerary first using the tripId
  const { data: itineraries } = useQuery({
    queryKey: ['itinerary', tripId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/itinerary?tripId=${tripId}`); 
      if (!res.ok) throw new Error('Failed to fetch itinerary');
      return res.json();
    },
    enabled: !!tripId,
  });

  // Extract the ID
  const itineraryId = itineraries?.[0]?._id || itineraries?._id;

  // Fetch the events using retrieved itineraryId
  const { data: events = [] } = useQuery({
    queryKey: ['events', itineraryId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events?itinerary_id=${itineraryId}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: !!itineraryId,
  });

  /** Sends originals sequentially so one rejection does not lose the batch.
   * @param files - Original files selected or dropped into the shared uploader.
   * @returns A promise resolving when every file has succeeded or reported an error.
   */
  const uploadPhotos = async (files: readonly File[]) => {
    if (uploading || !tripId) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Uploading photo ${index + 1} of ${files.length}`);
        const validation = validatePhotoUpload(file, MAX_ALBUM_PHOTO_BYTES);
        if (validation) {
          displayAlert({
            message: `${file.name}: ${validation}`,
            tone: 'error',
          });
          continue;
        }
        try {
          await mutateAsync({ file, eventId: selectedEventId || undefined });
          uploaded += 1;
        } catch (error) {
          displayAlert({
            message: `${file.name}: ${getApiErrorMessage(error, 'Upload failed. Please try again.')}`,
            tone: 'error',
          });
        }
      }
      setStatus(`${uploaded} of ${files.length} photos uploaded.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add photos"
      description="Choose photos from your device or drop them below."
      onClose={onClose}
      dismissDisabled={uploading}
      footer={
        <Button variant="outline" onClick={onClose} disabled={uploading}>
          Done
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Link to Itinerary Event (Optional)</label>
        <select
          className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          disabled={uploading}
        >
          <option value="">-- No Event --</option>
          {events.map((event: any) => (
            <option key={event._id} value={event._id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>
      
      <MediaUpload
        mediaType="image"
        accept={PHOTO_ACCEPT}
        multiple
        name="photos"
        height="min(40dvh, 320px)"
        loading={uploading}
        loadingLabel={status}
        disabled={!tripId || uploading}
        onFilesPicked={(files) => {
          void uploadPhotos(files);
        }}
        data-cy="album-photo-upload"
      />
      <Text variant="caption" role="status" className="mt-3 empty:hidden">
        {status}
      </Text>
    </Modal>
  );
};

export default AlbumUploadModal;
