import { Camera, LogOut, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button, Text } from '../../components/common';

export interface ProfileInfoProps {
  /** Username displayed for the current account. */
  username: string;
  /** Email address displayed for the current account. */
  email: string;
  /** Saved profile-picture URL returned with the authenticated account. */
  pictureUrl?: string;
  /** Opens the full profile-picture view. */
  onPictureClick: () => void;
  /** Clears the authenticated account session. */
  onLogout: () => void;
}

/**
 * Displays compact account identity details and a round interactive avatar. The
 * avatar delegates viewing to its parent and falls back when the image fails.
 *
 * @param props - Account fields, picture state, and avatar action callback.
 * @returns The profile information section.
 */
const ProfileInfo = ({
  username,
  email,
  pictureUrl,
  onPictureClick,
  onLogout,
}: ProfileInfoProps) => {
  const [failedPictureUrl, setFailedPictureUrl] = useState<string>();
  const showPicture = Boolean(pictureUrl && pictureUrl !== failedPictureUrl);

  /**
   * Records a failed URL in state so the avatar displays the default user icon.
   * @returns Nothing.
   */
  const handlePictureError = () => setFailedPictureUrl(pictureUrl);
  return (
    <section aria-labelledby="profile-info-heading">
      <Text as="h1" id="profile-info-heading" variant="headline">
        Profile Info
      </Text>

      <div className="mt-5 flex items-center gap-3 sm:gap-5">
        <button
          className="group relative grid size-20 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-container text-on-primary-container outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105"
          onClick={onPictureClick}
          type="button"
        >
          {showPicture ? (
            <img
              alt={`${username}'s profile picture`}
              className="size-full rounded-full object-cover"
              onError={handlePictureError}
              src={pictureUrl}
            />
          ) : (
            <UserRound aria-hidden size={36} strokeWidth={1.5} />
          )}
          <span className="sr-only">Set profile picture</span>
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface">
            <Camera aria-hidden size={15} />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <Text as="h2" variant="title">
            {username}
          </Text>
          <Text className="mt-1 flex items-center gap-2" color="muted">
            <Mail aria-hidden className="shrink-0" size={16} />
            <span className="truncate">{email}</span>
          </Text>
        </div>
        <Button
          className="shrink-0"
          leadingIcon={<LogOut aria-hidden size={18} />}
          onClick={onLogout}
          variant="outline"
        >
          Log out
        </Button>
      </div>
    </section>
  );
};

export default ProfileInfo;
