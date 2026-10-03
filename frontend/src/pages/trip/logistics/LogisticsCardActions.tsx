import { Pencil, Trash2 } from 'lucide-react';
import { IconButton } from '../../../components/common';
import type { Reservation } from '../../../queries/reservations';

interface LogisticsCardActionsProps {
  reservation: Reservation;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

/**
 * Shows the shared card actions on hover, keyboard focus, and touch screens.
 * @param props - Reservation and actions supplied by its category section.
 * @returns Edit and delete controls positioned in the card's upper right corner.
 */
const LogisticsCardActions = ({
  reservation,
  onEdit,
  onDelete,
}: LogisticsCardActionsProps) => (
  <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-full bg-surface-container-low/90 p-1 opacity-0 pointer-events-none shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none sm:right-5 sm:top-5">
    <IconButton
      label={`Edit ${reservation.name}`}
      size="sm"
      icon={<Pencil aria-hidden size={18} />}
      onClick={() => onEdit(reservation)}
    />
    <IconButton
      label={`Delete ${reservation.name}`}
      size="sm"
      variant="dangerGhost"
      icon={<Trash2 aria-hidden size={18} />}
      onClick={() => onDelete(reservation)}
    />
  </div>
);

export default LogisticsCardActions;
