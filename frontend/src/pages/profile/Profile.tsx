import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Friends from './Friends';
import ProfileInfo from './ProfileInfo';
import ProfilePictureEditor from './ProfilePictureEditor';
import { Text } from '../../components/common';

/**
 * Shows the authenticated identity with inline logout and a picture editor.
 * Account state supplies the saved avatar and persists editor changes.
 *
 * @returns The current user's profile page.
 */
const Profile = () => {
  const { user, logout, updateProfilePicture } = useAuth();
  const [isPictureModalOpen, setIsPictureModalOpen] = useState(false);

  /** Opens a fresh editor by setting its visibility. @returns Nothing. */
  const openPictureModal = () => setIsPictureModalOpen(true);

  /** Discards the editor by resetting its visibility. @returns Nothing. */
  const closePictureModal = () => setIsPictureModalOpen(false);

  if (!user) return null;

  return (
    <>
      <Text as="h1" data-cy="profile-title" variant="display">
        My Profile
      </Text>
      <section className="mx-auto max-w-2xl text-on-surface">
        <ProfileInfo
          email={user.email}
          onLogout={logout}
          onPictureClick={openPictureModal}
          pictureUrl={user.profile_picture}
          username={user.username}
        />
        <div className="my-10 h-px bg-outline-variant" />
        <Friends />
      </section>

      {isPictureModalOpen ? (
        <ProfilePictureEditor
          onClose={closePictureModal}
          onSave={updateProfilePicture}
          username={user.username}
        />
      ) : null}
    </>
  );
};

export default Profile;
