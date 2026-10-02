import { CalendarDays, Ellipsis, UsersRound, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, DropdownMenu, Modal, Text } from '../../components/common';
import { getBlobFromApi } from '../../utils/api';

export interface TripCardProps {
  id: string;
  title: string;
  dates: string;
  travelers: string;
  status: string;
  image?: string;
  imagePath?: string;
  onDelete: (id: string) => void;
}

/**
 * Displays a trip photo and compact planning summary, with the photo opening
 * the trip and a separate action for deleting it.
 *
 * @param props - Trip copy and optional protected cover-image API path.
 * @returns A themed trip card with image navigation and a delete action.
 */
const TripCard = ({
  id,
  title,
  dates,
  travelers,
  status,
  image: publicImage,
  imagePath,
  onDelete,
}: TripCardProps) => {
  const image = useProtectedImage(imagePath, publicImage);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);

  /**
   * Opens the confirmation dialog for the requested trip deletion.
   * @returns Nothing.
   */
  const handleDeleteRequest = () => setIsDeleteConfirmationOpen(true);

  /** Closes the dialog and deletes the trip after explicit confirmation. */
  const handleDeleteConfirm = () => {
    setIsDeleteConfirmationOpen(false);
    onDelete(id);
  };

  return (
    <>
      <article className="relative overflow-hidden rounded-panel border border-outline-variant bg-surface-container-low">
        <Link
          to={`/trip/${id}`}
          aria-label={`View ${title}`}
          className="absolute inset-0 z-10 cursor-pointer rounded-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        />
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

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Text as="h2" variant="title" className="min-w-0 flex-1">
              {title}
            </Text>
            <DropdownMenu
              className="z-20"
              label={`Trip actions for ${title}`}
              icon={<Ellipsis aria-hidden size={20} />}
              items={[
                {
                  label: 'Delete trip',
                  icon: <Trash2 aria-hidden size={18} />,
                  tone: 'danger',
                  onSelect: handleDeleteRequest,
                },
              ]}
            />
          </div>

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

      <Modal
        open={isDeleteConfirmationOpen}
        title="Delete trip?"
        description={`Are you sure you want to delete “${title}”? This action cannot be undone.`}
        onClose={() => setIsDeleteConfirmationOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete trip
            </Button>
          </>
        }
      >
        <Text color="muted">
          The trip and its saved details will be removed.
        </Text>
      </Modal>
    </>
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
