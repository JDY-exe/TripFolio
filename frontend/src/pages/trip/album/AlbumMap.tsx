import { useEffect, useRef } from 'react';
import { LngLatBounds, Marker } from 'maplibre-gl';
import { Button, Text } from '../../../components/common';
import { useItinerary } from '../../../queries/itineraries';
import { useEvents } from '../../../queries/events';
import { useEventLocations } from '../../../queries/eventLocations';
import { useMapRuntime } from '../itinerary/map/useMapRuntime';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../itinerary/map/itineraryMap.css';

/** Shows saved itinerary places beside the album, without fabricating photo GPS.
 * @param props - Trip identifier used by the shared itinerary and event queries.
 * @returns A responsive interactive map, attribution, and truthful location states.
 */
const AlbumMap = ({ tripId }: { tripId: string }) => {
  const {
    itinerary,
    isError: itineraryError,
    refetch: retryItinerary,
  } = useItinerary(tripId);
  const {
    events,
    isError: eventsError,
    refetch: retryEvents,
  } = useEvents(itinerary?._id);
  const {
    locatedEvents,
    isLoading,
    isError: locationError,
    retry,
  } = useEventLocations(events);
  const container = useRef<HTMLDivElement>(null);
  const { map, failed } = useMapRuntime(container, true);
  const hasError = itineraryError || eventsError || locationError;

  useEffect(() => {
    if (!map || locatedEvents.length === 0) return;
    const bounds = new LngLatBounds();
    const markers = locatedEvents.map((event) => {
      bounds.extend([event.lng, event.lat]);
      const marker = new Marker().setLngLat([event.lng, event.lat]).addTo(map);
      marker.getElement().setAttribute('aria-label', event.title);
      marker.getElement().setAttribute('title', event.title);
      return marker;
    });
    map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
    return () => markers.forEach((marker) => marker.remove());
  }, [map, locatedEvents]);

  return (
    <aside
      aria-labelledby="album-map-heading"
      className="flex h-full min-h-0 min-w-0 flex-col"
      data-cy="album-map"
    >
      <Text as="h3" id="album-map-heading" variant="title" className="shrink-0">
        Trip places
      </Text>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-panel bg-surface-container-low">
        <div
          ref={container}
          className="h-full w-full"
          aria-label="Map of trip itinerary locations"
        />
        {failed && (
          <div className="absolute inset-0 grid place-items-center bg-surface-container-low p-6 text-center">
            <Text color="muted">
              Map unavailable. You can still browse your photos.
            </Text>
          </div>
        )}
        {!failed && locatedEvents.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl bg-surface p-4">
            <Text variant="label">
              {isLoading ? 'Finding trip places…' : 'No places to show yet'}
            </Text>
            <Text variant="caption" color="muted">
              Add locations to your itinerary to see them here.
            </Text>
          </div>
        )}
      </div>
      {hasError && (
        <div className="mt-2 shrink-0">
          <Text variant="caption" color="error">
            Some trip places couldn’t load.
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void retryItinerary();
              if (itinerary) void retryEvents();
              retry();
            }}
          >
            Retry places
          </Button>
        </div>
      )}
      <Text variant="caption" color="muted" className="mt-2 shrink-0">
        <a
          className="underline hover:text-primary"
          href="https://www.openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenMapTiles
        </a>
        {' · '}
        <a
          className="underline hover:text-primary"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>
      </Text>
    </aside>
  );
};

export default AlbumMap;
