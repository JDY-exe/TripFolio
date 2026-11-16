import { useRef, useState, type ReactNode } from 'react';
import { Button, Skeleton, Text } from '../../../../components/common';
import type { Itinerary } from '../../../../queries/itineraries';
import type { TripTraveler } from '../../../../queries/trips';
import type { EventData } from '../../../../queries/events';
import ItineraryDaySection from '../ItineraryDaySection';
import { getItineraryDays } from '../itineraryDays';
import DesktopItineraryMap from '../map/DesktopItineraryMap';
import { useActiveItineraryDay } from '../map/useActiveItineraryDay';

interface TripReadingViewProps {
  title: string;
  startDate: string;
  endDate: string;
  archived?: boolean;
  ownerName?: string;
  travelers: TripTraveler[];
  travelerCount?: number;
  itinerary: Itinerary;
  events: EventData[];
  eventsLoading?: boolean;
  eventsError?: boolean;
  onRetry?: () => void;
  shareAction?: ReactNode;
  supportingContent?: ReactNode;
  personalNotes?: ReactNode;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Presents the trip story before its timeline, with supporting tools kept out of the sidebar.
 * @param props - Read-only trip content, metadata, sharing, and private supporting content.
 * @returns A reading layout with a prominent desktop map and a single column on mobile.
 */
const TripReadingView = ({
  title,
  startDate,
  endDate,
  archived = false,
  ownerName,
  travelers,
  travelerCount = travelers.length,
  itinerary,
  events,
  eventsLoading = false,
  eventsError = false,
  onRetry,
  shareAction,
  supportingContent,
  personalNotes,
}: TripReadingViewProps) => {
  const column = useRef<HTMLElement>(null);
  const [showDayNumbers, setShowDayNumbers] = useState(false);
  const eventsByTime = [...events].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  );
  const eventsByDay = new Map<string, EventData[]>();
  for (const event of eventsByTime) {
    const date = event.startTime.slice(0, 10);
    eventsByDay.set(date, [...(eventsByDay.get(date) ?? []), event]);
  }
  const days = getItineraryDays(itinerary.startDate, itinerary.endDate);
  const activeDate = useActiveItineraryDay(
    column,
    eventsByTime[0]?.startTime.slice(0, 10),
  );

  return (
    <section className="min-w-0 text-on-surface" data-cy="trip-reading-view">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Text
            as="h1"
            variant="display"
            data-cy="trip-section-itinerary"
            className="min-w-0 flex-1 basis-64 break-words"
          >
            {title}
          </Text>
          {shareAction}
        </div>
        <div
          data-cy="trip-reading-metadata"
          className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant"
        >
          {ownerName && <span>By {ownerName}</span>}
          <span>
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
          </span>
          <span
            title={travelers.map((traveler) => traveler.username).join(', ')}
          >
            {travelerCount} {travelerCount === 1 ? 'traveler' : 'travelers'}
          </span>
          {archived && (
            <span
              data-cy="trip-archived-status"
              className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface"
            >
              Archived
            </span>
          )}
        </div>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          ref={column}
          aria-label="Trip story and itinerary"
          className="min-w-0"
        >
          {itinerary.description.trim().length > 0 && (
            <Text
              data-cy="trip-reading-description"
              className="mb-10 rounded-panel bg-surface-container-low p-5 whitespace-pre-wrap break-words leading-relaxed sm:p-6"
            >
              {itinerary.description}
            </Text>
          )}
          {supportingContent}
          {eventsLoading && (
            <div
              role="status"
              aria-label="Loading itinerary events"
              className="space-y-4"
            >
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-48 w-full rounded-panel" />
            </div>
          )}
          {!eventsLoading && eventsError && events.length === 0 && (
            <div role="alert" className="space-y-3">
              <Text color="error">Could not load itinerary events.</Text>
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
          {!eventsLoading && !eventsError && events.length === 0 && (
            <Text color="muted">No itinerary events.</Text>
          )}
          {!eventsLoading &&
            events.length > 0 &&
            days.map((date, index) => (
              <div key={date}>
                {(eventsByDay.get(date)?.length ?? 0) > 0 && (
                  <ItineraryDaySection
                    date={date}
                    dayNumber={index + 1}
                    showDayNumber={showDayNumbers}
                    onToggleDayDisplay={() =>
                      setShowDayNumbers((current) => !current)
                    }
                    events={eventsByDay.get(date) ?? []}
                    eventsLoading={false}
                    itineraryId={itinerary._id}
                    startDate={itinerary.startDate}
                    endDate={itinerary.endDate}
                    readOnly
                  />
                )}
              </div>
            ))}
          {personalNotes && (
            <details className="mt-10">
              <summary
                data-cy="personal-notes-toggle"
                className="cursor-pointer rounded-sm text-label text-on-surface-variant focus-visible:outline-2 focus-visible:outline-primary"
              >
                Personal notes
              </summary>
              <div className="mt-4">{personalNotes}</div>
            </details>
          )}
        </section>
        <DesktopItineraryMap
          events={eventsByTime}
          activeDate={activeDate}
          startDate={itinerary.startDate}
          loading={eventsLoading}
        />
      </div>
    </section>
  );
};

export default TripReadingView;
