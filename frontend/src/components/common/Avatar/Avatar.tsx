import { UserRound } from 'lucide-react';
import { useState } from 'react';

export interface AvatarProps {
  imageUrl?: string | null;
  size?: 'sm' | 'lg';
  tone?: 'default' | 'secondary';
}

/** Displays a decorative profile photo with a consistent missing or failed-image fallback.
 * @param props - Optional image URL, size, and semantic background treatment.
 * @returns A circular avatar; the surrounding user label supplies its accessible name.
 */
export const Avatar = ({
  imageUrl,
  size = 'sm',
  tone = 'default',
}: AvatarProps) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasPhoto = Boolean(imageUrl && imageUrl !== failedUrl);

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${size === 'lg' ? 'size-16' : 'size-6'} ${tone === 'secondary' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'}`}
    >
      {hasPhoto && (
        <img
          data-cy="avatar-image"
          src={imageUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl!)}
        />
      )}
      {!hasPhoto && (
        <UserRound
          data-cy="avatar-fallback"
          aria-hidden
          size={size === 'lg' ? 28 : 14}
        />
      )}
    </span>
  );
};
