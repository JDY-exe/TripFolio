import { CalendarDays, UserRound, UsersRound } from 'lucide-react';
import { Skeleton, Text } from '../../../components/common';
import type { TripTraveler } from '../../../queries/trips';

interface TripOverviewProps {
  startDate: string;
  endDate: string;
  travelers?: TripTraveler[];
  travelersLoading: boolean;
  travelersError: boolean;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Displays trip dates and overlapping traveler portraits in the sidebar.
 * @param props - Trip dates, traveler profiles, and their loading and error states.
 * @returns The overview card with a compact date range and traveler count.
 */
const TripOverview = ({
  startDate,
  endDate,
  travelers = [],
  travelersLoading,
  travelersError,
}: TripOverviewProps) => (
  <section
    data-cy="trip-overview"
    className="rounded-panel bg-surface-container p-8 text-on-surface"
  >
    <Text as="h2" variant="title">
      Trip overview
    </Text>
    <dl className="mt-5 space-y-5">
      <div>
        <Text
          as="dt"
          variant="label"
          color="muted"
          className="flex items-center gap-2"
        >
          <CalendarDays aria-hidden size={18} />
          Trip dates
        </Text>
        <Text as="dd" className="mt-2" data-cy="trip-overview-dates">
          <time dateTime={startDate.slice(0, 10)}>
            {dateFormatter.format(new Date(startDate))}
          </time>
          {startDate.slice(0, 10) !== endDate.slice(0, 10) && (
            <>
              {' – '}
              <time dateTime={endDate.slice(0, 10)}>
                {dateFormatter.format(new Date(endDate))}
              </time>
            </>
          )}
        </Text>
      </div>
      <div className="pt-2">
        <Text
          as="dt"
          variant="label"
          color="muted"
          className="flex items-center gap-2"
        >
          <UsersRound aria-hidden size={18} />
          {travelersLoading || travelersError
            ? 'Travelers'
            : `${travelers.length} ${travelers.length === 1 ? 'traveler' : 'travelers'}`}
        </Text>
        <dd className="mt-3" data-cy="trip-overview-travelers">
          {travelersLoading && (
            <div role="status" aria-label="Loading travelers">
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          )}
          {!travelersLoading && travelersError && (
            <Text color="muted">Could not load travelers.</Text>
          )}
          {!travelersLoading && !travelersError && travelers.length > 0 && (
            <ul aria-label="Trip travelers" className="flex -space-x-3">
              {travelers.slice(0, 4).map((traveler) => (
                <li
                  key={traveler.id}
                  title={traveler.username}
                  className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface-container"
                >
                  {traveler.profile_picture && (
                    <img
                      src={traveler.profile_picture}
                      alt={traveler.username}
                      className="size-full object-cover"
                    />
                  )}
                  {!traveler.profile_picture && (
                    <>
                      <UserRound aria-hidden size={20} />
                      <span className="sr-only">{traveler.username}</span>
                    </>
                  )}
                </li>
              ))}
              {travelers.length > 4 && (
                <li
                  className="relative flex size-10 items-center justify-center rounded-full bg-primary-container text-label text-on-primary-container ring-2 ring-surface-container"
                  title={travelers
                    .slice(4)
                    .map((traveler) => traveler.username)
                    .join(', ')}
                >
                  <span aria-hidden>+{travelers.length - 4}</span>
                  <span className="sr-only">
                    {travelers
                      .slice(4)
                      .map((traveler) => traveler.username)
                      .join(', ')}
                  </span>
                </li>
              )}
            </ul>
          )}
          {!travelersLoading && !travelersError && !travelers.length && (
            <Text color="muted">No travelers to show.</Text>
          )}
        </dd>
      </div>
    </dl>
  </section>
);

export default TripOverview;
