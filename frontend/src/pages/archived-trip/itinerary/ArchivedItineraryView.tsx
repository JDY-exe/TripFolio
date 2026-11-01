import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { eventsQueryKey, useEvents } from '../../../queries/events';
import { useTrips } from '../../../queries/trips';
import { useItinerary } from '../../../queries/itineraries';
import ItineraryDaySection from './ItineraryDaySection';
import ItineraryDescription from './ItineraryDescription';
import TripOverview from './TripOverview';

import { useActiveItineraryDay } from './map/useActiveItineraryDay';
import type { EventData } from '../../../queries/events';
import ErrorDisplay from '../../../components/common/ErrorDisplay/ErrorDisplay';
import { getItineraryDays } from './itineraryDays';

/** Loads and displays the trip itinerary and event cards.
 * @returns The itinerary date, chronological event list, and sidebar details.
 */
const ItineraryView = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    trips,
    isPending: tripsLoading,
    isError: tripsError,
  } = useTrips(user?.id);
  const { itinerary, isError, refetch } = useItinerary(id);
  const {
    events = [],
    isPending: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(itinerary?._id);
  const [showDayNumbers, setShowDayNumbers] = useState(false);
  const itineraryColumn = useRef<HTMLElement>(null);
  const activeDate = useActiveItineraryDay(
    itineraryColumn,
    itinerary?.startDate.slice(0, 10),
  );


  if (!id)
    return (
      <div className="col-span-full flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center gap-6 text-center">
        <ErrorDisplay message="Itinerary not found." />
      </div>
    );
  if (!itinerary && !isError) return null;
  if (isError || !itinerary)
    return (
      <div className="col-span-full flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center gap-6 text-center">
        <ErrorDisplay message="Could not load this itinerary." />
        <Button size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );

  const trip = trips.find((trip) => trip._id === id);
  const tripName = trip?.name;
  const days = getItineraryDays(itinerary.startDate, itinerary.endDate);
  const eventsByTime = [...events].sort(
    (first, second) =>
      new Date(first.startTime).getTime() -
      new Date(second.startTime).getTime(),
  );
  const eventsByDay = new Map<string, EventData[]>();
  for (const event of eventsByTime) {
    const date = new Date(event.startTime).toISOString().slice(0, 10);
    const dayEvents = eventsByDay.get(date) ?? [];
    dayEvents.push(event);
    eventsByDay.set(date, dayEvents);
  }
  return (
    <>
      <section
        ref={itineraryColumn}
        aria-labelledby="itinerary-heading"
        className="min-w-0 text-on-surface"
      >
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Text
            as="h2"
            data-cy="trip-section-itinerary"
            id="itinerary-heading"
            variant="display"
          >
            Archived Itinerary
          </Text>
          {tripName && (
            <Text as="span" variant="display" className="min-w-0 break-words">
              {tripName}
            </Text>
          )}
        </header>
        {eventsError && events.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-panel bg-surface-container-low p-8 text-center">
            <ErrorDisplay message="Could not load itinerary events." />
            <Button size="sm" onClick={() => void refetchEvents()}>
              Retry
            </Button>
          </div>
        )}
        {!(eventsError && events.length === 0) &&
          days.map((date, index) => (
            <ItineraryDaySection
              key={date}
              date={date}
              dayNumber={index + 1}
              showDayNumber={showDayNumbers}
              onToggleDayDisplay={() =>
                setShowDayNumbers((current) => !current)
              }
              events={eventsByDay.get(date) ?? []}
              eventsLoading={eventsLoading}
              itineraryId={itinerary._id}
              startDate={itinerary.startDate}
              endDate={itinerary.endDate}
            />
          ))}
      </section>
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <ItineraryDescription itinerary={itinerary} tripId={id} />
        <TripOverview
          startDate={trip?.startDate ?? itinerary.startDate}
          endDate={trip?.endDate ?? itinerary.endDate}
          travelers={trip?.travelers}
          travelersLoading={tripsLoading}
          travelersError={tripsError}
        />
      </aside>
    </>
  );
};

export default ItineraryView;
