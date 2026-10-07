import { Clock3, Plane } from 'lucide-react';
import { Text } from '../../../../components/common';
import type { FlightSegment } from '../../../../queries/reservations';
import { layoverMinutes } from './flightWizard';

interface FlightJourneyTimelineProps {
  segments: FlightSegment[];
}

const localDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats a wall-clock value without converting it to the viewer's time zone. */
const formatLocalDate = (value: string): string =>
  localDate.format(new Date(`${value}:00Z`));

/** Formats the duration between two times at the same layover airport. */
const formatLayover = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : '']
    .filter(Boolean)
    .join(' ');
};

/** Shows each flight leg and the layover between connected legs. */
const FlightJourneyTimeline = ({ segments }: FlightJourneyTimelineProps) => (
  <ol className="mt-5 space-y-0">
    {segments.map((segment, index) => {
      const next = segments[index + 1];
      const minutes = next
        ? layoverMinutes(segment.arriveTime, next.departTime)
        : null;
      return (
        <li key={index}>
          <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 sm:gap-4">
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className="mt-1 size-3 rounded-full border-[3px] border-primary bg-surface-container-low" />
              <span className="my-1 min-h-16 w-px flex-1 border-2 border-outline bg-outline-variant" />
              <span className="size-3 rounded-full border-[3px] border-primary bg-surface-container-low" />
            </div>
            <div className="min-w-0 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <Text as="h5" variant="label" className="font-semibold">
                  Leg {index + 1} ·{' '}
                  {segment.flightNum || 'Flight number not provided'}
                </Text>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-4">
                <div>
                  <Text className="text-2xl font-medium tracking-tight sm:text-3xl">
                    {segment.departAirport}
                  </Text>
                  <time
                    dateTime={segment.departTime}
                    className="block text-sm font-semibold tabular-nums"
                  >
                    {segment.departTime.slice(11, 16)}
                  </time>
                  <time
                    dateTime={segment.departTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {formatLocalDate(segment.departTime)}
                  </time>
                </div>
                <div
                  className="mt-4 flex items-center gap-1 text-primary"
                  aria-hidden="true"
                >
                  <span className="w-5 border-t-2 border-dashed border-outline sm:w-8" />
                  <Plane size={18} className="rotate-45" />
                  <span className="w-5 border-t-2 border-dashed border-outline sm:w-8" />
                </div>
                <div className="text-right">
                  <Text className="text-2xl font-medium tracking-tight sm:text-3xl">
                    {segment.arriveAirport}
                  </Text>
                  <time
                    dateTime={segment.arriveTime}
                    className="block text-sm font-semibold tabular-nums"
                  >
                    {segment.arriveTime.slice(11, 16)}
                  </time>
                  <time
                    dateTime={segment.arriveTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {formatLocalDate(segment.arriveTime)}
                  </time>
                </div>
              </div>
            </div>
          </div>
          {next ? (
            <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 sm:gap-4">
              <span
                className="mx-auto h-full border-l-3 border-dotted border-outline"
                aria-hidden="true"
              />
              <div className="flex items-center gap-2 py-8 text-secondary">
                <Clock3 aria-hidden size={17} className="shrink-0" />
                <Text as="span" variant="label" className="font-medium">
                  {minutes !== null ? `${formatLayover(minutes)} ` : ''}
                  Layover in {segment.arriveAirport}
                </Text>
              </div>
            </div>
          ) : null}
        </li>
      );
    })}
  </ol>
);

export default FlightJourneyTimeline;
