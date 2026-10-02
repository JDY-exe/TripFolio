import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Button, Text } from '../../../components/common';
import { deleteFromApi, patchToApi } from '../../../utils/api';
import { eventsQueryKey, useEvents } from '../../../queries/events';
import { itineraryQueryKey, useItinerary } from '../../../queries/itineraries';
import AddNewEventCard from './AddNewEventCard';
import EventCard from './EventCard';
import type { EventData } from '../../../queries/events';

/** Loads and displays the trip itinerary, its editable details, and event cards.
 * @returns The itinerary heading, description, and chronological event list.
 */
const ItineraryView = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { itinerary, isPending, isError, refetch } = useItinerary(id);
  const { events = [] } = useEvents(itinerary?._id);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [eventBeingEdited, setEventBeingEdited] = useState<EventData | null>(
    null,
  );

  useEffect(() => {
    if (!itinerary) return;
    setEditTitle(itinerary.title);
    setEditDescription(itinerary.description);
  }, [itinerary]);

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

  /** Saves edited itinerary title and description.
   * @returns A promise that settles after the update request.
   */
  const handleSave = async () => {
    if (!itinerary) return;
    try {
      const updated = await patchToApi<typeof itinerary>(
        `/itinerary/${itinerary._id}`,
        { title: editTitle, description: editDescription },
      );
      queryClient.setQueryData(itineraryQueryKey(id), updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update itinerary:', error);
    }
  };

  if (!id) return <div className="p-4 text-on-surface">Trip not found.</div>;
  if (isPending)
    return <div className="p-4 text-on-surface">Loading itinerary...</div>;
  if (isError || !itinerary)
    return (
      <div className="flex flex-col items-start gap-3 p-4 text-on-surface">
        <p>Could not load this itinerary.</p>
        <Button size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );

  const startDate = new Date(itinerary.startDate);
  const eventsByTime = [...events].sort(
    (first, second) =>
      new Date(first.startTime).getTime() -
      new Date(second.startTime).getTime(),
  );
  return (
    <>
      <section
        aria-labelledby="itinerary-heading"
        className="min-w-0 text-on-surface"
      >
        <header className="mb-6">
          <Text as="h2" id="itinerary-heading" variant="title">
            Itinerary
          </Text>
        </header>
        <div className="mb-7 flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container"
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              {startDate.toLocaleDateString('en-US', {
                timeZone: 'UTC',
                month: 'short',
              })}
            </span>
            <span className="mt-0.5 text-4xl leading-none tracking-tight">
              {startDate.toLocaleDateString('en-US', {
                timeZone: 'UTC',
                day: '2-digit',
              })}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-title">
              {startDate.toLocaleDateString('en-US', {
                timeZone: 'UTC',
                weekday: 'long',
              })}
            </h3>
            {isEditing ? (
              <div className="mt-2 flex flex-col gap-3">
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="w-full rounded bg-surface-container p-2 text-sm text-on-surface"
                  placeholder="Itinerary title"
                />
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="w-full resize-none rounded bg-surface-container p-2 text-sm text-on-surface"
                  placeholder="Add a description"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    size="sm"
                    leadingIcon={<Check size={16} />}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditTitle(itinerary.title);
                      setEditDescription(itinerary.description);
                      setIsEditing(false);
                    }}
                    variant="ghost"
                    size="sm"
                    leadingIcon={<X size={16} />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <div className="group flex items-center gap-2">
                  <p className="font-medium">{itinerary.title}</p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-on-surface-variant opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                    aria-label="Edit title"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="group relative mt-4 rounded-panel bg-surface-container-low p-5 pr-10 text-sm text-on-surface-variant">
                  <p
                    className={itinerary.description ? '' : 'italic opacity-70'}
                  >
                    {itinerary.description || 'No description provided.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="absolute right-3 top-3 text-on-surface-variant opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                    aria-label="Edit description"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {eventsByTime.length ? (
          <div className="mt-8 mb-4 flex flex-col gap-4">
            {eventsByTime.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onEdit={setEventBeingEdited}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        ) : null}
        {eventBeingEdited ? (
          <AddNewEventCard
            key={eventBeingEdited._id}
            itineraryId={itinerary._id}
            startDate={itinerary.startDate}
            endDate={itinerary.endDate}
            event={eventBeingEdited}
            onClose={() => setEventBeingEdited(null)}
            onCreated={() =>
              void queryClient.invalidateQueries({
                queryKey: eventsQueryKey(itinerary._id),
              })
            }
          />
        ) : null}
        {!isEditing ? (
          <AddNewEventCard
            itineraryId={itinerary._id}
            startDate={itinerary.startDate}
            endDate={itinerary.endDate}
            onCreated={() =>
              void queryClient.invalidateQueries({
                queryKey: eventsQueryKey(itinerary._id),
              })
            }
          />
        ) : null}
      </section>
      <aside className="rounded-panel bg-surface-container p-8 text-on-surface">
        <Text as="h2" variant="title">
          Trip overview
        </Text>
        <Text color="muted" className="mt-2">
          Dates, travelers, and key details coming soon.
        </Text>
      </aside>
    </>
  );
};

export default ItineraryView;
