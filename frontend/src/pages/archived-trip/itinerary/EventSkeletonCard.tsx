import { Skeleton } from '../../../components/common';

/**
 * Holds the space of an itinerary event card while events load.
 * @returns A decorative event card with an accessible loading status.
 */
const EventSkeletonCard = () => (
  <div
    role="status"
    aria-label="Loading events for this day"
    className="grid h-42 grid-cols-[minmax(7rem,34%)_minmax(0,1fr)] overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low"
  >
    <Skeleton className="col-start-1 row-start-1 h-full min-h-0 w-full rounded-none" />
    <div className="col-start-2 row-start-1 flex min-h-0 min-w-0 flex-col">
      <div className="px-4 pb-1 pt-10 sm:px-6">
        <Skeleton className="h-5 w-3/4 max-w-48" />
        <Skeleton className="mt-3 h-4 w-4/5 max-w-64" />
      </div>
      <div className="mt-auto flex justify-center border-t border-outline-variant/40 py-2">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

export default EventSkeletonCard;
