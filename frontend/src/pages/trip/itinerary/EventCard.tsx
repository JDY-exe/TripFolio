import { CalendarDays, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton, Text } from '../../../components/common';
import type { EventData } from '../../../queries/events';

interface EventCardProps {
  event: EventData;
  onEdit: (event: EventData) => void;
  onDelete: (eventId: string) => void;
}

const eventTime = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** Displays an itinerary event and exposes its edit and delete actions.
 * @param props - Event data and callbacks for its actions.
 * @returns A single event card.
 */
const EventCard = ({ event, onEdit, onDelete }: EventCardProps): ReactNode => (
  <article className="group relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low p-5 sm:p-6">
    <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-full bg-surface-container-low/90 p-1 opacity-0 pointer-events-none shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none sm:right-5 sm:top-5">
      <IconButton
        label={`Edit ${event.title}`}
        size="sm"
        icon={<Pencil aria-hidden size={18} />}
        onClick={() => onEdit(event)}
      />
      <IconButton
        label={`Delete ${event.title}`}
        size="sm"
        variant="dangerGhost"
        icon={<Trash2 aria-hidden size={18} />}
        onClick={() => onDelete(event._id)}
      />
    </div>

    <div className="flex items-center gap-4">
      <div className="grid h-14 w-12 shrink-0 place-items-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container">
        <CalendarDays aria-hidden size={26} />
      </div>
      <div className="min-w-0 pr-20">
        <Text as="h4" variant="title">
          {event.title}
        </Text>
        {event.address ? (
          <Text color="muted" className="mt-1 flex items-start gap-1.5 text-sm">
            <MapPin aria-hidden size={14} className="mt-0.5 shrink-0" />
            {event.address}
          </Text>
        ) : null}
      </div>
    </div>

    <div className="mt-5 flex items-center gap-3 rounded-panel bg-surface-container p-4">
      <Clock3 aria-hidden size={18} className="shrink-0 text-primary" />
      <Text
        variant="label"
        className="flex flex-wrap items-center gap-x-2 tabular-nums"
      >
        <time dateTime={event.startTime}>
          {eventTime.format(new Date(event.startTime))}
        </time>
        <span className="text-on-surface-variant">to</span>
        <time dateTime={event.endTime}>
          {eventTime.format(new Date(event.endTime))}
        </time>
      </Text>
    </div>

    {event.notes ? (
      <Text color="muted" className="mt-4 whitespace-pre-wrap text-sm">
        {event.notes}
      </Text>
    ) : null}
  </article>
);

export default EventCard;
