import { CarFront, LogIn, LogOut, Plane, UtensilsCrossed } from 'lucide-react';
import type { EventData } from '../../../queries/events';

import { eventTypeLabels } from './eventTypeLabels';
/** Identifies typed actions with both an icon and a readable label.
 * @param props - Typed itinerary event.
 * @returns A compact semantic badge, or no badge for normal activities.
 */
const EventTypeBadge = ({ event }: { event: EventData }) => {
  const type = event.eventType;
  const icons = {
    activity: LogIn,
    restaurant: UtensilsCrossed,
    hotel_checkin: LogIn,
    hotel_checkout: LogOut,
    rentalcar_pickup: CarFront,
    rentalcar_return: CarFront,
    flight: Plane,
  };
  const Icon = icons[type];
  return (
    <>
      {type !== 'activity' && (
        <span
          data-cy="event-type-badge"
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium text-on-secondary-container"
        >
          <Icon aria-hidden size={14} />
          {eventTypeLabels[type]}
        </span>
      )}
    </>
  );
};
export default EventTypeBadge;
