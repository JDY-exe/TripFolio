import { EVENT_TYPE } from '../../../../queries/events';
import {
  buildDailyRecaps,
  formatRecapDate,
  getRecapLayout,
  type RecapKind,
  type RecapSlide,
} from './dailyRecap';

export const RECAP_FORMATS = [
  {
    kind: 'daily',
    title: 'Daily recap',
    empty: 'No daily recaps yet',
    hint: 'Add photos linked to events on a trip day that has already started.',
  },
  {
    kind: 'dining',
    title: 'Dining recap',
    empty: 'No dining recap yet',
    hint: 'Add photos linked to restaurant events on your trip. Future events aren’t included.',
  },
  {
    kind: 'experience',
    title: 'Single-experience recap',
    empty: 'No experience recaps yet',
    hint: 'An experience needs at least three distinct photos linked to the same event. Future events aren’t included.',
  },
] as const;

/** Builds every format from the same validated, deduplicated event/photo pool.
 * @param input - Complete private album metadata, itinerary events, bounds and clock.
 * @param kind - Requested recap format; never infers food, visits or capture dates.
 * @returns Deterministic slides with automatic composition and disjoint photo fallbacks.
 */
export const buildHighlightRecaps = (
  input: Parameters<typeof buildDailyRecaps>[0],
  kind: RecapKind,
): RecapSlide[] => {
  const daily = buildDailyRecaps(input);
  if (kind === 'daily') return daily;
  const moments = daily.flatMap((slide) =>
    slide.moments.map((moment) => ({ ...moment, date: slide.date })),
  );
  if (kind === 'experience') {
    return moments
      .filter((moment) => moment.photos.length >= 3)
      .map((moment) => {
        const hero =
          moment.photos.find((photo) => photo.width >= photo.height) ??
          moment.photos[0];
        const others = moment.photos.filter((photo) => photo.id !== hero.id);
        const chosen = [hero, ...others.slice(0, 2)];
        const alternatives = others.slice(2);
        return {
          kind,
          groupId: moment.eventId,
          heading: `At ${moment.label}`,
          date: moment.date,
          index: 0,
          total: 1,
          layout: 'hero',
          moments: chosen.map((photo) => ({
            eventId: moment.eventId,
            label: moment.label,
            photos: [photo, ...alternatives],
          })),
        };
      });
  }
  const restaurantIds = new Set(
    input.events
      .filter((event) => event.eventType === EVENT_TYPE.RESTAURANT)
      .map((event) => event._id),
  );
  const dining = moments.filter((moment) => restaurantIds.has(moment.eventId));
  const total = Math.ceil(dining.length / 4);
  return Array.from({ length: total }, (_, index) => {
    const group = dining.slice(index * 4, index * 4 + 4);
    const first = group[0].date;
    const last = group[group.length - 1].date;
    return {
      kind,
      groupId: 'dining',
      heading: 'Dining on our trip',
      date: first,
      dateLabel:
        first === last
          ? formatRecapDate(first)
          : `${formatRecapDate(first)} – ${formatRecapDate(last)}`,
      index,
      total,
      moments: group,
      layout:
        group.length === 4
          ? 'hero-four'
          : getRecapLayout(group.map((moment) => moment.photos[0])),
    };
  });
};

/** Groups slides for one shared day/experience selector without duplicating browser UI.
 * @param slides - Validated slides for a single format.
 * @param kind - Determines whether the selector describes a date or an event.
 * @returns Chronological groups; dining has one trip-wide group.
 */
export const getRecapGroups = (slides: RecapSlide[], kind: RecapKind) => {
  const groups = new Map<
    string,
    { id: string; label: string; slides: RecapSlide[] }
  >();
  for (const slide of slides) {
    const id = slide.groupId ?? slide.date;
    const label =
      kind === 'experience'
        ? `${slide.moments[0].label} · ${formatRecapDate(slide.date)}`
        : formatRecapDate(slide.date);
    const group = groups.get(id) ?? { id, label, slides: [] };
    group.slides.push(slide);
    groups.set(id, group);
  }
  return [...groups.values()];
};
