import { useState } from 'react';
import {
  Button,
  displayAlert,
  MediaUpload,
  Modal,
  Text,
} from '../../components/common';
import Friends from './Friends';
import ProfileInfo from './ProfileInfo';

const profile = {
  username: 'user',
  email: 'email',
} as const;

/**
 * Presents the current account identity and a local profile-picture editor. The
 * temporary flow stores only the chosen filename until a real profile API and
 * media upload service are connected.
 *
 * @returns The profile page.
 */
function Profile() {
  const [isPictureModalOpen, setIsPictureModalOpen] = useState(false);
  const [pendingPictureName, setPendingPictureName] = useState<string>();
  const [pictureName, setPictureName] = useState<string>();

  /**
   * Opens a clean picture-editing session so a canceled prior choice cannot be
   * accidentally saved later.
   *
   * @returns Nothing; modal and pending-selection state are updated.
   */
  const openPictureModal = () => {
    setPendingPictureName(undefined);
    setIsPictureModalOpen(true);
  };

  /**
   * Closes the picture editor and discards its uncommitted filename.
   *
   * @returns Nothing; modal and pending-selection state are reset.
   */
  const closePictureModal = () => {
    setIsPictureModalOpen(false);
    setPendingPictureName(undefined);
  };

  /**
   * Records the first image filename reported by the shared media selector.
   *
   * @param fileNames - Accepted filenames from picker or drag-and-drop input.
   * @returns Nothing; the pending picture choice is replaced.
   */
  const handlePictureSelected = (fileNames: readonly string[]) => {
    setPendingPictureName(fileNames[0]);
  };

  /**
   * Commits the pending filename to the local profile and confirms the change.
   *
   * @returns Nothing; saved state, modal state, and the global toast are updated.
   */
  const savePicture = () => {
    if (!pendingPictureName) return;

    setPictureName(pendingPictureName);
    setIsPictureModalOpen(false);
    setPendingPictureName(undefined);
    displayAlert({ message: 'Profile picture updated.', tone: 'success' });
  };

  return (
    <>
      <section className="mx-auto max-w-2xl text-on-surface">
        <ProfileInfo
          email={profile.email}
          onPictureClick={openPictureModal}
          pictureName={pictureName}
          username={profile.username}
        />
        <div className="my-10 h-px bg-outline-variant" />
        <Friends />
      </section>

      <Modal
        footer={
          <>
            <Button onClick={closePictureModal} variant="ghost">
              Cancel
            </Button>
            <Button disabled={!pendingPictureName} onClick={savePicture}>
              Save picture
            </Button>
          </>
        }
        onClose={closePictureModal}
        open={isPictureModalOpen}
        title="Set profile picture"
      >
        <MediaUpload
          height={280}
          label="Choose a profile picture"
          mediaType="image"
          name="profile-picture"
          onFilesSelected={handlePictureSelected}
        />
        <div aria-live="polite" className="mt-3 min-h-6 text-center">
          {pendingPictureName ? (
            <Text color="muted">Selected: {pendingPictureName}</Text>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

export default Profile;
