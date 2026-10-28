import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Modal } from '../../../components/common';
import type { TripPhoto } from '../../../queries/photos';
import AlbumPhoto from './AlbumPhoto';

interface PhotoViewerProps {
  photos: TripPhoto[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Presents a focused photo with bounded arrow-key and button navigation.
 * @param props - Loaded album, selected photo, navigation, and dismissal callbacks.
 * @returns A shared focus-trapped modal displaying the uncropped image.
 */
const PhotoViewer = ({
  photos,
  selectedId,
  onSelect,
  onClose,
}: PhotoViewerProps) => {
  const index = photos.findIndex((photo) => photo.id === selectedId);
  const photo = photos[index];
  if (!photo) return null;

  /** Moves within loaded photos without wrapping or changing the album order. */
  const move = (offset: number) => {
    const next = photos[index + offset];
    if (next) onSelect(next.id);
  };

  return (
    <Modal
      open
      title={photo.originalName}
      hideHeader
      showCloseButton
      onClose={onClose}
      panelClassName="flex h-[92dvh] max-h-[calc(100dvh-2rem)] max-w-6xl flex-col sm:max-h-[calc(100dvh-4rem)]"
      contentClassName="min-h-0 flex-1"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        }
      }}
    >
      <div
        className="grid h-full min-h-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1 sm:gap-3"
        data-cy="album-photo-viewer"
      >
        <div className="col-start-2 row-start-1 h-full min-h-0">
          <AlbumPhoto key={photo.id} photo={photo} expanded />
        </div>
        <div className="col-start-1 row-start-1">
          <IconButton
            label="Previous photo"
            icon={<ChevronLeft />}
            variant="ghost"
            disabled={index === 0}
            onClick={() => move(-1)}
          />
        </div>
        <div className="col-start-3 row-start-1">
          <IconButton
            label="Next photo"
            icon={<ChevronRight />}
            variant="ghost"
            disabled={index === photos.length - 1}
            onClick={() => move(1)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default PhotoViewer;
