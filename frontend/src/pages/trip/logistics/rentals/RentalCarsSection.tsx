import { Building2, CarFront, Plus } from 'lucide-react';
import { Button, Text } from '../../../../components/common';
import {
  ReservationType,
  useReservations,
} from '../../../../queries/reservations';
import type { Reservation } from '../../../../queries/reservations';
import LogisticsCardActions from '../LogisticsCardActions';
import LogisticsEmptyState from '../LogisticsEmptyState';
import LogisticsSkeletonCard from '../LogisticsSkeletonCard';
import { reservationDateForDisplay } from '../reservationDateInput';

interface RentalCarsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

const rentalDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
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
      {isPending ? (
        <LogisticsSkeletonCard
          label="Loading rental cars"
          className="rounded-[2rem_0.75rem_2rem_0.75rem]"
        />
      ) : null}
      {isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text color="error">Could not load rental cars.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <LogisticsEmptyState
          title="No rental cars added yet."
          icon={<CarFront size={30} />}
        />
      ) : null}

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <article
            key={reservation._id}
            className="group relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6"
          >
            <LogisticsCardActions
              reservation={reservation}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-12 shrink-0 place-items-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container">
                <CarFront aria-hidden size={28} />
              </div>
              <div className="min-w-0 pr-20">
                <Text as="h4" variant="title">
                  {reservation.name}
                </Text>
                <Text
                  color="muted"
                  className="mt-1 flex items-start gap-1.5 text-sm"
                >
                  <Building2
                    aria-hidden
                    size={14}
                    className="mt-0.5 shrink-0"
                  />
                  {reservation.rentals?.company}
                </Text>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-panel bg-surface-container p-4">
              <div>
                <Text as="dt" variant="caption" color="muted">
                  Pick-up
                </Text>
                <Text as="dd" className="mt-2">
                  <time dateTime={reservation.startTime}>
                    <span className="block text-lg tabular-nums">
                      {rentalDate.format(
                        reservationDateForDisplay(reservation.startTime),
                      )}
                    </span>
                  </time>
                </Text>
              </div>
              <div className="border-l border-outline-variant pl-4">
                <Text as="dt" variant="caption" color="muted">
                  Return
                </Text>
                <Text as="dd" className="mt-2">
                  <time dateTime={reservation.endTime}>
                    <span className="block text-lg tabular-nums">
                      {rentalDate.format(
                        reservationDateForDisplay(reservation.endTime),
                      )}
                    </span>
                  </time>
                </Text>
              </div>
            </dl>

            {reservation.notes ? (
              <Text color="muted" className="mt-4 whitespace-pre-wrap text-sm">
                {reservation.notes}
              </Text>
            ) : null}

            <div className="mt-3">
              <Text variant="label" color="muted">
                Cost:{' '}
                {reservation.cost != null
                  ? reservation.cost.toFixed(2)
                  : 'Not provided'}
              </Text>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RentalCarsSection;
