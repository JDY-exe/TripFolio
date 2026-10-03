import { Skeleton } from '../../../components/common';

/**
 * Holds the space of an itinerary event card while events load.
 * @returns A decorative event card with an accessible loading status.
 */
const EventSkeletonCard = () => (
  <div
    role="status"
    aria-label="Loading events for this day"
    className="rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6"
  >
    <div className="flex items-center gap-4">
      <Skeleton className="h-14 w-12 shrink-0 rounded-t-full rounded-b-2xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-2/5 max-w-48" />
        <Skeleton className="mt-2 h-3 w-3/5 max-w-64" />
      </div>
    </div>
    <div className="mt-5 rounded-panel bg-surface-container p-4">
      <Skeleton className="h-4 w-1/3 max-w-36" />
    </div>
  </div>
);

export default EventSkeletonCard;
