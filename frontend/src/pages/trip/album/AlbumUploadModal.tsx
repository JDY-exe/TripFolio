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
import { PHOTO_ACCEPT, validatePhotoUpload } from '../../../utils/photoUpload';

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
        const validation = validatePhotoUpload(file);
        if (validation) {
          displayAlert({
            message: `${file.name}: ${validation}`,
            tone: 'error',
          });
          continue;
        }
        try {
          await mutateAsync(file);
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
