import { describe, expect, it } from 'vitest';
import {
  buildHighlightRecaps,
  getRecapGroups,
} from '../../../../../src/pages/trip/album/collage/highlights';
import { getRecapCells } from '../../../../../src/pages/trip/album/collage/renderRecap';
import type { EventData } from '../../../../../src/queries/events';
import type { TripPhoto } from '../../../../../src/queries/photos';

/** Makes linked metadata with explicit dimensions and unrelated upload time. */
const photo = (
  id: string,
  event = 'meal',
  width = 400,
  height = 600,
): TripPhoto => ({
  id,
  trip: 'trip',
  linkedEvent: event,
  width,
  height,
  uploadedBy: 'user',
  originalName: 'photo.jpg',
  contentType: 'image/jpeg',
  byteLength: 100,
  createdAt: '2029-01-01T00:00:00Z',
  contentUrl: `/photos/${id}`,
  location: null,
});
/** Makes an itinerary event with an explicit supported category. */
const event = (
  id: string,
  day = '12',
  eventType: EventData['eventType'] = 'restaurant',
): EventData => ({
  _id: id,
  title: `Place ${id}`,
  startTime: `2026-06-${day}T12:00:00Z`,
  endTime: `2026-06-${day}T13:00:00Z`,
  eventType,
  address: '',
});
/** Supplies shared time bounds so all formats obey the same eligibility rules. */
const input = (photos: TripPhoto[], events: EventData[]) => ({
  tripId: 'trip',
  photos,
  events,
  startDate: '2026-06-10',
  endDate: '2026-06-14',
  now: Date.parse('2026-06-13T14:00:00Z'),
});

describe('highlight formats', () => {
  it('selects only restaurant events, deduplicates photos and ranks one photo per restaurant', () => {
    const source = input(
      [
        photo('small'),
        photo('large', 'meal', 1000),
        photo('large', 'meal', 1000),
        photo('hike', 'hike'),
        photo('future', 'future'),
        photo('foreign', 'foreign'),
      ],
      [
        event('meal'),
        event('hike', '12', 'activity'),
        event('future', '14'),
        event('foreign', '09'),
      ],
    );
    const slides = buildHighlightRecaps(source, 'dining');
    expect(slides).toHaveLength(1);
    expect(slides[0].heading).toBe('Dining on our trip');
    expect(slides[0].moments).toHaveLength(1);
    expect(slides[0].moments[0].photos.map((item) => item.id)).toEqual([
      'large',
      'small',
    ]);
    expect(slides[0].layout).toBe('single');
  });
  it('uses a hero with three supporting cells and splits larger dining sets without duplicate fillers', () => {
    const events = Array.from({ length: 5 }, (_, index) =>
      event(`meal-${index}`, index === 4 ? '13' : '12'),
    );
    const slides = buildHighlightRecaps(
      input(
        events.map((item) => photo(item._id, item._id)),
        events,
      ),
      'dining',
    );
    expect(slides.map((slide) => slide.layout)).toEqual([
      'hero-four',
      'single',
    ]);
    expect(slides.map((slide) => slide.total)).toEqual([2, 2]);
    expect(getRecapGroups(slides, 'dining')).toHaveLength(1);
    expect(getRecapCells('hero-four')).toHaveLength(4);
    expect(getRecapCells('hero-four')[0].width).toBeGreaterThan(
      getRecapCells('hero-four')[1].width,
    );
  });
  it('labels multi-day dining images with the actual covered date range', () => {
    const slides = buildHighlightRecaps(
      input(
        [photo('first', 'first'), photo('second', 'second')],
        [event('first', '11'), event('second', '13')],
      ),
      'dining',
    );
    expect(slides[0].dateLabel).toBe('June 11, 2026 – June 13, 2026');
  });
  it('requires three distinct photos of the same experience, not three pages or three different events', () => {
    expect(
      buildHighlightRecaps(
        input([photo('a'), photo('a'), photo('b')], [event('meal')]),
        'experience',
      ),
    ).toEqual([]);
    expect(
      buildHighlightRecaps(
        input(
          [photo('a', 'a'), photo('b', 'b'), photo('c', 'c')],
          [event('a'), event('b'), event('c')],
        ),
        'experience',
      ),
    ).toEqual([]);
  });
  it('chooses one wide establishing photo and two distinct supporting photos with unused alternatives', () => {
    const source = input(
      [
        photo('portrait', 'meal', 1600, 2400),
        photo('wide', 'meal', 1200, 600),
        photo('support'),
        photo('spare'),
      ],
      [event('meal')],
    );
    const slides = buildHighlightRecaps(source, 'experience');
    expect(slides).toHaveLength(1);
    expect(slides[0].heading).toBe('At Place meal');
    expect(slides[0].layout).toBe('hero');
    expect(slides[0].moments.map((moment) => moment.photos[0].id)).toEqual([
      'wide',
      'portrait',
      'spare',
    ]);
    expect(
      slides[0].moments.every(
        (moment) =>
          moment.photos
            .slice(1)
            .map((item) => item.id)
            .join() === 'support',
      ),
    ).toBe(true);
    expect(getRecapGroups(slides, 'experience')[0].id).toBe('meal');
  });
  it('keeps experiences on the same day independently selectable and excludes future/foreign photos', () => {
    const photos = ['a', 'b', 'future'].flatMap((id) => [
      photo(`${id}1`, id),
      photo(`${id}2`, id),
      photo(`${id}3`, id),
    ]);
    photos.push({ ...photo('foreign', 'a'), trip: 'other' });
    const slides = buildHighlightRecaps(
      input(photos, [event('a'), event('b'), event('future', '14')]),
      'experience',
    );
    expect(
      getRecapGroups(slides, 'experience').map((group) => group.id),
    ).toEqual(['a', 'b']);
    expect(
      slides
        .flatMap((slide) => slide.moments.flatMap((moment) => moment.photos))
        .some((item) => item.id === 'foreign'),
    ).toBe(false);
  });
});
