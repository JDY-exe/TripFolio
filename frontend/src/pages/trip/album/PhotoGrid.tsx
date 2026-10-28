import { Check, Circle } from 'lucide-react';
import { Text } from '../../../components/common';
import type { TripPhoto } from '../../../queries/photos';
import AlbumPhoto from './AlbumPhoto';

interface PhotoGridProps {
  photos: TripPhoto[];
  onOpen: (id: string) => void;
  editing?: boolean;
  selectedIds?: readonly string[];
  disabled?: boolean;
  onToggle?: (id: string) => void;
}

/** Groups server-ordered photos by local upload day without implying EXIF dates.
 * @param props - Loaded photos and the photo-opening callback.
 * @returns Compact, date-grouped photo buttons with visible keyboard focus.
 */
const PhotoGrid = ({
  photos,
  onOpen,
  editing = false,
  selectedIds = [],
  disabled = false,
  onToggle,
}: PhotoGridProps) => {
  const groups = new Map<string, TripPhoto[]>();
  photos.forEach((photo) => {
    const date = new Date(photo.createdAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const group = groups.get(date) ?? [];
    group.push(photo);
    groups.set(date, group);
  });

  return (
    <div className="space-y-8" data-cy="album-photo-grid">
      {Array.from(groups, ([date, items]) => (
        <section key={date} aria-label={`Added ${date}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <Text as="h3" variant="title">
              {date}
            </Text>
            <Text variant="caption" color="muted">
              {items.length} {items.length === 1 ? 'photo' : 'photos'}
            </Text>
          </div>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((photo) => (
              <button
                key={photo.id}
                type="button"
                aria-label={`${editing ? 'Select' : 'Open'} ${photo.originalName}`}
                aria-pressed={
                  editing ? selectedIds.includes(photo.id) : undefined
                }
                disabled={disabled}
                onClick={() => {
                  if (editing) onToggle?.(photo.id);
                  else onOpen(photo.id);
                }}
                data-cy="album-photo"
                className={`relative aspect-square overflow-hidden bg-surface-container-low transition-opacity hover:opacity-85 focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait motion-reduce:transition-none ${editing && selectedIds.includes(photo.id) ? 'ring-3 ring-inset ring-primary' : ''}`}
              >
                <AlbumPhoto photo={photo} />
                {editing && (
                  <>
                    {selectedIds.includes(photo.id) && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 border-4 border-primary"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-full ${selectedIds.includes(photo.id) ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface'}`}
                    >
                      {selectedIds.includes(photo.id) && <Check size={18} />}
                      {!selectedIds.includes(photo.id) && <Circle size={18} />}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default PhotoGrid;
