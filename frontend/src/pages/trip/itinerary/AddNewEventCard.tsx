import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button, Modal, TextArea, TextField } from '../../../components/common';
import { patchToApi, postToApi, getApiErrorMessage } from '../../../utils/api';
import type { EventData, EventType } from '../../../queries/events';
import { useParams } from 'react-router';
import { eventTypeLabels } from './eventTypeLabels';
import ReservationEventPicker from './ReservationEventPicker';
import { ReservationType } from '../../../queries/reservations';
import AccommodationReservationForm from '../logistics/accommodations/AccommodationReservationForm';
import RentalCarReservationForm from '../logistics/rentals/RentalCarReservationForm';
import FlightReservationForm from '../logistics/flights/FlightReservationForm';
import EventPlaceField from './EventPlaceField';

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
  placeId: string | null;
  startTime: string;
  finishTime: string;
  finishNextDay: boolean;
  notes: string;
  eventType: EventType;
  reservation: string;
  reservationMade: boolean;
  cost: number;
}

/**
 * Creates editable event values from an existing event or empty fields.
 * @param event - The event being edited, when present.
 * @returns Values suitable for the event form inputs.
 */
const createEventDraft = (event?: EventData): EventDraft => ({
  title: event?.title ?? '',
  address: event?.address ?? '',
  placeId: event?.placeId ?? null,
  startTime: event
    ? new Date(event.startTime).toISOString().slice(11, 16)
    : '09:00',
  finishTime: event
    ? new Date(event.endTime).toISOString().slice(11, 16)
    : '10:00',
  finishNextDay: Boolean(
    event && event.endTime.slice(0, 10) > event.startTime.slice(0, 10),
  ),
  notes: event?.notes ?? '',
  eventType: event?.eventType ?? 'activity',
  reservation: event?.reservation ?? '',
  reservationMade: event?.reservationMade ?? false,
  cost: event?.cost ?? 0,
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
  const { id: tripId } = useParams();
  const queryClient = useQueryClient();
  const [eventDate, setEventDate] = useState(date);
  const [bookingAvailable, setBookingAvailable] = useState(false);
  const [creatingType, setCreatingType] = useState<ReservationType | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(Boolean(event));
  const [draft, setDraft] = useState<EventDraft>(() => createEventDraft(event));
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

  /** Sets a selected start time and defaults the finish to one hour later.
   * @param startTime - Native time input value; empty values only clear the start.
   * @returns Nothing; updates both times and tracks a finish after midnight.
   */
  const updateStartTime = (startTime: string) => {
    if (!startTime) {
      updateDraft({ startTime });
      return;
    }
    const [hours, minutes] = startTime.split(':').map(Number);
    const finishHour = (hours + 1) % 24;
    updateDraft({
      startTime,
      finishTime: `${String(finishHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      finishNextDay: hours === 23,
    });
  };

  /** Combines the selected day with the entered times and saves the event.
   * @returns A promise that settles after saving.
   */
  const saveEvent = async () => {
    const start = new Date(`${eventDate}T${draft.startTime}:00.000Z`);
    const end = new Date(`${eventDate}T${draft.finishTime}:00.000Z`);
    if (
      !event &&
      !['activity', 'restaurant'].includes(draft.eventType) &&
      !bookingAvailable
    ) {
      setError('Choose an available reservation for this action.');
      return;
    }
    if (draft.finishNextDay) end.setUTCDate(end.getUTCDate() + 1);
    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    tripEnd.setUTCHours(23, 59, 59, 999);
    if (!draft.title.trim() || !draft.startTime || !draft.finishTime) {
      setError('Add a title and both event times.');
      return;
    }
    if (end <= start) {
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
        title: draft.title,
        address: draft.address,
        placeId: draft.placeId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: draft.notes,
        eventType: draft.eventType,
        reservation: draft.reservation || undefined,
        reservationMade: draft.reservationMade,
        cost: draft.cost,
      };
      const savedEvent = event
        ? await patchToApi<EventData>(`/event/${event._id}`, payload)
        : await postToApi<EventData>('/event', {
            itineraryID: itineraryId,
            ...payload,
          });
      await queryClient.invalidateQueries({ queryKey: ['reservation-events'] });
      onCreated(savedEvent);
      setIsOpen(false);
      setDraft(createEventDraft());
      setEventDate(date);
    } catch (cause) {
      setError(
        getApiErrorMessage(cause, 'Failed to save event. Please try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!event && (
        <button
          data-cy={`add-event-${date}`}
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
        dismissDisabled={isSaving}
        onClose={() => {
          if (!isSaving) setIsOpen(false);
        }}
        onExited={creatingType ? undefined : onClose}
        footer={
          <>
            <Button
              data-cy="event-cancel"
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              data-cy="event-save"
              onClick={saveEvent}
              disabled={isSaving}
            >
              {event ? 'Save Changes' : 'Save Event'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Event type
            <select
              data-cy="event-type"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3"
              value={draft.eventType}
              disabled={Boolean(event?.reservation)}
              onChange={(change) => {
                updateDraft({
                  eventType: change.target.value as EventType,
                  reservation: '',
                });
                setBookingAvailable(false);
                setEventDate(date);
                if (!['activity', 'restaurant'].includes(change.target.value))
                  updateDraft({
                    startTime: '',
                    finishTime: '',
                    finishNextDay: false,
                  });
              }}
            >
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!event &&
            !['activity', 'restaurant'].includes(draft.eventType) &&
            tripId && (
              <ReservationEventPicker
                key={draft.eventType}
                tripId={tripId}
                eventType={draft.eventType}
                value={draft.reservation}
                onAvailability={setBookingAvailable}
                onCreate={(type) => {
                  setCreatingType(type);
                  setIsOpen(false);
                }}
                onViewExisting={(id) => {
                  setIsOpen(false);
                  window.setTimeout(
                    () =>
                      document
                        .querySelector(`[data-cy="event-card-${id}"]`)
                        ?.scrollIntoView({
                          block: 'center',
                          behavior: 'smooth',
                        }),
                    250,
                  );
                }}
                onSelect={(reservation) => {
                  if (!reservation) {
                    updateDraft({
                      reservation: '',
                      title: '',
                      address: '',
                      placeId: null,
                    });
                    setEventDate(date);
                    return;
                  }
                  const isEnd =
                    draft.eventType === 'hotel_checkout' ||
                    draft.eventType === 'rentalcar_return';
                  setEventDate(
                    (isEnd ? reservation.endTime : reservation.startTime).slice(
                      0,
                      10,
                    ),
                  );
                  const address =
                    reservation.accommodations?.address ||
                    (isEnd
                      ? reservation.rentals?.returnAddress
                      : reservation.rentals?.pickupAddress) ||
                    '';
                  const placeId =
                    reservation.accommodations?.placeId ||
                    (isEnd
                      ? reservation.rentals?.returnPlaceId
                      : reservation.rentals?.pickupPlaceId) ||
                    null;
                  updateDraft({
                    reservation: reservation._id,
                    title: reservation.name,
                    address,
                    placeId,
                  });
                }}
              />
            )}
          {draft.reservation && (
            <p className="text-sm text-on-surface-variant">
              Scheduled for {eventDate}. Booking name and location are managed
              in Logistics.
            </p>
          )}
          <TextField
            data-cy="event-title"
            id="event-title"
            label="Event title"
            value={draft.title}
            disabled={Boolean(draft.reservation)}
            onChange={(event) => updateDraft({ title: event.target.value })}
            required
          />
          <EventPlaceField
            value={draft.address}
            placeId={draft.placeId}
            disabled={Boolean(draft.reservation)}
            onChange={(address, placeId, restaurant) =>
              updateDraft({
                address,
                placeId,
                ...(['activity', 'restaurant'].includes(draft.eventType)
                  ? { eventType: restaurant ? 'restaurant' : 'activity' }
                  : {}),
              })
            }
          />
          {draft.eventType === 'restaurant' && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.reservationMade}
                onChange={(event) =>
                  updateDraft({ reservationMade: event.target.checked })
                }
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span>Reservation made</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              data-cy="event-start"
              id="event-start"
              label="Start time"
              type="time"
              value={draft.startTime}
              onChange={(event) => updateStartTime(event.target.value)}
              required
            />
            <TextField
              data-cy="event-end"
              id="event-end"
              label="End time"
              type="time"
              value={draft.finishTime}
              hint={draft.finishNextDay ? 'Ends the following day.' : undefined}
              onChange={(event) =>
                updateDraft({
                  finishTime: event.target.value,
                  finishNextDay:
                    draft.finishNextDay && event.target.value < draft.startTime,
                })
              }
              required
            />
          </div>
          <TextField
            data-cy="event-cost"
            id="event-cost"
            label="Cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={draft.cost.toString()}
            onChange={(event) => 
              updateDraft({ cost: parseFloat(event.target.value) || 0 })
            }
          />
          <label
            className="grid gap-2 text-sm font-medium"
            htmlFor="event-notes"
          >
            Notes
            <TextArea
              data-cy="event-notes"
              id="event-notes"
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
              rows={3}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      </Modal>
      {creatingType === ReservationType.Accommodations && tripId && (
        <AccommodationReservationForm
          tripId={tripId}
          onClose={() => {
            setCreatingType(null);
            setIsOpen(true);
          }}
        />
      )}
      {creatingType === ReservationType.Rentals && tripId && (
        <RentalCarReservationForm
          tripId={tripId}
          onClose={() => {
            setCreatingType(null);
            setIsOpen(true);
          }}
        />
      )}
      {creatingType === ReservationType.Flights && tripId && (
        <FlightReservationForm
          tripId={tripId}
          onClose={() => {
            setCreatingType(null);
            setIsOpen(true);
          }}
        />
      )}
    </>
  );
};

export default AddNewEventCard;
