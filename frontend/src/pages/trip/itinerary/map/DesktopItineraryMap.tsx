import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Skeleton } from '../../../../components/common';
import type { EventData } from '../../../../queries/events';

const ItineraryMap = lazy(() => import('./ItineraryMap'));
const desktopQuery = '(min-width: 1024px)';

/** Subscribes to desktop breakpoint changes, including resizing and rotation.
 * @param notify - React's snapshot change callback.
 * @returns Cleanup for the media-query listener.
 */
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

/** @returns Whether the viewport has room for the reading view's map column. */
const getSnapshot = () => window.matchMedia(desktopQuery).matches;

/** Ignores edit actions because reading maps never expose editing controls. @returns Nothing. */
const ignoreEdit = () => {};

interface DesktopItineraryMapProps {
  events: EventData[];
  activeDate?: string;
  startDate: string;
  loading: boolean;
}

/** Mounts the prominent reading map only on desktop, avoiding mobile location and tile requests.
 * @param props - Events and the timeline's currently visible day.
 * @returns A sticky map column on desktop, or nothing on smaller screens.
 */
const DesktopItineraryMap = (props: DesktopItineraryMapProps) => {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot);
  if (!isDesktop) return null;

  return (
    <aside
      aria-label="Trip map"
      data-cy="reading-trip-map"
      className="min-w-0 lg:sticky lg:top-8 lg:self-start"
    >
      <Suspense
        fallback={<Skeleton className="h-[28rem] w-full rounded-panel" />}
      >
        <ItineraryMap
          {...props}
          readOnly
          prominent
          onEdit={ignoreEdit}
          onDelete={ignoreEdit}
        />
      </Suspense>
    </aside>
  );
};

export default DesktopItineraryMap;
