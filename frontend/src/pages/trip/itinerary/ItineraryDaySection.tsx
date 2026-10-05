import { useState } from 'react';
import { Skeleton, Text } from '../../../components/common';
import type { EventData } from '../../../queries/events';
import AddNewEventCard from './AddNewEventCard';
import EventCard from './EventCard';
import EventSkeletonCard from './EventSkeletonCard';

interface ItineraryDaySectionProps {
  date: string;
  dayNumber: number;
  showDayNumber: boolean;
  onToggleDayDisplay: () => void;
  events: EventData[];
  eventsLoading: boolean;
  itineraryId: string;
  startDate: string;
  endDate: string;
  onDeleteEvent?: (event: EventData) => void;
  onEventSaved?: () => void;
  readOnly?: boolean;
}

/** Displays one trip day, its events, and controls for adding or editing them.
 * @param props - The day's date, events, trip bounds, and event actions.
 * @returns A complete day section in the itinerary.
 */
const ItineraryDaySection = ({
  date,
  dayNumber,
  showDayNumber,
  onToggleDayDisplay,
  events,
  eventsLoading,
  itineraryId,
  startDate,
  endDate,
  onDeleteEvent,
  onEventSaved,
  readOnly = false,
}: ItineraryDaySectionProps) => {
  const [eventBeingEdited, setEventBeingEdited] = useState<EventData | null>(
    null,
  );
  const day = new Date(`${date}T00:00:00Z`);
  const month = day.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
  });
  const weekday = day.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
  });

  return (
    <section
      aria-label={`${weekday}, ${month} ${day.getUTCDate()}`}
      className="mb-8 border-b border-outline-variant/40 pb-8 last:mb-0 last:border-b-0 last:pb-0"
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          aria-label={
            showDayNumber
              ? `Show date for day ${dayNumber}`
              : `Show day number for ${weekday}, ${month} ${day.getUTCDate()}`
          }
          aria-pressed={showDayNumber}
          onClick={onToggleDayDisplay}
          className="flex h-20 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="text-xs font-medium uppercase tracking-wider">
            {showDayNumber ? 'Day' : month}
          </span>
          <span className="mt-0.5 text-3xl leading-none tracking-tight">
            {showDayNumber
              ? dayNumber
              : String(day.getUTCDate()).padStart(2, '0')}
          </span>
        </button>
        <div className="min-w-0 pt-1">
          <Text as="h3" variant="title">
            {weekday}
          </Text>
          {eventsLoading ? (
            <Skeleton className="mt-2 h-3 w-16" />
          ) : (
            <Text color="muted" variant="caption" className="mt-1">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </Text>
          )}
        </div>
      </div>
      {eventsLoading ? (
        <div className="mt-6">
          <EventSkeletonCard />
        </div>
      ) : events.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onEdit={readOnly ? undefined : setEventBeingEdited}
              onDelete={onDeleteEvent}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : null}
      {!readOnly && eventBeingEdited ? (
        <AddNewEventCard
          key={eventBeingEdited._id}
          itineraryId={itineraryId}
          startDate={startDate}
          endDate={endDate}
          date={date}
          event={eventBeingEdited}
          onClose={() => setEventBeingEdited(null)}
          onCreated={() => onEventSaved?.()}
        />
      ) : null}
      {!readOnly && !eventsLoading ? (
        <AddNewEventCard
          itineraryId={itineraryId}
          startDate={startDate}
          endDate={endDate}
          date={date}
          onCreated={() => onEventSaved?.()}
        />
      ) : null}
    </section>
  );
};

export default ItineraryDaySection;
