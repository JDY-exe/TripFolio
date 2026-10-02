import { BedDouble, CarFront, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Text } from '../../../components/common';
import {
  ReservationType,
  useReservations,
} from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';

interface ReservationSectionProps {
  tripId: string;
  type: ReservationType;
  id: string;
  headingId: string;
  title: string;
  addLabel: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Renders one reservation category with query states and card actions.
 * @param props - Category metadata, trip identifier, and card actions.
 * @returns The section and its reservation cards.
 */
const ReservationSection = ({
  tripId,
  type,
  id,
  headingId,
  title,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
}: ReservationSectionProps) => {
  const { reservations, isPending, isError, refetch } = useReservations(
    tripId,
    type,
  );
  const icon =
    type === ReservationType.Flights ? (
      <Plane aria-hidden size={24} />
    ) : type === ReservationType.Rentals ? (
      <CarFront aria-hidden size={24} />
    ) : (
      <BedDouble aria-hidden size={24} />
    );
  const shape =
    type === ReservationType.Flights
      ? 'rounded-[1.75rem_0.75rem_1.75rem_0.75rem]'
      : type === ReservationType.Rentals
        ? 'rounded-[0.75rem_2rem_0.75rem_2rem]'
        : 'rounded-[2rem_0.75rem_2rem_0.75rem]';

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      tabIndex={-1}
      className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Text as="h3" id={headingId} variant="title">
          {title}
        </Text>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<Plus aria-hidden size={16} />}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>
      {isPending ? (
        <Text color="muted">Loading {title.toLowerCase()}...</Text>
      ) : null}
      {isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text color="error">Could not load {title.toLowerCase()}.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <Text color="muted">No {title.toLowerCase()} added yet.</Text>
      ) : null}
      <div className="space-y-4">
        {reservations.map((reservation) => (
          <article
            key={reservation._id}
            className={`${shape} bg-surface-container-low p-5 sm:p-6`}
          >
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-[1rem_0.5rem_1rem_0.5rem] bg-primary-container text-on-primary-container">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <Text as="h4" variant="title">
                  {reservation.name}
                </Text>
                <Text color="muted" className="mt-1">
                  {type === ReservationType.Flights
                    ? `${reservation.flights?.airline ?? ''} ${reservation.flights?.flightNum ?? ''}`
                    : type === ReservationType.Rentals
                      ? reservation.rentals?.company
                      : reservation.accommodations?.address}
                </Text>
              </div>
            </div>
            {type === ReservationType.Flights ? (
              <p className="mt-5 text-sm font-medium">
                {reservation.flights?.departAirport} <span aria-hidden>→</span>{' '}
                {reservation.flights?.arriveAirport}
              </p>
            ) : null}
            <dl className="mt-5 grid gap-4 rounded-panel bg-surface-container p-4 sm:grid-cols-2">
              <div>
                <Text as="dt" variant="caption" color="muted">
                  {type === ReservationType.Flights
                    ? 'Departure'
                    : type === ReservationType.Rentals
                      ? 'Pick-up'
                      : 'Check-in'}
                </Text>
                <Text as="dd" className="mt-1">
                  <time dateTime={reservation.startTime}>
                    {dateFormat.format(new Date(reservation.startTime))}
                  </time>
                </Text>
              </div>
              <div>
                <Text as="dt" variant="caption" color="muted">
                  {type === ReservationType.Flights
                    ? 'Arrival'
                    : type === ReservationType.Rentals
                      ? 'Return'
                      : 'Check-out'}
                </Text>
                <Text as="dd" className="mt-1">
                  <time dateTime={reservation.endTime}>
                    {dateFormat.format(new Date(reservation.endTime))}
                  </time>
                </Text>
              </div>
            </dl>
            {reservation.confirmationNumber ||
            reservation.cost != null ||
            reservation.notes ? (
              <div className="mt-4 space-y-1 text-sm text-on-surface-variant">
                {reservation.confirmationNumber ? (
                  <p>Confirmation: {reservation.confirmationNumber}</p>
                ) : null}
                {reservation.cost != null ? (
                  <p>
                    Cost:{' '}
                    {reservation.cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                ) : null}
                {reservation.notes ? (
                  <p className="whitespace-pre-wrap">{reservation.notes}</p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-1 border-t border-outline-variant pt-2">
              <IconButton
                label={`Edit ${reservation.name}`}
                icon={<Pencil aria-hidden size={18} />}
                onClick={() => onEdit(reservation)}
              />
              <IconButton
                label={`Delete ${reservation.name}`}
                variant="danger"
                icon={<Trash2 aria-hidden size={18} />}
                onClick={() => onDelete(reservation)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ReservationSection;
