import { describe, expect, it } from 'vitest';
import {
  getPhotoTakenDay,
  groupPhotosByTakenDate,
} from '../../../../src/pages/trip/album/photoDates';
import type { TripPhoto } from '../../../../src/queries/photos';

/** Builds metadata for capture-day grouping without conflating upload time. */
const photo = (id: string, takenAt?: string | null): TripPhoto => ({
  id,
  takenAt,
  trip: 'trip',
  uploadedBy: 'owner',
  originalName: `${id}.webp`,
  contentType: 'image/webp',
  byteLength: 1,
  width: 100,
  height: 100,
  createdAt: '2026-11-01T12:00:00Z',
  contentUrl: `/photos/${id}`,
  location: null,
  linkedEvent: null,
});

describe('photo capture dates', () => {
  it('groups by camera day and sorts chronologically even with identical upload times', () => {
    const groups = groupPhotosByTakenDate([
      photo('last', '2026-05-13T01:00:00'),
      photo('late', '2026-05-12T23:30:00'),
      photo('early', '2026-05-12T08:00:00'),
    ]);
    expect(groups.map((group) => group.day)).toEqual([
      '2026-05-12',
      '2026-05-13',
    ]);
    expect(groups[0].photos.map(({ id }) => id)).toEqual(['early', 'late']);
    expect(getPhotoTakenDay(photo('late', '2026-05-12T23:30:00'))).toBe(
      '2026-05-12',
    );
  });
  it('puts legacy, missing and invalid capture dates under Date unknown, never upload day', () => {
    const groups = groupPhotosByTakenDate([
      photo('legacy'),
      photo('null', null),
      photo('bad', 'bad'),
      photo('impossible', '2026-02-30T12:00:00'),
      photo('known', '2026-05-12T12:00:00'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[1].day).toBeNull();
    expect(groups[1].label).toBe('Date unknown');
    expect(groups[1].photos).toHaveLength(4);
  });
  it('does not mutate server order or lose photos while grouping', () => {
    const photos = [
      photo('b', '2026-05-13T00:00:00'),
      photo('a', '2026-05-12T00:00:00'),
    ];
    expect(
      groupPhotosByTakenDate(photos).flatMap((group) => group.photos),
    ).toHaveLength(2);
    expect(photos.map(({ id }) => id)).toEqual(['b', 'a']);
    expect(groupPhotosByTakenDate([])).toEqual([]);
  });
});
