import type { EventData } from '../../../../queries/events';
import type { TripPhoto } from '../../../../queries/photos';

export interface RecapMoment {
  eventId: string;
  label: string;
  /** Resolution-ranked alternatives are retained for image-load failures. */
  photos: TripPhoto[];
}

export type RecapLayout =
  'single' | 'side-by-side' | 'stacked' | 'hero' | 'hero-four' | 'grid';

export type RecapKind = 'daily' | 'dining' | 'experience';

export interface RecapSlide {
  /** Daily slides remain compatible with the original selection contract. */
  kind?: RecapKind;
  groupId?: string;
  heading?: string;
  dateLabel?: string;
  date: string;
  index: number;
  total: number;
  layout: RecapLayout;
  moments: RecapMoment[];
}

/** Resolves automatic composition from photo count and stored orientation.
 * @param photos - Ordered representative photos, one per event.
 * @returns A fixed layout without repeating photos to fill empty cells.
 */
export const getRecapLayout = (photos: TripPhoto[]): RecapLayout => {
  if (photos.length === 1) return 'single';
  if (photos.length === 2)
    return photos.every((photo) => photo.height > photo.width)
      ? 'side-by-side'
      : 'stacked';
  return photos.length === 3 ? 'hero' : 'grid';
};

/** Formats itinerary UTC days without shifting them to the browser timezone.
 * @param date - A valid YYYY-MM-DD itinerary day.
 * @returns A human-readable date for the preview and exported image.
 */
export const formatRecapDate = (date: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

/** Rejects calendar dates that JavaScript would silently normalize, such as February 30.
 * @param value - An ISO day or timestamp whose calendar portion must be valid.
 * @returns Whether its YYYY-MM-DD portion is a real calendar date.
 */
const hasValidDay = (value: string) => {
  const day = value.slice(0, 10);
  const time = Date.parse(`${day}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === day
  );
};

/** Groups all metadata into stable, chronological daily slides, never using upload dates.
 * @param input - Same-trip photos, itinerary events and date bounds, plus an injectable clock.
 * @returns Serializable slides with ranked fallback photos; source arrays are not mutated.
 */
export const buildDailyRecaps = ({
  tripId,
  photos,
  events,
  startDate,
  endDate,
  now = Date.now(),
}: {
  tripId: string;
  photos: TripPhoto[];
  events: EventData[];
  startDate: string;
  endDate: string;
  now?: number;
}): RecapSlide[] => {
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${endDate.slice(0, 10)}T23:59:59.999Z`);
  if (
    !hasValidDay(startDate) ||
    !hasValidDay(endDate) ||
    start > end ||
    !Number.isFinite(now)
  )
    return [];
  const linked = new Map<string, TripPhoto[]>();
  const seen = new Set<string>();
  for (const photo of photos) {
    if (
      seen.has(photo.id) ||
      photo.trip !== tripId ||
      !photo.linkedEvent ||
      !photo.contentUrl ||
      !(photo.width > 0 && photo.height > 0)
    )
      continue;
    seen.add(photo.id);
    const group = linked.get(photo.linkedEvent) ?? [];
    group.push(photo);
    linked.set(photo.linkedEvent, group);
  }
  const days = new Map<string, RecapMoment[]>();
  const ordered = events
    .filter(
      (event) =>
        hasValidDay(event.startTime) &&
        Number.isFinite(Date.parse(event.startTime)),
    )
    .sort(
      (a, b) =>
        Date.parse(a.startTime) - Date.parse(b.startTime) ||
        a._id.localeCompare(b._id),
    );
  const seenEvents = new Set<string>();
  for (const event of ordered) {
    const time = Date.parse(event.startTime);
    const candidates = linked.get(event._id);
    if (
      seenEvents.has(event._id) ||
      !candidates?.length ||
      !Number.isFinite(time) ||
      time < start ||
      time > end ||
      time > now
    )
      continue;
    seenEvents.add(event._id);
    const date = new Date(time).toISOString().slice(0, 10);
    candidates.sort(
      (a, b) =>
        b.width * b.height - a.width * a.height || a.id.localeCompare(b.id),
    );
    const moments = days.get(date) ?? [];
    moments.push({
      eventId: event._id,
      label: event.title.trim() || 'Trip moment',
      photos: candidates,
    });
    days.set(date, moments);
  }
  return [...days].flatMap(([date, moments]) => {
    const total = Math.ceil(moments.length / 4);
    return Array.from({ length: total }, (_, index) => {
      const group = moments.slice(index * 4, index * 4 + 4);
      return {
        date,
        index,
        total,
        moments: group,
        layout: getRecapLayout(group.map((moment) => moment.photos[0])),
      };
    });
  });
};
