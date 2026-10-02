import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Modal, TextField } from '../../../components/common';
import { patchToApi, postToApi } from '../../../utils/api';
import type { EventData } from '../../../queries/events';

interface AddNewEventCardProps {
  itineraryId: string;
  startDate: string;
  endDate: string;
  onCreated: (event: EventData) => void;
  event?: EventData;
  onClose?: () => void;
}

/** Opens a modal for entering an event and reports its saved record to the itinerary.
 * @param props - Trip dates, itinerary identifier, and save callback.
 * @returns The add-event card and its controlled creation modal.
 */
const AddNewEventCard = ({
  itineraryId,
  startDate,
  endDate,
  onCreated,
  event,
  onClose,
}: AddNewEventCardProps) => {
  const [isOpen, setIsOpen] = useState(Boolean(event));
  const [title, setTitle] = useState(event?.title ?? '');
  const [address, setAddress] = useState(event?.address ?? '');
  const [startTime, setStartTime] = useState(
    event ? new Date(event.startTime).toISOString().slice(0, 16) : '',
  );
  const [finishTime, setFinishTime] = useState(
    event ? new Date(event.endTime).toISOString().slice(0, 16) : '',
  );
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /** Validates the event dates and creates the event through the API.
   * @returns A promise that settles after saving.
   */
  const saveEvent = async () => {
    const start = new Date(`${startTime}Z`);
    const end = new Date(`${finishTime}Z`);
    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    tripEnd.setUTCHours(23, 59, 59, 999);
    if (!title.trim() || !startTime || !finishTime) {
      setError('Add a title and both event times.');
      return;
    }
    if (end < start) {
      setError('End time cannot be before start time.');
      return;
    }
    if (start < tripStart || end > tripEnd) {
      setError("Event must occur within the trip's duration.");
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        title,
        address,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes,
      };
      const savedEvent = event
        ? await patchToApi<EventData>(`/event/${event._id}`, payload)
        : await postToApi<EventData>('/event', {
            itineraryID: itineraryId,
            ...payload,
          });
      onCreated(savedEvent);
      setIsOpen(false);
      onClose?.();
      setTitle('');
      setAddress('');
      setStartTime('');
      setFinishTime('');
      setNotes('');
    } catch {
      setError('Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {event ? null : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-dashed border-outline-variant bg-transparent py-4 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
        >
          <Plus size={20} />
          <span className="font-medium">Add Event</span>
        </button>
      )}
      <Modal
        open={isOpen}
        title={event ? 'Edit Event' : 'Add an Event'}
        onClose={() => {
          if (!isSaving) {
            setIsOpen(false);
            onClose?.();
          }
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
                onClose?.();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveEvent} disabled={isSaving}>
              {event ? 'Save Changes' : 'Save Event'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <TextField
            id="event-title"
            label="Event title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <TextField
            id="event-address"
            label="Location"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="event-start"
              label="Start time"
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
            <TextField
              id="event-end"
              label="End time"
              type="datetime-local"
              value={finishTime}
              onChange={(event) => setFinishTime(event.target.value)}
              required
            />
          </div>
          <label
            className="grid gap-2 text-sm font-medium"
            htmlFor="event-notes"
          >
            Notes
            <textarea
              id="event-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="resize-none rounded bg-surface-container p-3 text-on-surface"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
};

export default AddNewEventCard;
