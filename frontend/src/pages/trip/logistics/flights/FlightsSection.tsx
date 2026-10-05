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
import FlightJourneyTimeline from './FlightJourneyTimeline';

interface FlightsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

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
          Add flight journey
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
                    {reservation.name}
                  </Text>
                  <Text color="muted" className="mt-0.5 text-sm">
                    {reservation.flights?.segments.length
                      ? reservation.flights.segments.length === 1
                        ? 'Nonstop flight'
                        : `${reservation.flights.segments.length - 1} ${reservation.flights.segments.length === 2 ? 'layover' : 'layovers'}`
                      : 'Flight details unavailable'}
                  </Text>
                </div>
              </div>

              {reservation.flights?.segments.length ? (
                <FlightJourneyTimeline
                  segments={reservation.flights.segments}
                />
              ) : (
                <Text color="error" className="mt-6">
                  Flight details unavailable.
                </Text>
              )}
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
