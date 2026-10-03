import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EventData } from '../../../queries/events';

interface EventCardProps {
  event: EventData;
  onEdit: (event: EventData) => void;
  onDelete: (eventId: string) => void;
}

/** Displays an itinerary event and exposes its edit and delete actions.
 * @param props - Event data and callbacks for its actions.
 * @returns A single event card.
 */
const EventCard = ({ event, onEdit, onDelete }: EventCardProps): ReactNode => (
  <article className="group relative flex flex-col gap-2 rounded-panel border border-outline-variant bg-surface-container-low p-4 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h4 className="font-medium text-on-surface">{event.title}</h4>
        {event.address ? (
          <p className="mt-0.5 text-sm text-on-surface-variant">
            {event.address}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold text-primary">
          {new Date(event.startTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          })}
          {' - '}
          {new Date(event.endTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          })}
        </p>
        {event.notes ? (
          <p className="mt-2 border-l-2 border-outline-variant pl-3 text-sm italic text-on-surface-variant">
            {event.notes}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(event)}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Edit event"
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(event._id)}
          className="text-on-surface-variant hover:text-error"
          aria-label="Delete event"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  </article>
);

export default EventCard;
