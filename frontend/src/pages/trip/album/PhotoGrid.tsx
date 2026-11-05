import { Check, Circle } from 'lucide-react';
import { Text } from '../../../components/common';
import type { TripPhoto } from '../../../queries/photos';
import AlbumPhoto from './AlbumPhoto';
import { groupPhotosByTakenDate } from './photoDates';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

interface PhotoGridProps {
  photos: TripPhoto[];
  onOpen: (id: string) => void;
  editing?: boolean;
  selectedIds?: readonly string[];
  disabled?: boolean;
  onToggle?: (id: string) => void;
}

/** Groups photos by camera-local capture day, keeping undated memories separate.
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
  const { id: tripId } = useParams();

  // Fetch the itinerary first using the tripId
  const { data: itineraries } = useQuery({
    queryKey: ['itinerary', tripId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/itinerary?tripId=${tripId}`); 
      if (!res.ok) throw new Error('Failed to fetch itinerary');
      return res.json();
    },
    enabled: !!tripId,
  });

  const itineraryId = itineraries?.[0]?._id || itineraries?._id;

  // Fetch the events using the safely retrieved itineraryId
  const { data: events = [] } = useQuery({
    queryKey: ['events', itineraryId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events?itinerary_id=${itineraryId}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: !!itineraryId,
  });
  
  const groups = groupPhotosByTakenDate(photos);

  return (
    <div className="space-y-8" data-cy="album-photo-grid">
      {groups.map(({ day, label, photos: items }) => (
        <section
          key={day ?? 'unknown'}
          aria-label={day ? `Taken ${label}` : label}
          data-cy="album-date-group"
          data-date={day ?? 'unknown'}
        >
          <Text as="h3" variant="title" className="mb-3">
            {label}
          </Text>
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
                <AlbumPhoto photo={photo} events={events} />
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
