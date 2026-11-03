import type { TripPhoto, PhotoLocation } from '../../../../queries/photos';

export interface LocatedPhoto extends TripPhoto {
  location: PhotoLocation;
}

export interface AlbumFilter {
  photoIds: string[];
  label: string;
  unplaced: boolean;
}

export interface MemoryCollection {
  id: string;
  photos: LocatedPhoto[];
  longitude: number;
  latitude: number;
}

/** Validates GPS ranges without treating missing coordinates as zero.
 * @param photo - Album metadata to inspect.
 * @returns Whether the photo has usable geographic coordinates.
 */
export const hasPhotoLocation = (photo: TripPhoto): photo is LocatedPhoto =>
  Number.isFinite(photo.location?.latitude) &&
  Number.isFinite(photo.location?.longitude) &&
  Math.abs(photo.location!.latitude) <= 90 &&
  Math.abs(photo.location!.longitude) <= 180;

/** Projects coordinates into zoom-dependent world pixels for stable grouping.
 * @param photo - Located photo.
 * @param zoom - Current map zoom.
 * @returns Mercator world coordinates and world width.
 */
const projectPhoto = (photo: LocatedPhoto, zoom: number) => {
  const width = 512 * 2 ** zoom;
  const latitude = Math.max(
    -85.051129,
    Math.min(85.051129, photo.location.latitude),
  );
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((photo.location.longitude + 180) / 360) * width,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * width,
    width,
  };
};

/** Groups photos within a marker-sized radius, anchoring each group to a real photo.
 * @param photos - Loaded album records; invalid GPS records are excluded.
 * @param zoom - Map zoom controlling geographic grouping density.
 * @returns Stable, ID-ordered collections with deterministic cover photos.
 */
export const groupAtlasPhotos = (
  photos: TripPhoto[],
  zoom: number,
): MemoryCollection[] => {
  const groups: {
    collection: MemoryCollection;
    point: ReturnType<typeof projectPhoto>;
  }[] = [];
  const located = photos
    .filter(hasPhotoLocation)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const photo of located) {
    const point = projectPhoto(photo, zoom);
    const nearby = groups.find(({ point: anchor }) => {
      const dx = Math.abs(point.x - anchor.x);
      return (
        Math.hypot(Math.min(dx, point.width - dx), point.y - anchor.y) < 120
      );
    });
    if (nearby) nearby.collection.photos.push(photo);
    else
      groups.push({
        point,
        collection: {
          id: photo.id,
          photos: [photo],
          longitude: photo.location.longitude,
          latitude: photo.location.latitude,
        },
      });
  }
  return groups.map(({ collection }) => collection);
};

/** Uses a shared event title only when every photo belongs to that event.
 * @param photos - Photos in a selected collection.
 * @param titles - Known itinerary event titles indexed by ID.
 * @returns A truthful collection label without inferred capture times or places.
 */
export const getMemoryLabel = (
  photos: TripPhoto[],
  titles: ReadonlyMap<string, string>,
) => {
  const eventId = photos[0]?.linkedEvent;
  if (eventId && photos.every((photo) => photo.linkedEvent === eventId)) {
    return titles.get(eventId) || 'Photos around here';
  }
  return 'Photos around here';
};
