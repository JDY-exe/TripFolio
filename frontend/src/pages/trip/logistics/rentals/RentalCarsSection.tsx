import { CarFront, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Text } from '../../../../components/common';
import {
  ReservationType,
  useReservations,
} from '../../../../queries/reservations';
import type { Reservation } from '../../../../queries/reservations';

interface RentalCarsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

const rentalDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Loads rental reservations and presents their vehicle and pickup details.
 * @param props - Trip identifier and reservation actions.
 * @returns The rental car section with its own card layout and query feedback.
 */
const RentalCarsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: RentalCarsSectionProps) => {
  const { reservations, isPending, isError, refetch } = useReservations(
    tripId,
    ReservationType.Rentals,
  );

  return (
    <section
      id="logistics-cars"
      aria-labelledby="cars-heading"
      tabIndex={-1}
      className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Text as="h3" id="cars-heading" variant="title">
          Rental cars
        </Text>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<Plus aria-hidden size={16} />}
          onClick={onAdd}
        >
          Add rental car
        </Button>
      </div>
      {isPending ? <Text color="muted">Loading rental cars...</Text> : null}
      {isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text color="error">Could not load rental cars.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <Text color="muted">No rental cars added yet.</Text>
      ) : null}

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <article
            key={reservation._id}
            className="rounded-[0.75rem_2rem_0.75rem_2rem] bg-surface-container-low p-5 sm:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-16 shrink-0 place-items-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container">
                <CarFront aria-hidden size={28} />
              </div>
              <div className="min-w-0">
                <Text as="h4" variant="title">
                  {reservation.name}
                </Text>
                <Text color="muted" className="mt-1 text-sm">
                  {reservation.rentals?.company}
                </Text>
              </div>
            </div>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Text as="dt" variant="caption" color="muted">
                  Pick-up
                </Text>
                <Text as="dd" className="mt-1 text-sm">
                  <time dateTime={reservation.startTime}>
                    {rentalDateTime.format(new Date(reservation.startTime))}
                  </time>
                </Text>
              </div>
              <div>
                <Text as="dt" variant="caption" color="muted">
                  Return
                </Text>
                <Text as="dd" className="mt-1 text-sm">
                  <time dateTime={reservation.endTime}>
                    {rentalDateTime.format(new Date(reservation.endTime))}
                  </time>
                </Text>
              </div>
            </dl>

            {reservation.notes ? (
              <Text color="muted" className="mt-4 whitespace-pre-wrap text-sm">
                {reservation.notes}
              </Text>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                {reservation.confirmationNumber ? (
                  <span>Confirmation: {reservation.confirmationNumber}</span>
                ) : null}
                {reservation.cost != null ? (
                  <span>Cost: {reservation.cost.toFixed(2)}</span>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RentalCarsSection;
