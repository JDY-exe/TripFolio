import { ReservationType } from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import ReservationSection from './ReservationSection';

interface RentalCarsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

/**
 * Loads and displays the rental cars for a trip.
 * @param props - Trip identifier and card actions.
 * @returns The rental cars section.
 */
const RentalCarsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: RentalCarsSectionProps) => (
  <ReservationSection
    tripId={tripId}
    type={ReservationType.Rentals}
    id="logistics-cars"
    headingId="cars-heading"
    title="Rental cars"
    addLabel="Add rental car"
    onAdd={onAdd}
    onEdit={onEdit}
    onDelete={onDelete}
  />
);

export default RentalCarsSection;
