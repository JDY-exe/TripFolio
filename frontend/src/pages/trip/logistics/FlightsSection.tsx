import { ReservationType } from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import ReservationSection from './ReservationSection';

interface FlightsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

/**
 * Loads and displays the flights for a trip.
 * @param props - Trip identifier and card actions.
 * @returns The flights section.
 */
const FlightsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: FlightsSectionProps) => (
  <ReservationSection
    tripId={tripId}
    type={ReservationType.Flights}
    id="logistics-flights"
    headingId="flights-heading"
    title="Flights"
    addLabel="Add flight"
    onAdd={onAdd}
    onEdit={onEdit}
    onDelete={onDelete}
  />
);

export default FlightsSection;
