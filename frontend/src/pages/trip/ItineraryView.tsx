import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button, Text } from '../../components/common';
import { postToApi, getFromApi, patchToApi, deleteFromApi } from '../../utils/api';

interface ItineraryData {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface EventData {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

// Helper function that formats ISO UTC strings for HTML datetime-local inputs
const formatForInput = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 16);
}

/**
 * Displays a single sample walking event on a static day timeline.
 * An arched date, scalloped activity marker, and asymmetric card borrow MD3's
 * expressive shapes while using the app's semantic colors and native elements.
 *
 * @returns A presentation-only itinerary with inactive event actions.
 */
function ItineraryView() {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);

  // null = closed, NEW = creating, <id> = editing
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [eventError, setEventError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getFromApi<ItineraryData>(`/itinerary?id=${id}`)
        .then((data) => {
          setItinerary(data);
          setEditTitle(data.title);
          setEditDescription(data.description);

          // Fetch all events linked to this itinerary
          return getFromApi<EventData[]>(`/event?itinerary_id=${data._id}`);
        })
        .then((eventData) => setEvents(eventData || []))
        .catch(console.error);
    }
  }, [id]);
  
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteFromApi(`/event/${eventId}`);
      setEvents(events.filter((e) => e._id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const openCreateForm = () => {
    if (!itinerary) return;
    setActiveEventId('NEW');
    setEventError(null);
    const defaultTime = formatForInput(itinerary.startDate);
    setEventForm({
      title: '',
      startTime: defaultTime,
      endTime: defaultTime,
      notes: '',
    });
  };

  const openEditForm = (event: EventData) => {
    setActiveEventId(event._id);
    setEventError(null);
    setEventForm({
      title: event.title,
      startTime: formatForInput(event.startTime),
      endTime: formatForInput(event.endTime),
      notes: event.notes || '',
    });
  };

  const closeForm = () => {
    setActiveEventId(null);
    setEventError(null);
  }

  const handleSaveEvent = async () => {
    if (!itinerary || !activeEventId) return;
    try {
      setEventError(null);

      const startObj = new Date(eventForm.startTime + 'Z');
      const endObj = new Date(eventForm.endTime + 'Z');

      if (endObj < startObj) {
        setEventError("End time cannot be before start time.");
        return;
      }

      const tripStart = new Date(itinerary.startDate);
      const tripEnd = new Date(itinerary.endDate);
      tripEnd.setUTCHours(23, 59, 59, 999);

      if (startObj < tripStart || endObj > tripEnd) {
        setEventError("Event must occur within trip's duration.");
        return;
      }

      const startTimeUTC = startObj.toISOString();
      const endTimeUTC = endObj.toISOString();
      
      if (activeEventId == 'NEW') {
        // POST
        const newEvent = await postToApi<EventData>('/event', {
          itineraryID: itinerary._id,
          title: eventForm.title || "New Event",
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          notes: eventForm.notes,
        });
        setEvents([...events, newEvent]);
      } else {
        // PATCH
        await patchToApi<EventData>(`/event/${activeEventId}`, {
          title: eventForm.title,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          notes: eventForm.notes,
        });

        setEvents(events.map((e) => (e._id === activeEventId ? {
          ...e,
          title: eventForm.title,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          notes: eventForm.notes
        } : e)));
      }

      closeForm();
    } catch (error) {
      console.error('Failed to update event:', error);
      setEventError('Failed to save event. Please try again.')
    }
  };

  const handleSave = async () => {
    if (!itinerary) return;
    try {
      const updated = await patchToApi<ItineraryData>(`/itinerary/${itinerary._id}`, {
        title: editTitle,
        description: editDescription,
      });
      setItinerary(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update itinerary:', error)
    }
  }

  const handleCancel = () => {
    if (itinerary) {
      setEditTitle(itinerary.title);
      setEditDescription(itinerary.description);
    }
    setIsEditing(false);
  };

  if (!itinerary) {
    return <div className="p-4 text-on-surface">Loading itinerary...</div>;
  }

  const startDate = new Date(itinerary.startDate);
  const month = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
  const day = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit' });
  const weekday = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });

  return (
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
            {month}
          </span>
          <span className="mt-0.5 text-4xl leading-none tracking-tight">
            {day}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-title">
            <time dateTime={itinerary.startDate}>
              {weekday}
            </time>
          </h3>
          
          {isEditing ? (
            <div className="mt-2 flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                placeholder="Itinerary Title"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full resize-none rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                placeholder="Add a description for this itinerary..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" leadingIcon={<Check size={16} />}>Save</Button>
                <Button onClick={handleCancel} variant="ghost" size="sm" leadingIcon={<X size={16} />}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              {/* Hoverable Title with Pencil */}
              <div className="group flex items-center gap-2">
                <p className="font-medium text-on-surface">{itinerary.title}</p>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="text-on-surface-variant opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  aria-label="Edit title"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Hoverable Description with Pencil */}
              <div className="group relative mt-4 rounded-panel bg-surface-container-low p-5 pr-10 text-sm text-on-surface-variant">
                {itinerary.description ? (
                  <p>{itinerary.description}</p>
                ) : (
                  <p className="italic opacity-70">No description provided.</p>
                )}
                <button 
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

      {/* Event List Render */}
      {events.length > 0 && (
        <div className="mt-8 mb-4 flex flex-col gap-4">
          {events.map((event) => (
            <div key={event._id} className="group relative flex flex-col gap-2 rounded-panel bg-surface-container-low p-4 shadow-sm border border-outline-variant">
              {activeEventId === event._id ? (
                <div className="flex w-full flex-col gap-3">
                  <input
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Event Title"
                    className="w-full rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                  />
                  <div className="flex gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-xs text-on-surface-variant">Start Time</label>
                      <input
                        type="datetime-local"
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                        className="rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-xs text-on-surface-variant">End Time</label>
                      <input
                        type="datetime-local"
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                        className="rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                      />
                    </div>
                  </div>
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={2}
                    className="resize-none rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                  />
                  {/* Error Display */}
                  {eventError && (
                    <p className="text-sm font-medium text-error mt-1">{eventError}</p>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <Button onClick={() => handleSaveEvent()} size="sm" leadingIcon={<Check size={16} />}>Save</Button>
                    <Button onClick={() => { closeForm(); setEventError(null); }} variant="ghost" size="sm" leadingIcon={<X size={16} />}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-on-surface">{event.title}</h4>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                      {' - '}
                      {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                    </p>
                    {event.notes && (
                      <p className="text-sm text-on-surface-variant mt-2 border-l-2 border-outline-variant pl-3 italic">
                        {event.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEditForm(event)}
                      className="text-on-surface-variant hover:text-primary"
                      aria-label="Edit event"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      className="text-on-surface-variant hover:text-error"
                      aria-label="Delete event"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Add Event Section */}
      {!isEditing && (
        <div className="mt-6">
          {activeEventId === 'NEW' ? (
            <div className="flex w-full flex-col gap-3 rounded-panel bg-surface-container-low p-4 shadow-sm border-2 border-primary">
              <h4 className="text-sm font-bold text-primary mb-1">Create New Event</h4>
              
              {/* Note: This is the exact same inputs as your edit form! */}
              <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event Title" className="w-full rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary" autoFocus />
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-on-surface-variant">Start Time</label>
                  <input type="datetime-local" value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} className="rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-on-surface-variant">End Time</label>
                  <input type="datetime-local" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} className="rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary" />
                </div>
              </div>
              <textarea value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} placeholder="Add notes..." rows={2} className="resize-none rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary" />
              
              {eventError && <p className="text-sm font-medium text-error mt-1">{eventError}</p>}
              
              <div className="flex justify-end gap-2 mt-2">
                <Button onClick={handleSaveEvent} size="sm" leadingIcon={<Check size={16} />}>Save Event</Button>
                <Button onClick={closeForm} variant="ghost" size="sm" leadingIcon={<X size={16} />}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button onClick={openCreateForm} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-dashed border-outline-variant bg-transparent py-4 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary">
              <Plus size={20} />
              <span className="font-medium">Add Event</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default ItineraryView;
