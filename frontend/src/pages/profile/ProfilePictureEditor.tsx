import { useState } from 'react';
import {
  displayAlert,
  imageFileToDataUrl,
  ImageUploadField,
  Modal,
  profileImagePreset,
  type ImageCropStatus,
} from '../../components/common';
import { getApiErrorMessage } from '../../utils/api';

interface ProfilePictureEditorProps {
  /** Account name used for image alternative text. */
  username: string;
  /** Persists the prepared picture and refreshes account state. */
  onSave: (picture: string) => Promise<void>;
  /** Dismisses the editor after cancellation or a successful save. */
  onClose: () => void;
}

/**
 * Hosts the shared profile-image cropper and persists its confirmed output.
 * The image field owns crop controls; canceling the edit closes this modal.
 *
 * @param props - Current identity, persistence action, and dismissal callback.
 * @returns The profile-picture editor modal.
 */
const ProfilePictureEditor = ({
  username,
  onSave,
  onClose,
}: ProfilePictureEditorProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [cropStatus, setCropStatus] = useState<ImageCropStatus>({
    active: false,
    processing: false,
  });

  /**
   * Encodes and persists the crop confirmed by the shared image field.
   *
   * @param picture - Cropped and compressed profile image.
   * @returns A promise resolving after persistence and feedback complete.
   */
  const savePicture = async (picture: File) => {
    setIsSaving(true);
    try {
      await onSave(await imageFileToDataUrl(picture));
      displayAlert({ message: 'Profile picture updated.', tone: 'success' });
      onClose();
    } catch (caught) {
      const message = getApiErrorMessage(
        caught,
        caught instanceof Error
          ? caught.message
          : 'Unable to save your picture. Please try again.',
      );
      throw new Error(message, { cause: caught });
    } finally {
      setIsSaving(false);
    }
  };

  /** Prevents dismissal while the save request is active. @returns Nothing. */
  const closeEditor = () => {
    if (!isSaving && !cropStatus.processing) onClose();
  };

  return (
    <Modal onClose={closeEditor} open title="Set profile picture">
      <ImageUploadField
        acceptLabel="Save picture"
        cancelLabel="Cancel"
        disabled={isSaving}
        label="Choose a profile picture"
        name="profile-picture"
        onAccept={savePicture}
        onCancelEdit={closeEditor}
        onCropStatusChange={setCropStatus}
        pickerHeight={384}
        preset={profileImagePreset}
        previewAlt={`${username}'s profile picture`}
        processingLabel="Saving…"
        showAcceptedPreview={false}
      />
    </Modal>
  );
};

export default ProfilePictureEditor;
