import { describe, expect, it } from 'vitest';
import {
  buildDailyRecaps,
  formatRecapDate,
  getRecapLayout,
} from '../../../../../src/pages/trip/album/collage/dailyRecap';
import { getRecapCells } from '../../../../../src/pages/trip/album/collage/renderRecap';
import type { TripPhoto } from '../../../../../src/queries/photos';
import type { EventData } from '../../../../../src/queries/events';

/** Creates explicit event-linked metadata independent of its unrelated upload day. */
const photo = (
  id: string,
  linkedEvent: string | null = id,
  overrides: Partial<TripPhoto> = {},
): TripPhoto => ({
  id,
  linkedEvent,
  trip: 'trip',
  uploadedBy: 'owner',
  originalName: 'photo.webp',
  contentType: 'image/webp',
  byteLength: 100,
  width: 400,
  height: 300,
  createdAt: '2027-01-01T00:00:00Z',
  contentUrl: `/trip/trip/photos/${id}/content`,
  location: null,
  ...overrides,
});
/** Creates a timed itinerary event with no location or capture-date inference. */
const event = (id: string, startTime = '2026-06-12T10:00:00Z'): EventData => ({
  _id: id,
  title: `Event ${id}`,
  startTime,
  endTime: startTime,
  eventType: 'activity',
  address: '',
});
/** Runs selection with deterministic date bounds and clock. */
const build = (photos: TripPhoto[], events: EventData[]) =>
  buildDailyRecaps({
    tripId: 'trip',
    photos,
    events,
    startDate: '2026-06-10',
    endDate: '2026-06-14',
    now: Date.parse('2026-06-13T12:00:00Z'),
  });

describe('daily recap selection', () => {
  it('deduplicates pages, ranks by area then ID, and never uses upload timestamps', () => {
    const photos = [
      photo('z', 'event'),
      photo('b', 'event', { width: 800 }),
      photo('a', 'event', { width: 800 }),
    ];
    const slides = build([...photos, photos[0]], [event('event')]);
    expect(slides).toHaveLength(1);
    expect(slides[0].date).toBe('2026-06-12');
    expect(slides[0].moments[0].photos.map((item) => item.id)).toEqual([
      'a',
      'b',
      'z',
    ]);
    expect(photos.map((item) => item.id)).toEqual(['z', 'b', 'a']);
  });
  it('ignores unlinked, cross-trip, missing, future, invalid, and out-of-itinerary events', () => {
    const photos = [
      'past',
      'future',
      'invalid',
      'outside',
      'missing',
      'foreign',
    ].map((id) => photo(id));
    photos.push(photo('unlinked', null));
    photos[5] = photo('foreign', 'foreign', { trip: 'other' });
    const slides = build(photos, [
      event('past'),
      event('future', '2026-06-13T13:00:00Z'),
      event('invalid', 'invalid'),
      event('outside', '2026-06-09T10:00:00Z'),
      event('foreign'),
    ]);
    expect(
      slides.flatMap((slide) => slide.moments.map((moment) => moment.eventId)),
    ).toEqual(['past']);
  });
  it('orders events by time and ID, splits after four, and groups UTC days', () => {
    const ids = ['e', 'c', 'a', 'd', 'b'];
    const events = ids.map((id) => event(id));
    events.push(
      event('next', '2026-06-13T01:00:00+02:00'),
      event('tomorrow', '2026-06-13T10:00:00Z'),
    );
    const slides = build(
      [...ids, 'next', 'tomorrow'].map((id) => photo(id)),
      events,
    );
    expect(
      slides.map((slide) => [
        slide.date,
        slide.index,
        slide.total,
        slide.moments.length,
      ]),
    ).toEqual([
      ['2026-06-12', 0, 2, 4],
      ['2026-06-12', 1, 2, 2],
      ['2026-06-13', 0, 1, 1],
    ]);
    expect(slides[0].moments.map((moment) => moment.eventId)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
  it('uses truthful single-photo layouts and handles all counts and orientations', () => {
    const landscape = photo('l');
    const portrait = photo('p', 'p', { height: 800 });
    expect(getRecapLayout([landscape])).toBe('single');
    expect(getRecapLayout([portrait, portrait])).toBe('side-by-side');
    expect(getRecapLayout([portrait, landscape])).toBe('stacked');
    expect(getRecapLayout([landscape, landscape, landscape])).toBe('hero');
    expect(getRecapLayout(Array(4).fill(landscape))).toBe('grid');
    expect(build([], [])).toEqual([]);
    expect(formatRecapDate('2026-06-12')).toBe('June 12, 2026');
  });
  it('rejects normalized impossible dates and invalid clocks or bounds', () => {
    const input = {
      tripId: 'trip',
      photos: [photo('event')],
      events: [event('event', '2026-02-30T10:00:00Z')],
      startDate: '2026-02-01',
      endDate: '2026-03-10',
      now: Date.parse('2026-03-10T12:00:00Z'),
    };
    expect(buildDailyRecaps(input)).toEqual([]);
    expect(buildDailyRecaps({ ...input, startDate: '2026-02-30' })).toEqual([]);
    expect(buildDailyRecaps({ ...input, now: Number.NaN })).toEqual([]);
    expect(buildDailyRecaps({ ...input, startDate: '2026-03-11' })).toEqual([]);
  });
  it('returns bounded, non-overlapping cells with caption room for every layout', () => {
    for (const layout of [
      'single',
      'side-by-side',
      'stacked',
      'hero',
      'grid',
    ] as const) {
      const cells = getRecapCells(layout);
      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(230);
        expect(cell.x + cell.width).toBeLessThanOrEqual(1080);
        expect(cell.y + cell.height).toBeLessThanOrEqual(1254);
        expect(cell.height).toBeGreaterThan(94);
      }
      for (const [index, a] of cells.entries())
        for (const b of cells.slice(index + 1)) {
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
        }
    }
  });
});
