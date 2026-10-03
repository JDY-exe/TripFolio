import { Plane, Plus } from 'lucide-react';
import { Button, Text } from '../../../../components/common';
import {
  ReservationType,
  useReservations,
} from '../../../../queries/reservations';
import type { Reservation } from '../../../../queries/reservations';
import LogisticsCardActions from '../LogisticsCardActions';
import LogisticsEmptyState from '../LogisticsEmptyState';
import LogisticsSkeletonCard from '../LogisticsSkeletonCard';

interface FlightsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

const flightTime = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});
const flightDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Loads flight reservations and presents each as a ticket-shaped card.
 * @param props - Trip identifier and reservation actions.
 * @returns The flight section with live ticket cards and query feedback.
 */
const FlightsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: FlightsSectionProps) => {
  const { reservations, isPending, isError, refetch } = useReservations(
    tripId,
    ReservationType.Flights,
  );

  return (
    <section
      id="logistics-flights"
      aria-labelledby="flights-heading"
      tabIndex={-1}
      className="scroll-mt-8 rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Text as="h3" id="flights-heading" variant="title">
          Flights
        </Text>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<Plus aria-hidden size={16} />}
          onClick={onAdd}
        >
          Add flight
        </Button>
      </div>
      {isPending ? (
        <LogisticsSkeletonCard
          label="Loading flights"
          className="rounded-[1.75rem_0.75rem_1.75rem_0.75rem]"
        />
      ) : null}
      {isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text color="error">Could not load flights.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      {!isPending && !isError && reservations.length === 0 ? (
        <LogisticsEmptyState
          title="No flights added yet."
          icon={<Plane size={30} />}
        />
      ) : null}

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <article
            key={reservation._id}
            className="group relative overflow-hidden rounded-[1.75rem_0.75rem_1.75rem_0.75rem] bg-surface-container-low"
          >
            <LogisticsCardActions
              reservation={reservation}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-[1rem_0.5rem_1rem_0.5rem] bg-primary-container text-on-primary-container">
                  <Plane aria-hidden size={22} />
                </div>
                <div className="min-w-0 pr-20">
                  <Text as="h4" variant="label" className="font-medium">
                    {reservation.flights?.airline || reservation.name}
                  </Text>
                  <Text color="muted" className="mt-0.5 text-sm">
                    {reservation.flights?.flightNum || reservation.name}
                  </Text>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                <div className="min-w-0">
                  <Text className="truncate text-3xl tracking-tight">
                    {reservation.flights?.departAirport || '—'}
                  </Text>
                  <time
                    dateTime={reservation.startTime}
                    className="mt-3 block text-lg font-medium tabular-nums"
                  >
                    {flightTime.format(new Date(reservation.startTime))}
                  </time>
                  <time
                    dateTime={reservation.startTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {flightDate.format(new Date(reservation.startTime))}
                  </time>
                </div>
                <div
                  className="flex items-center gap-2 text-primary"
                  aria-hidden="true"
                >
                  <span className="hidden w-8 border-t border-2 border-dashed border-outline-variant sm:block" />
                  <Plane size={18} className="rotate-45" />
                  <span className="hidden w-8 border-t border-2 border-dashed border-outline-variant sm:block" />
                </div>
                <div className="min-w-0 text-right">
                  <Text className="truncate text-3xl tracking-tight">
                    {reservation.flights?.arriveAirport || '—'}
                  </Text>
                  <time
                    dateTime={reservation.endTime}
                    className="mt-3 block text-lg font-medium tabular-nums"
                  >
                    {flightTime.format(new Date(reservation.endTime))}
                  </time>
                  <time
                    dateTime={reservation.endTime}
                    className="block text-xs text-on-surface-variant"
                  >
                    {flightDate.format(new Date(reservation.endTime))}
                  </time>
                </div>
              </div>
              {reservation.notes ? (
                <Text
                  color="muted"
                  className="mt-4 whitespace-pre-wrap text-sm"
                >
                  {reservation.notes}
                </Text>
              ) : null}
            </div>

            <dl className="relative flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-outline-variant px-5 py-4 before:absolute before:-left-2 before:-top-2 before:size-4 before:rounded-full before:bg-surface after:absolute after:-right-2 after:-top-2 after:size-4 after:rounded-full after:bg-surface sm:px-6">
              <div className="min-w-0">
                <Text
                  as="dt"
                  variant="caption"
                  color="muted"
                  className="uppercase tracking-wide"
                >
                  Confirmation
                </Text>
                <Text
                  as="dd"
                  variant="label"
                  className="mt-1 break-all font-medium"
                >
                  {reservation.confirmationNumber || 'Not provided'}
                </Text>
              </div>
              <div className="ml-auto text-right">
                <Text
                  as="dt"
                  variant="caption"
                  color="muted"
                  className="uppercase tracking-wide"
                >
                  Cost
                </Text>
                <Text
                  as="dd"
                  variant="label"
                  className="mt-1 font-medium tabular-nums"
                >
                  {reservation.cost != null
                    ? reservation.cost.toFixed(2)
                    : 'Not provided'}
                </Text>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FlightsSection;
