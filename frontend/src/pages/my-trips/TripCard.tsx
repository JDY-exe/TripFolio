import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  UsersRound,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Text } from '../../components/common';
import { useNavigate } from 'react-router';
import { getBlobFromApi } from '../../utils/api';

export interface TripCardProps {
  id: string;
  title: string;
  destination: string;
  dates: string;
  travelers: string;
  status: string;
  image?: string;
  imagePath?: string;
  onDelete: (id: string) => void;
}

/**
 * Displays a sample trip as a photo, destination, and compact planning summary.
 * All fields are display copy and the action is inactive in this UI mockup.
 *
 * @param props - Trip copy and optional protected cover-image API path.
 * @returns A themed, presentation-only trip card.
 */
const TripCard = ({
  id,
  title,
  destination,
  dates,
  travelers,
  status,
  image: publicImage,
  imagePath,
  onDelete,
}: TripCardProps) => {
  const navigate = useNavigate();
  const image = useProtectedImage(imagePath, publicImage);
  const handleDeleteClick = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${title}"? This cannot be undone.`,
      )
    ) {
      onDelete(id);
    }
  };

  return (
    <article className="overflow-hidden rounded-panel border border-outline-variant bg-surface-container-low">
      <div className="relative">
        <img
          src={image}
          alt=""
          width={1000}
          height={563}
          loading="lazy"
          className="aspect-video w-full bg-surface-container object-cover"
        />
        <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-on-surface">
          {status}
        </span>
      </div>

      <div className="relative p-5 sm:p-6">
        <button
          onClick={handleDeleteClick}
          className="absolute right-4 top-4 rounded-full bg-surface p-1.5 text-error hover:bg-error/10 motion-safe:transition-colors"
          aria-label={`Delete ${title}`}
        >
          <Trash2 size={16} />
        </button>

        <Text color="muted" className="flex items-center gap-1.5 text-sm pr-8">
          <MapPin aria-hidden size={15} className="shrink-0" />
          {destination}
        </Text>
        <Text as="h2" variant="title" className="mt-2 pr-8">
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

        <div className="mt-5 border-t border-outline-variant pt-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/trip/${id}`)}
            aria-label={`Open ${title}`}
            fullWidth
            className="justify-between px-0"
            trailingIcon={<ArrowUpRight aria-hidden size={18} />}
          >
            View Trip
          </Button>
        </div>
      </div>
    </article>
  );
};

const fallbackImage = 'https://placehold.co/600x400';

/**
 * Loads a protected image through Axios and exposes a temporary object URL.
 * Revoking the URL during cleanup releases the browser-held Blob allocation.
 *
 * @param imagePath - Authenticated API path for the image, when one exists.
 * @param publicImage - Public fallback supplied by static fixtures.
 * @returns An object URL for the image or the shared placeholder URL.
 */
const useProtectedImage = (
  imagePath?: string,
  publicImage = fallbackImage,
): string => {
  const [protectedImage, setProtectedImage] = useState<{
    path: string;
    url: string;
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
