import { describe, expect, it } from 'vitest';
import {
  getMemoryLabel,
  groupAtlasPhotos,
  hasPhotoLocation,
} from '../../../../../src/pages/trip/album/atlas/atlasGrouping';
import type { TripPhoto } from '../../../../../src/queries/photos';

/** Builds a photo record with optional GPS for grouping edge cases. */
const photo = (
  id: string,
  latitude?: number,
  longitude?: number,
): TripPhoto => ({
  id,
  trip: 'trip',
  uploadedBy: 'owner',
  originalName: `${id}.webp`,
  contentType: 'image/webp',
  byteLength: 1,
  width: 100,
  height: 100,
  createdAt: '2026-05-12T10:00:00Z',
  contentUrl: `/photos/${id}`,
  location: latitude === undefined ? null : { latitude, longitude: longitude! },
  linkedEvent: null,
});

describe('memory atlas grouping', () => {
  it('accepts zero coordinates and excludes missing, non-finite and out-of-range GPS', () => {
    expect(hasPhotoLocation(photo('zero', 0, 0))).toBe(true);
    expect(hasPhotoLocation(photo('missing'))).toBe(false);
    expect(hasPhotoLocation(photo('nan', NaN, 10))).toBe(false);
    expect(hasPhotoLocation(photo('lat', 91, 0))).toBe(false);
    expect(hasPhotoLocation(photo('lng', 0, -181))).toBe(false);
  });
  it('groups at overview and separates nearby places when zoomed in', () => {
    const photos = [photo('a', 41.9, 12.49), photo('b', 41.91, 12.5)];
    expect(groupAtlasPhotos(photos, 10)).toHaveLength(1);
    expect(groupAtlasPhotos(photos, 16)).toHaveLength(2);
  });
  it('keeps identical coordinates together and anchors to the stable cover photo', () => {
    const a = photo('a', 41.9, 12.49);
    const b = photo('b', 41.9, 12.49);
    const groups = groupAtlasPhotos([b, a, photo('missing')], 22);
    expect(groups).toHaveLength(1);
    expect(groups[0].photos.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(groups[0].latitude).toBe(a.location?.latitude);
    expect(groupAtlasPhotos([a, b], 22)).toEqual(groups);
  });
  it('groups across the antimeridian and handles polar GPS', () => {
    expect(
      groupAtlasPhotos([photo('a', 0, 179.999), photo('b', 0, -179.999)], 10),
    ).toHaveLength(1);
    expect(groupAtlasPhotos([photo('north', 90, 0)], 10)[0].latitude).toBe(90);
  });
  it('uses event titles only for a shared known event', () => {
    const a = { ...photo('a', 0, 0), linkedEvent: 'event' };
    const b = { ...photo('b', 0, 0), linkedEvent: 'event' };
    const titles = new Map([['event', 'Coffee by the river']]);
    expect(getMemoryLabel([a, b], titles)).toBe('Coffee by the river');
    expect(getMemoryLabel([a, { ...b, linkedEvent: null }], titles)).toBe(
      'Photos around here',
    );
    expect(getMemoryLabel([a], new Map())).toBe('Photos around here');
    expect(getMemoryLabel([], titles)).toBe('Photos around here');
  });
});
