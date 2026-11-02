import { useEffect, useMemo, useRef } from 'react';
import { LngLatBounds, Marker, Popup } from 'maplibre-gl';
import { Button, Text } from '../../../components/common';
import { useItinerary } from '../../../queries/itineraries';
import { useEvents } from '../../../queries/events';
import { useEventLocations } from '../../../queries/eventLocations';
import { usePhotos } from '../../../queries/photos';
import { getBlobFromApi } from '../../../utils/api';
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
  const photosQuery = usePhotos(tripId);

  // Load all pages of photos, not just the first 60.
  useEffect(() => {
    if (
      photosQuery.hasNextPage &&
      !photosQuery.isFetchingNextPage &&
      !photosQuery.isError
    ) {
      void photosQuery.fetchNextPage();
    }
  }, [
    photosQuery.hasNextPage,
    photosQuery.isFetchingNextPage,
    photosQuery.isError,
    photosQuery.fetchNextPage,
  ]);

  // Combine all photo pages and keep only photos with valid GPS coordinates.
  const locatedPhotos = useMemo(
    () =>
      photosQuery.data?.pages
        .flatMap((page) => page.photos)
        .filter(
          (photo) =>
            Number.isFinite(photo.location?.latitude) &&
            Number.isFinite(photo.location?.longitude) &&
            photo.location!.latitude >= -90 &&
            photo.location!.latitude <= 90 &&
            photo.location!.longitude >= -180 &&
            photo.location!.longitude <= 180,
        ) ?? [],
    [photosQuery.data],
  );
  const container = useRef<HTMLDivElement>(null);
  const { map, failed } = useMapRuntime(container, true);
  const hasError = itineraryError || eventsError || locationError || photosQuery.isError;

  useEffect(() => {
    if (!map) return;

    const bounds = new LngLatBounds();
    const markers: Marker[] = [];
    let hasLocations = false;

    // Existing event markers.
    const eventMarkers = locatedEvents.map((event) => {
      bounds.extend([event.lng, event.lat]);
      hasLocations = true;

      const marker = new Marker()
        .setLngLat([event.lng, event.lat])
        .addTo(map);

      marker.getElement().setAttribute('aria-label', event.title);
      marker.getElement().setAttribute('title', event.title);

      markers.push(marker);
      return marker;
    });

    // New photo markers.
    locatedPhotos.forEach((photo) => {
      const latitude = photo.location!.latitude;
      const longitude = photo.location!.longitude;

      bounds.extend([longitude, latitude]);
      hasLocations = true;

      const element = document.createElement('button');
      element.type = 'button';
      element.textContent = '📷';
      element.title = `View ${photo.originalName}`;
      element.setAttribute('aria-label', `View photo: ${photo.originalName}`);

      Object.assign(element.style, {
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        border: '2px solid white',
        backgroundColor: '#2563eb',
        color: 'white',
        fontSize: '18px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      });

      const marker = new Marker({
        element,
        anchor: 'bottom',
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      markers.push(marker);

      element.addEventListener('click', (event) => {
        event.stopPropagation();

        const content = document.createElement('div');
        content.style.width = '240px';

        const title = document.createElement('p');
        title.textContent = photo.originalName;
        title.style.fontWeight = '600';
        title.style.margin = '0 0 8px';

        const image = document.createElement('img');
        image.alt = photo.originalName;
        image.style.width = '100%';
        image.style.maxHeight = '200px';
        image.style.objectFit = 'contain';
        image.style.display = 'none';

        const status = document.createElement('p');
        status.textContent = 'Loading photo…';

        content.append(title, image, status);

        let objectUrl: string | null = null;
        let closed = false;

        const popup = new Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 20,
          maxWidth: '280px',
        })
          .setLngLat([longitude, latitude])
          .setDOMContent(content)
          .addTo(map);

        popup.on('close', () => {
          closed = true;

          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
        });

        // Fetch the image using your authenticated API utility.
        void getBlobFromApi(photo.contentUrl)
          .then((blob) => {
            const url = URL.createObjectURL(blob);

            if (closed) {
              URL.revokeObjectURL(url);
              return;
            }

            objectUrl = url;
            image.src = url;
            image.style.display = 'block';
            status.remove();
          })
          .catch(() => {
            if (!closed) {
              status.textContent = 'Photo unavailable';
            }
          });
      });
    });

    // Fit around both events and photos.
    if (hasLocations) {
      map.fitBounds(bounds, {
        padding: 56,
        maxZoom: 13,
        duration: 0,
      });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [map, locatedEvents, locatedPhotos]);

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
        {!failed && locatedEvents.length === 0 && locatedPhotos.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl bg-surface p-4">
            <Text variant="label">
              {isLoading ? 'Finding trip places…' : 'No places to show yet'}
            </Text>
            <Text variant="caption" color="muted">
              Add locations to your itinerary to see them here or upload photos containing GPS data.
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
              void photosQuery.refetch();
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
