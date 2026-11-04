import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import AlbumPhoto from '../AlbumPhoto';
import type { MemoryCollection } from './atlasGrouping';

interface MemoryStackProps {
  map: MapLibreMap;
  collection: MemoryCollection;
  label: string;
  selected: boolean;
  subdued: boolean;
  disabled: boolean;
  onSelect: (collection: MemoryCollection) => void;
}

/** Places a React-rendered photographic keepsake at its real GPS anchor.
 * @param props - Map, geographic collection, selection styling and activation callback.
 * @returns A portal retaining shared authenticated image loading inside a map marker.
 */
const MemoryStack = ({
  map,
  collection,
  label,
  selected,
  subdued,
  disabled,
  onSelect,
}: MemoryStackProps) => {
  const [element] = useState(() => document.createElement('div'));
  useEffect(() => {
    const marker = new Marker({ element, anchor: 'bottom' })
      .setLngLat([collection.longitude, collection.latitude])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, element, collection.longitude, collection.latitude]);

  return createPortal(
    <button
      type="button"
      className={`memory-stack ${selected ? 'memory-stack-selected' : ''} ${subdued ? 'memory-stack-subdued' : ''}`}
      aria-label={`${label}, ${collection.photos.length} ${collection.photos.length === 1 ? 'photo' : 'photos'}`}
      aria-pressed={selected}
      disabled={disabled}
      data-cy="atlas-stack"
      onKeyDown={(event) => {
        // Keep map-level keyboard handlers from consuming marker activation.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onSelect(collection);
        }
      }}
      onClick={() => onSelect(collection)}
    >
      {collection.photos.length > 1 && (
        <span
          className="memory-stack-paper memory-stack-paper-back"
          aria-hidden="true"
        />
      )}
      {collection.photos.length > 2 && (
        <span
          className="memory-stack-paper memory-stack-paper-middle"
          aria-hidden="true"
        />
      )}
      <span className="memory-stack-print">
        <span className="memory-stack-image">
          <AlbumPhoto photo={collection.photos[0]} />
        </span>
      </span>
    </button>,
    element,
  );
};

export default MemoryStack;
