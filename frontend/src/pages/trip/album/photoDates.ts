import type { TripPhoto } from '../../../queries/photos';

export interface PhotoDateGroup {
  day: string | null;
  label: string;
  photos: TripPhoto[];
}

/** Reads the camera's calendar date without converting it to the viewer's timezone.
 * @param photo - Photo with optional capture metadata.
 * @returns A valid ISO day or null; upload timestamps are deliberately not a fallback.
 */
export const getPhotoTakenDay = (photo: TripPhoto): string | null => {
  if (
    !photo.takenAt ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(photo.takenAt)
  )
    return null;
  const date = new Date(`${photo.takenAt}Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19) !== photo.takenAt
  )
    return null;
  return photo.takenAt.slice(0, 10);
};

/** Groups photos into chronological capture days with undated photographs last.
 * @param photos - Loaded photos, including legacy records without capture dates.
 * @returns Date-labelled groups sorted by capture time, independent of upload order.
 */
export const groupPhotosByTakenDate = (
  photos: TripPhoto[],
): PhotoDateGroup[] => {
  const groups = new Map<string | null, TripPhoto[]>();
  for (const photo of photos) {
    const day = getPhotoTakenDay(photo);
    const group = groups.get(day) ?? [];
    group.push(photo);
    groups.set(day, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a ?? '9999-99-99').localeCompare(b ?? '9999-99-99'))
    .map(([day, items]) => ({
      day,
      label: day
        ? new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })
        : 'Date unknown',
      photos: [...items].sort((a, b) => {
        if (!day) return 0;
        return a.takenAt!.localeCompare(b.takenAt!) || a.id.localeCompare(b.id);
      }),
    }));
};
