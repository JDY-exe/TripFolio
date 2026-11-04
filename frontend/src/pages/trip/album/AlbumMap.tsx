import { useEffect, useMemo, useRef, useState } from 'react';
import { LngLatBounds } from 'maplibre-gl';
import { Images } from 'lucide-react';
import { Button, Text } from '../../../components/common';
import { useItinerary } from '../../../queries/itineraries';
import { useEvents } from '../../../queries/events';
import type { TripPhoto } from '../../../queries/photos';
import { useMapRuntime } from '../itinerary/map/useMapRuntime';
import MemoryStack from './atlas/MemoryStack';
import {
  getMemoryLabel,
  groupAtlasPhotos,
  hasPhotoLocation,
  type MemoryCollection,
  type AlbumFilter,
} from './atlas/atlasGrouping';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../itinerary/map/itineraryMap.css';
import './atlas/atlas.css';

interface AlbumMapProps {
  tripId: string;
  photos: TripPhoto[];
  loadingMore: boolean;
  hasError: boolean;
  disabled: boolean;
  filter?: AlbumFilter;
  onRetry: () => void;
  onFilter: (filter: AlbumFilter) => void;
}

/** Filters the shared album through GPS-anchored photo stacks, without a second gallery.
 * @param props - Album records, selected collection, query status and filter callbacks.
 * @returns A responsive memory atlas with accessible stacks and unplaced-photo filtering.
 */
const AlbumMap = ({
  tripId,
  photos,
  loadingMore,
  hasError,
  disabled,
  filter,
  onRetry,
  onFilter,
}: AlbumMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);
  const { map, failed } = useMapRuntime(container, true);
  const [viewport, setViewport] = useState<{
    zoom: number;
    bounds?: LngLatBounds;
  }>({ zoom: 1 });
  const { itinerary } = useItinerary(tripId);
  const { events } = useEvents(itinerary?._id);
  const titles = useMemo(
    () => new Map(events.map((event) => [event._id, event.title])),
    [events],
  );
  const collections = useMemo(
    () => groupAtlasPhotos(photos, viewport.zoom),
    [photos, viewport.zoom],
  );
  const located = useMemo(() => photos.filter(hasPhotoLocation), [photos]);
  const unplaced = useMemo(
    () => photos.filter((photo) => !hasPhotoLocation(photo)),
    [photos],
  );

  useEffect(() => {
    if (!map) return;
    /** Captures the settled viewport without rebuilding markers during camera motion. */
    const update = () =>
      setViewport({ zoom: map.getZoom(), bounds: map.getBounds() });
    map.on('moveend', update);
    update();
    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  useEffect(() => {
    if (!map || fitted.current || located.length === 0 || loadingMore) return;
    /** Fits once the atlas is visible, leaving room above bottom-anchored prints. */
    const fit = () => {
      const { clientWidth: width, clientHeight: height } = map.getContainer();
      if (fitted.current || width === 0 || height === 0) return;
      fitted.current = true;
      const bounds = new LngLatBounds();
      located.forEach((photo) =>
        bounds.extend([photo.location.longitude, photo.location.latitude]),
      );
      map.fitBounds(bounds, {
        padding: {
          top: Math.min(120, height * 0.5),
          right: Math.min(64, width * 0.15),
          bottom: Math.min(64, height * 0.2),
          left: Math.min(64, width * 0.15),
        },
        maxZoom: 14,
        duration: 0,
      });
      map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    };
    map.on('resize', fit);
    fit();
    return () => {
      map.off('resize', fit);
    };
  }, [map, located, loadingMore]);

  /** Sends a snapshot of this stack's photo IDs to the shared album filter. */
  const selectCollection = (collection: MemoryCollection) => {
    onFilter({
      photoIds: collection.photos.map((photo) => photo.id),
      label: getMemoryLabel(collection.photos, titles),
      unplaced: false,
    });
  };

  return (
    <aside
      aria-labelledby="album-map-heading"
      className="flex h-full min-h-0 min-w-0 flex-col"
      data-cy="album-map"
    >
      <Text
        as="h3"
        id="album-map-heading"
        variant="headline"
        className="mb-3 shrink-0"
      >
        Memory Atlas
      </Text>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-panel bg-surface-container-low">
        <div
          ref={container}
          className="h-full w-full"
          aria-label="Map of photo memories"
          data-cy="atlas-canvas"
        />
        {map &&
          !failed &&
          collections
            .filter(
              (collection) =>
                !viewport.bounds ||
                viewport.bounds.contains([
                  collection.longitude,
                  collection.latitude,
                ]),
            )
            .map((collection) => (
              <MemoryStack
                key={collection.id}
                map={map}
                collection={collection}
                label={getMemoryLabel(collection.photos, titles)}
                selected={Boolean(
                  filter &&
                  !filter.unplaced &&
                  collection.photos.some((photo) =>
                    filter.photoIds.includes(photo.id),
                  ),
                )}
                subdued={Boolean(
                  filter &&
                  !collection.photos.some((photo) =>
                    filter.photoIds.includes(photo.id),
                  ),
                )}
                disabled={disabled}
                onSelect={selectCollection}
              />
            ))}
        {failed && (
          <div className="absolute inset-0 overflow-y-auto bg-surface-container-low p-5">
            <Text variant="title">The map couldn’t load</Text>
            <Text color="muted" className="mt-2 mb-4">
              Your memories are still here. Select a collection to filter the
              album.
            </Text>
            <div className="flex flex-col items-start gap-2">
              {collections.map((collection) => (
                <Button
                  key={collection.id}
                  variant="outline"
                  disabled={disabled}
                  onClick={() => selectCollection(collection)}
                >
                  {getMemoryLabel(collection.photos, titles)}
                </Button>
              ))}
            </div>
          </div>
        )}
        {unplaced.length > 0 && (
          <div className="absolute inset-x-3 bottom-3 flex justify-start">
            <Button
              variant="secondary"
              leadingIcon={<Images size={17} />}
              disabled={disabled}
              aria-pressed={Boolean(filter?.unplaced)}
              aria-label={`Not placed yet, ${unplaced.length} ${unplaced.length === 1 ? 'photo' : 'photos'}`}
              data-cy="atlas-unplaced"
              onClick={() =>
                onFilter({
                  photoIds: [],
                  label: 'Not placed yet',
                  unplaced: true,
                })
              }
            >
              Not placed yet
            </Button>
          </div>
        )}
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {loadingMore && (
          <Text variant="caption" color="muted" role="status">
            Loading photos…
          </Text>
        )}
        <Text variant="caption" color="muted">
          <a
            className="underline underline-offset-2 hover:text-primary"
            href="https://www.openmaptiles.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenMapTiles
          </a>
          {' · '}
          <a
            className="underline underline-offset-2 hover:text-primary"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>
        </Text>
      </div>
      {hasError && (
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <Text variant="caption" color="error">
            Some memories couldn’t load.
          </Text>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Retry memories
          </Button>
        </div>
      )}
    </aside>
  );
};

export default AlbumMap;
