import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { deleteFromApi, getApiErrorMessage } from '../../../utils/api';
import { eventsQueryKey, useEvents } from '../../../queries/events';
import { useTrips } from '../../../queries/trips';
import { useItinerary } from '../../../queries/itineraries';
import ItineraryDaySection from './ItineraryDaySection';
import ItineraryDescription from './ItineraryDescription';
import ArchivedItineraryNotes from './ArchivedItineraryNotes';
import TripOverview from './TripOverview';
import ItineraryMap from './map/ItineraryMap';
import { useActiveItineraryDay } from './map/useActiveItineraryDay';
import AddNewEventCard from './AddNewEventCard';
import type { EventData } from '../../../queries/events';
import ErrorDisplay from '../../../components/common/ErrorDisplay/ErrorDisplay';
import { getItineraryDays } from './itineraryDays';
import ArchivedTripShare from './ArchivedTripShare';
import { ArrowDown, ArrowUp } from 'lucide-react';

/** Loads and displays the trip itinerary and event cards.
 * @param props - Read-only permissions and whether to load archived trip metadata.
 * @returns The itinerary date, chronological event list, and sidebar details.
 */
const ItineraryView = ({
  readOnly = false,
  archived = false,
  canShareArchived = false,
}: {
  readOnly?: boolean;
  archived?: boolean;
  canShareArchived?: boolean;
}) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    trips,
    isPending: tripsLoading,
    isError: tripsError,
  } = useTrips(user?.id, archived);
  const { itinerary, isError, refetch } = useItinerary(id);
  const {
    events = [],
    isPending: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(itinerary?._id);
  const [showDayNumbers, setShowDayNumbers] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [mapEventBeingEdited, setMapEventBeingEdited] =
    useState<EventData | null>(null);
  const itineraryColumn = useRef<HTMLElement>(null);
  const activeDate = useActiveItineraryDay(
    itineraryColumn,
    itinerary?.startDate.slice(0, 10),
  );
  const days = useMemo(() => {
    return itinerary ? getItineraryDays(itinerary.startDate, itinerary.endDate) : [];
  }, [itinerary?.startDate, itinerary?.endDate]);
  // Dynamic Jump Pill Logic
  const [pillState, setPillState] = useState({
    show: false,
    position: 'bottom', // 'top' | 'bottom'
    label: 'Today',
    icon: 'down', // 'up' | 'down'
    targetDayNumber: 1
  });
  // Track the exact screen coordinates of the column
  const [columnRect, setColumnRect] = useState({ left: 0, width: 0 });

  useEffect(() => {
    let isMounted = true;

    const updateColumnPosition = () => {
      if (isMounted && itineraryColumn.current) {
        const rect = itineraryColumn.current.getBoundingClientRect();
        
        // Update state if the values actually changed to prevent infinite loops
        setColumnRect((prev) => 
          prev.left === rect.left && prev.width === rect.width 
            ? prev 
            : { left: rect.left, width: rect.width }
        );
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateColumnPosition();
    });

    if (itineraryColumn.current) {
      resizeObserver.observe(itineraryColumn.current);
    }
    
    updateColumnPosition();

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
    };
  }, [days]);

  useEffect(() => {
    const handleScroll = () => {
      if (!days || days.length === 0) return;
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayIndex = days.indexOf(todayStr);

      let newState = { show: true, position: 'bottom', label: 'Today', icon: 'down', targetDayNumber: 1 };

      if (todayIndex !== -1) {
        // Active Trip: Target is today's index
        newState.targetDayNumber = todayIndex + 1;
        const todayElement = document.getElementById(`day-${newState.targetDayNumber}`);
        
        if (todayElement) {
          const rect = todayElement.getBoundingClientRect();
          
          if (rect.top > window.innerHeight - 100) {
            // Today is below the current viewport
            newState.position = 'bottom';
            newState.icon = 'down';
          } else if (rect.bottom < 100) {
            // Today is above the current viewport
            newState.position = 'top';
            newState.icon = 'up';
          } else {
            // Today is currently visible on screen
            newState.show = false;
          }
        }
      } else {
        // Past/Future Trip: Target is Top or Bottom
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const isScrolledPastHalf = maxScroll > 0 && (scrollY / maxScroll) > 0.5;

        if (isScrolledPastHalf) {
          // Scrolled past halfway, point back to the top
          newState.position = 'top';
          newState.icon = 'up';
          newState.label = 'Top';
          newState.targetDayNumber = 1;
          
          // Phase out if we are already at the absolute top
          if (scrollY < 100) newState.show = false;
        } else {
          // Scrolled near the top, point to the bottom
          newState.position = 'bottom';
          newState.icon = 'down';
          newState.label = 'Bottom';
          newState.targetDayNumber = days.length;
          
          // Phase out if we are already at the absolute bottom
          if (maxScroll > 0 && scrollY > maxScroll - 100) newState.show = false;
        }
      }

      // Update state only if values changed to prevent unnecessary re-renders
      setPillState(prev => 
        prev.show !== newState.show || 
        prev.position !== newState.position || 
        prev.label !== newState.label || 
        prev.icon !== newState.icon ||
        prev.targetDayNumber !== newState.targetDayNumber 
          ? newState : prev
      );
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check immediately on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, [days]);

  const handleJumpClick = () => {
    const targetElement = document.getElementById(`day-${pillState.targetDayNumber}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  

  /** Removes the confirmed event and refreshes the itinerary list.
   * @returns A promise that settles when deletion completes.
   */
  const handleDeleteEvent = async () => {
    if (readOnly || !eventToDelete || isDeletingEvent) return;
    setIsDeletingEvent(true);
    try {
      await deleteFromApi(`/event/${eventToDelete._id}`, {
        data: { expectedVersion: eventToDelete.version },
      });
      await queryClient.invalidateQueries({
        queryKey: eventsQueryKey(itinerary?._id ?? ''),
      });
      await queryClient.invalidateQueries({ queryKey: ['reservation-events'] });
      setDeleteModalOpen(false);
    } catch (error) {
      setDeleteModalOpen(false);
      await queryClient.invalidateQueries({
        queryKey: eventsQueryKey(itinerary?._id),
      });
      displayAlert({
        message: getApiErrorMessage(error, 'Could not delete the event.'),
        tone: 'error',
      });
    } finally {
      setIsDeletingEvent(false);
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

  const trip = trips.find((trip) => trip._id === id);
  const tripName = trip?.name;
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
        {/* Column-Constrained Dynamic Contextual Pill */}
        {!readOnly && pillState.show && columnRect.width > 0 && (
          <div 
            className="fixed z-50 flex justify-center pointer-events-none transition-all duration-300"
            style={{ 
              left: `${columnRect.left}px`, 
              width: `${columnRect.width}px`,
              // Adjust '3rem' (top) or '9rem' (bottom) here if you want to tweak the fixed height
              top: pillState.position === 'top' ? '2rem' : 'calc(100dvh - 8rem)' 
            }}
          >
            <button
              onClick={handleJumpClick}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary/90 px-4 py-2 text-sm font-medium text-on-primary shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition-transform hover:scale-105 hover:bg-primary"
            >
              {pillState.icon === 'up' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              <span>{pillState.label}</span>
            </button>
          </div>
        )}
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <Text
            as="h2"
            data-cy="trip-section-itinerary"
            id="itinerary-heading"
            variant="display"
          >
            {archived ? 'Archived Itinerary' : 'Itinerary'}
          </Text>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {tripName && (
              <Text as="span" variant="display" className="min-w-0 break-words">
                {tripName}
              </Text>
            )}
            {canShareArchived && (
              <ArchivedTripShare
                tripId={id}
                memberIds={[
                  ...(trip?.users ?? []),
                  ...(trip?.ownerId ? [trip.ownerId] : []),
                ]}
              />
            )}
          </div>
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
            <div key={date} id={`day-${index + 1}`}>
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
                readOnly={readOnly}
                itineraryId={itinerary._id}
                startDate={itinerary.startDate}
                endDate={itinerary.endDate}
                onDeleteEvent={(event) => {
                  setEventToDelete(event);
                  setDeleteModalOpen(true);
                }}
                onEventSaved={() =>
                  void queryClient.invalidateQueries({
                    queryKey: eventsQueryKey(itinerary._id),
                  })
                }
              />
            </div>
          ))}
      </section>
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <ItineraryDescription
          itinerary={itinerary}
          tripId={id}
          readOnly={readOnly}
        />
        {archived && user?.id && (
          <ArchivedItineraryNotes
            key={`${user.id}-${id}`}
            tripId={id}
            userId={user.id}
          />
        )}
        <TripOverview
          startDate={trip?.startDate ?? itinerary.startDate}
          endDate={trip?.endDate ?? itinerary.endDate}
          travelers={trip?.travelers}
          travelersLoading={tripsLoading}
          travelersError={tripsError}
        />
        <ItineraryMap
          key={itinerary._id}
          events={eventsByTime}
          activeDate={activeDate}
          startDate={itinerary.startDate}
          loading={eventsLoading}
          readOnly={readOnly}
          onEdit={setMapEventBeingEdited}
          onDelete={(event) => {
            setEventToDelete(event);
            setDeleteModalOpen(true);
          }}
        />
      </aside>
      {!readOnly && mapEventBeingEdited && (
        <AddNewEventCard
          key={mapEventBeingEdited._id}
          event={mapEventBeingEdited}
          itineraryId={itinerary._id}
          startDate={itinerary.startDate}
          endDate={itinerary.endDate}
          date={mapEventBeingEdited.startTime.slice(0, 10)}
          onClose={() => setMapEventBeingEdited(null)}
          onCreated={() =>
            void queryClient.invalidateQueries({
              queryKey: eventsQueryKey(itinerary._id),
            })
          }
        />
      )}
      {!readOnly && eventToDelete && (
        <Modal
          data-cy="delete-event-dialog"
          open={deleteModalOpen}
          title={`${eventToDelete.reservation ? 'Remove' : 'Delete'} ${eventToDelete.title}?`}
          onClose={() => {
            if (!isDeletingEvent) setEventToDelete(null);
          }}
          onExited={() => setEventToDelete(null)}
          dismissDisabled={isDeletingEvent}
          footer={(requestClose) => (
            <>
              <Button
                data-cy="delete-event-cancel"
                variant="secondary"
                disabled={isDeletingEvent}
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button
                data-cy="delete-event-confirm"
                variant="danger"
                disabled={isDeletingEvent}
                onClick={() => void handleDeleteEvent()}
              >
                {isDeletingEvent ? 'Removing...' : 'Remove from itinerary'}
              </Button>
            </>
          )}
        >
          <Text>
            This event will be removed from your itinerary.
            {eventToDelete.reservation &&
              ' The reservation will remain in Logistics.'}
          </Text>
        </Modal>
      )}
    </>
  );
};

export default ItineraryView;
