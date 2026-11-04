import { useEffect } from 'react';
import { Button, Text } from '../../../components/common';
import {
  ReservationType,
  useReservations,
  useReservationEvents,
} from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import type { EventType } from '../../../queries/events';

interface Props {
  tripId: string;
  eventType: EventType;
  value: string;
  onSelect: (reservation: Reservation | null) => void;
  onAvailability: (available: boolean) => void;
  onCreate: (type: ReservationType) => void;
  onViewExisting: (id: string) => void;
}
/** Selects an existing compatible booking and prevents duplicate action insertion.
 * @param props - Trip, action type, selected booking, and selection/availability callbacks.
 * @returns Booking picker with loading/error states and an inline booking-creation workflow.
 */
const ReservationEventPicker = ({
  tripId,
  eventType,
  value,
  onSelect,
  onAvailability,
  onCreate,
  onViewExisting,
}: Props) => {
  const type = eventType.startsWith('hotel_')
    ? ReservationType.Accommodations
    : eventType.startsWith('rentalcar_')
      ? ReservationType.Rentals
      : ReservationType.Flights;
  const query = useReservations(tripId, type);
  const selected = query.reservations.find(
    (reservation) => reservation._id === value,
  );
  const events = useReservationEvents(selected);
  const duplicate = events.data?.find((event) => event.eventType === eventType);
  const available = Boolean(
    selected && events.isSuccess && !events.isFetching && !duplicate,
  );
  useEffect(() => {
    onAvailability(available);
  }, [available, onAvailability]);
  return (
    <div className="space-y-3">
      {query.isPending && <Text role="status">Loading reservations…</Text>}
      {query.isError && (
        <>
          <Text role="alert" color="error">
            Could not load reservations.
          </Text>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </>
      )}
      {!query.isPending && !query.isError && (
        <label className="grid gap-2 text-sm font-medium">
          Reservation
          <select
            data-cy="event-reservation"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-3"
            value={value}
            onChange={(event) => {
              onAvailability(false);
              const reservation = query.reservations.find(
                (item) => item._id === event.target.value,
              );
              onSelect(reservation ?? null);
            }}
          >
            <option value="">Choose a reservation</option>
            {query.reservations.map((reservation) => (
              <option key={reservation._id} value={reservation._id}>
                {reservation.name} · {reservation.startTime.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>
      )}
      {selected && events.isPending && (
        <Text role="status">Checking itinerary entries…</Text>
      )}
      {events.isError && (
        <>
          <Text role="alert" color="error">
            Could not check existing actions.
          </Text>
          <Button variant="outline" onClick={() => void events.refetch()}>
            Retry
          </Button>
        </>
      )}
      {duplicate && (
        <>
          <Text>This action is already on the itinerary.</Text>
          <Button
            variant="outline"
            onClick={() => {
              onViewExisting(duplicate._id);
            }}
          >
            View existing entry
          </Button>
        </>
      )}
      <Button variant="ghost" onClick={() => onCreate(type)}>
        Create reservation
      </Button>
    </div>
  );
};
export default ReservationEventPicker;
