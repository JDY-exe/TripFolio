import { Camera, Mail, UserRound } from 'lucide-react';
import { Text } from '../../components/common';

export interface ProfileInfoProps {
  /** Username displayed for the current account. */
  username: string;
  /** Email address displayed for the current account. */
  email: string;
  /** Locally saved picture filename, when one has been selected. */
  pictureName?: string;
  /** Opens the profile-picture editor. */
  onPictureClick: () => void;
}

/**
 * Displays compact account identity details and a round interactive avatar. The
 * avatar delegates editing to its parent so modal state remains page-owned.
 *
 * @param props - Account fields, picture state, and avatar action callback.
 * @returns The profile information section.
 */
function ProfileInfo({
  username,
  email,
  pictureName,
  onPictureClick,
}: ProfileInfoProps) {
  return (
    <section aria-labelledby="profile-info-heading">
      <Text as="h1" id="profile-info-heading" variant="headline">
        Profile Info
      </Text>

      <div className="mt-5 flex items-center gap-5">
        <button
          className="group relative grid size-20 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-container text-on-primary-container outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105"
          onClick={onPictureClick}
          type="button"
        >
          <UserRound aria-hidden size={36} strokeWidth={1.5} />
          <span className="sr-only">
            {pictureName ? 'Change profile picture' : 'Add profile picture'}
          </span>
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface">
            <Camera aria-hidden size={15} />
          </span>
        </button>

        <div className="min-w-0">
          <Text as="h2" variant="title">
            {username}
          </Text>
          <Text className="mt-1 flex items-center gap-2" color="muted">
            <Mail aria-hidden className="shrink-0" size={16} />
            <span className="truncate">{email}</span>
          </Text>
          {pictureName ? (
            <Text className="mt-1 truncate" color="primary" variant="caption">
              {pictureName}
            </Text>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default ProfileInfo;
