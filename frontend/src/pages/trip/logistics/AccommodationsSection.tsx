import { ReservationType } from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import ReservationSection from './ReservationSection';

interface AccommodationsSectionProps {
  tripId: string;
  onAdd: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

/**
 * Loads and displays the accommodations for a trip.
 * @param props - Trip identifier and card actions.
 * @returns The accommodations section.
 */
const AccommodationsSection = ({
  tripId,
  onAdd,
  onEdit,
  onDelete,
}: AccommodationsSectionProps) => (
  <ReservationSection
    tripId={tripId}
    type={ReservationType.Accommodations}
    id="logistics-stays"
    headingId="stays-heading"
    title="Accommodations"
    addLabel="Add accommodation"
    onAdd={onAdd}
    onEdit={onEdit}
    onDelete={onDelete}
  />
);

export default AccommodationsSection;
