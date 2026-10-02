import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Modal, TextArea, TextField } from '../../../components/common';
import { patchToApi, postToApi } from '../../../utils/api';
import type { EventData } from '../../../queries/events';

interface AddNewEventCardProps {
  itineraryId: string;
  startDate: string;
  endDate: string;
  date: string;
  onCreated: (event: EventData) => void;
  event?: EventData;
  onClose?: () => void;
}

interface EventDraft {
  title: string;
  address: string;
  startTime: string;
  finishTime: string;
  notes: string;
}

/**
 * Creates editable event values from an existing event or empty fields.
 * @param date - The selected itinerary day for a new event.
 * @param event - The event being edited, when present.
 * @returns Values suitable for the event form inputs.
 */
const createEventDraft = (date: string, event?: EventData): EventDraft => ({
  title: event?.title ?? '',
  address: event?.address ?? '',
  startTime: event
    ? new Date(event.startTime).toISOString().slice(0, 16)
    : `${date}T09:00`,
  finishTime: event
    ? new Date(event.endTime).toISOString().slice(0, 16)
    : `${date}T10:00`,
  notes: event?.notes ?? '',
});

/** Opens a modal for entering an event and reports its saved record to the itinerary.
 * @param props - Selected day, trip dates, itinerary identifier, and save callback.
 * @returns The add-event card and its controlled creation modal.
 */
const AddNewEventCard = ({
  itineraryId,
  startDate,
  endDate,
  date,
  onCreated,
  event,
  onClose,
}: AddNewEventCardProps) => {
  const [isOpen, setIsOpen] = useState(Boolean(event));
  const [draft, setDraft] = useState<EventDraft>(() =>
    createEventDraft(date, event),
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Merges changed event fields into the current draft.
   * @param changes - Fields changed by the form input.
   * @returns Nothing.
   */
  const updateDraft = (changes: Partial<EventDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  /** Validates the event dates and creates the event through the API.
   * @returns A promise that settles after saving.
   */
  const saveEvent = async () => {
    const start = new Date(`${draft.startTime}Z`);
    const end = new Date(`${draft.finishTime}Z`);
    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    tripEnd.setUTCHours(23, 59, 59, 999);
    if (!draft.title.trim() || !draft.startTime || !draft.finishTime) {
      setError('Add a title and both event times.');
      return;
    }
    if (end < start) {
      setError('End time cannot be before start time.');
      return;
    }
    if (
      !event &&
      (draft.startTime.slice(0, 10) !== date ||
        draft.finishTime.slice(0, 10) !== date)
    ) {
      setError('Choose times on the selected day.');
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
        title: draft.title,
        address: draft.address,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: draft.notes,
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
      setDraft(createEventDraft(date));
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
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-transparent py-4 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
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
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
            required
          />
          <TextField
            id="event-address"
            label="Location"
            value={draft.address}
            onChange={(event) => updateDraft({ address: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="event-start"
              label="Start time"
              type="datetime-local"
              value={draft.startTime}
              min={event ? undefined : `${date}T00:00`}
              max={event ? undefined : `${date}T23:59`}
              onChange={(event) =>
                updateDraft({ startTime: event.target.value })
              }
              required
            />
            <TextField
              id="event-end"
              label="End time"
              type="datetime-local"
              value={draft.finishTime}
              min={event ? undefined : `${date}T00:00`}
              max={event ? undefined : `${date}T23:59`}
              onChange={(event) =>
                updateDraft({ finishTime: event.target.value })
              }
              required
            />
          </div>
          <label
            className="grid gap-2 text-sm font-medium"
            htmlFor="event-notes"
          >
            Notes
            <TextArea
              id="event-notes"
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              rows={3}
              className="p-3"
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
