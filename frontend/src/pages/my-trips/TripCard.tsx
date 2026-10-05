import { CalendarDays, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Text } from '../../components/common';
import { getBlobFromApi } from '../../utils/api';
import TripPlaceholderArt from './TripPlaceholderArt';

export interface TripCardProps {
  id: string;
  title: string;
  dates: string;
  travelers: string;
  status: string;
  image?: string;
  imagePath?: string;
}

/**
 * Displays a trip photo and compact planning summary that opens the trip.
 *
 * @param props - Trip copy and optional protected cover-image API path.
 * @returns A themed trip card with trip navigation.
 */
const TripCard = ({
  id,
  title,
  dates,
  travelers,
  status,
  image: publicImage,
  imagePath,
}: TripCardProps) => {
  const image = useProtectedImage(imagePath, publicImage);

  return (
    <article className="relative overflow-hidden rounded-panel border border-outline-variant bg-surface-container-low hover:-translate-y-0.5 transition-transform">
      <Link
        to={`/trip/${id}`}
        aria-label={`View ${title}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      />
      <div className="relative">
        {image ? (
          <img
            src={image}
            alt=""
            width={1000}
            height={563}
            loading="lazy"
            className="aspect-video w-full bg-surface-container object-cover"
          />
        ) : (
          <TripPlaceholderArt />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-on-surface">
          {status}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <Text as="h2" variant="title">
          {title}
        </Text>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-variant">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden size={16} className="shrink-0" />
            {dates}
          </p>
          <p className="flex items-center gap-2">
            <UsersRound aria-hidden size={16} className="shrink-0" />
            {travelers}
          </p>
        </div>
      </div>
    </article>
  );
};

/**
 * Loads a protected image through Axios and exposes a temporary object URL.
 * Revoking the URL during cleanup releases the browser-held Blob allocation.
 *
 * @param imagePath - Authenticated API path for the image, when one exists.
 * @param publicImage - Optional public image supplied by static fixtures.
 * @returns An image URL when available, or undefined for the SVG placeholder.
 */
const useProtectedImage = (
  imagePath?: string,
  publicImage?: string,
): string | undefined => {
  const [protectedImage, setProtectedImage] = useState<{
    path: string;
    url?: string;
  }>();

  useEffect(() => {
    if (!imagePath) return;

    let active = true;
    let objectUrl: string | undefined;

    /** Fetches the image with the active bearer token and creates a renderable URL. */
    const loadImage = async () => {
      try {
        const imageBlob = await getBlobFromApi(imagePath);
        if (!active) return;

        objectUrl = URL.createObjectURL(imageBlob);
        setProtectedImage({ path: imagePath, url: objectUrl });
      } catch {
        if (active) setProtectedImage({ path: imagePath, url: publicImage });
      }
    };

    void loadImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath, publicImage]);

  return imagePath && protectedImage?.path === imagePath
    ? protectedImage.url
    : publicImage;
};

export default TripCard;
