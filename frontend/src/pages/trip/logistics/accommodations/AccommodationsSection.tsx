import { Badge, BedDouble, MapPin, Plus } from 'lucide-react';
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

interface AccommodationsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

const stayDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/**
 * Loads accommodation reservations in stay-focused cards.
 * @param props - Trip identifier and reservation actions.
 * @returns The accommodation section with its own layout and query feedback.
 */
const AccommodationsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: AccommodationsSectionProps) => {
  const { reservations, isPending, isError, refetch } = useReservations(
    tripId,
    ReservationType.Accommodations,
  );

  return (
    <section
      id="logistics-stays"
      aria-labelledby="stays-heading"
      tabIndex={-1}
      className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Text as="h3" id="stays-heading" variant="title">
          Accommodations
        </Text>
        <Button
          data-cy="add-accommodation"
          size="sm"
          variant="secondary"
          leadingIcon={<Plus aria-hidden size={16} />}
          onClick={onAdd}
        >
          Add accommodation
        </Button>
      </div>
      {isPending ? (
        <LogisticsSkeletonCard
          label="Loading accommodations"
          className="rounded-[2rem_0.75rem_2rem_0.75rem]"
        />
      ) : null}
      {isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text color="error">Could not load accommodations.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <LogisticsEmptyState
          title="No accommodations added yet."
          icon={<BedDouble size={30} />}
        />
      ) : null}

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <article
            data-cy={`reservation-card-${reservation._id}`}
            key={reservation._id}
            className="group relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6"
          >
            <LogisticsCardActions
              reservation={reservation}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="relative grid size-16 shrink-0 place-items-center"
              >
                <Badge
                  size={64}
                  fill="currentColor"
                  strokeWidth={0}
                  className="absolute inset-0 text-secondary-container"
                />
                <BedDouble
                  size={26}
                  className="relative text-on-secondary-container"
                />
              </div>
              <div className="min-w-0 pr-20">
                <Text as="h4" variant="title">
                  {reservation.name}
                </Text>
                <Text
                  color="muted"
                  className="mt-1 flex items-start gap-1.5 text-sm"
                >
                  <MapPin aria-hidden size={14} className="mt-0.5 shrink-0" />
                  {reservation.accommodations?.address}
                </Text>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-panel bg-surface-container p-4">
              <div>
                <Text as="dt" variant="caption" color="muted">
                  Check-in
                </Text>
                <Text as="dd" className="mt-2">
                  <time dateTime={reservation.startTime}>
                    <span className="block text-lg tabular-nums">
                      {stayDate.format(
                        reservationDateForDisplay(reservation.startTime),
                      )}
                    </span>
                  </time>
                </Text>
              </div>
              <div className="border-l border-outline-variant pl-4">
                <Text as="dt" variant="caption" color="muted">
                  Check-out
                </Text>
                <Text as="dd" className="mt-2">
                  <time dateTime={reservation.endTime}>
                    <span className="block text-lg tabular-nums">
                      {stayDate.format(
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

export default AccommodationsSection;
