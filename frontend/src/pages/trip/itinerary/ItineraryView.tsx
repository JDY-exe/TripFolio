import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, Text } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { deleteFromApi } from '../../../utils/api';
import { eventsQueryKey, useEvents } from '../../../queries/events';
import { useTrips } from '../../../queries/trips';
import { useItinerary } from '../../../queries/itineraries';
import ItineraryDaySection from './ItineraryDaySection';
import ItineraryDescription from './ItineraryDescription';
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
  const { trips } = useTrips(user?.id);
  const { itinerary, isError, refetch } = useItinerary(id);
  const {
    events = [],
    isPending: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(itinerary?._id);
  const [showDayNumbers, setShowDayNumbers] = useState(false);

  /** Removes an event from the API and the current itinerary list.
   * @param eventId - Identifier of the event to remove.
   * @returns A promise that settles when deletion completes.
   */
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteFromApi(`/event/${eventId}`);
      await queryClient.invalidateQueries({
        queryKey: eventsQueryKey(itinerary?._id ?? ''),
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

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

  const tripName = trips.find((trip) => trip._id === id)?.name;
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
        aria-labelledby="itinerary-heading"
        className="min-w-0 text-on-surface"
      >
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Text as="h2" id="itinerary-heading" variant="display">
            Itinerary
          </Text>
          {tripName ? (
            <Text as="span" variant="display" className="min-w-0 break-words">
              {tripName}
            </Text>
          ) : null}
        </header>
        {eventsError && events.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-panel bg-surface-container-low p-8 text-center">
            <ErrorDisplay message="Could not load itinerary events." />
            <Button size="sm" onClick={() => void refetchEvents()}>
              Retry
            </Button>
          </div>
        ) : (
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
              onDeleteEvent={handleDeleteEvent}
              onEventSaved={() =>
                void queryClient.invalidateQueries({
                  queryKey: eventsQueryKey(itinerary._id),
                })
              }
            />
          ))
        )}
      </section>
      <aside className="flex min-w-0 flex-col gap-5">
        <ItineraryDescription itinerary={itinerary} tripId={id} />
        <section className="rounded-panel bg-surface-container p-8 text-on-surface">
          <Text as="h2" variant="title">
            Trip overview
          </Text>
          <Text color="muted" className="mt-2">
            Dates, travelers, and key details coming soon.
          </Text>
        </section>
      </aside>
    </>
  );
};

export default ItineraryView;
