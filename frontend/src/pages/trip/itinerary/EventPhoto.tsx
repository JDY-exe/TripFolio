import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '../../../components/common';
import type { EventPhotoData } from '../../../queries/events';

interface EventPhotoProps {
  photo: EventPhotoData | null;
  placeUrl: string;
  loading: boolean;
  title: string;
  onError: () => void;
}

/** Displays the event image across the full left edge of its card.
 * @param props - Current photo, loading state, title, and image failure callback.
 * @returns A linked place image, loading surface, or expressive fallback icon.
 */
const EventPhoto = ({
  photo,
  placeUrl,
  loading,
  title,
  onError,
}: EventPhotoProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (photo) {
    return (
      <a
        href={placeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${title} on Google Maps`}
        className="relative block h-full min-h-40 w-full overflow-hidden bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
      >
        {!imageLoaded ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : null}
        <img
          src={photo.url}
          alt={`Photo of ${title}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={onError}
          className={`h-full w-full object-cover ${imageLoaded ? '' : 'opacity-0'}`}
        />
      </a>
    );
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label={`Loading photo for ${title}`}
        className="h-full min-h-40 w-full"
      >
        <Skeleton className="h-full min-h-40 w-full rounded-none" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="grid h-full min-h-40 w-full place-items-center bg-primary-container text-on-primary-container"
    >
      <div className="grid h-20 w-16 place-items-center rounded-t-full rounded-b-2xl bg-secondary-container text-on-secondary-container">
        <CalendarDays size={32} />
      </div>
    </div>
  );
};

export default EventPhoto;
