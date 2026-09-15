import { ArrowUpRight, CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { Button, Text } from '../../components/common';

export interface TripCardProps {
  title: string;
  destination: string;
  dates: string;
  travelers: string;
  status: string;
  image: string;
}

/**
 * Displays a sample trip as a photo, destination, and compact planning summary.
 * All fields are display copy and the action is inactive in this UI mockup.
 *
 * @param props - Static trip copy and cover image URL.
 * @returns A themed, presentation-only trip card.
 */
function TripCard({
  title,
  destination,
  dates,
  travelers,
  status,
  image,
}: TripCardProps) {
  return (
    <article className="overflow-hidden rounded-panel border border-outline-variant bg-surface-container-low">
      <div className="relative">
        <img
          src={image}
          alt=""
          width={1000}
          height={563}
          loading="lazy"
          className="aspect-video w-full bg-surface-container object-cover"
        />
        <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-on-surface">
          {status}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <Text color="muted" className="flex items-center gap-1.5 text-sm">
          <MapPin aria-hidden size={15} className="shrink-0" />
          {destination}
        </Text>
        <Text as="h2" variant="title" className="mt-2">
          {title}
        </Text>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-variant">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden size={16} className="shrink-0" />
            {dates}
          </p>
          <p className="flex items-center gap-2">
            <UsersRound aria-hidden size={16} className="shrink-0" />
            {travelers}
          </p>
        </div>

        <div className="mt-5 border-t border-outline-variant pt-4">
          <Button
            variant="ghost"
            disabled
            fullWidth
            className="justify-between px-0"
            trailingIcon={<ArrowUpRight aria-hidden size={18} />}
          >
            View trip
          </Button>
        </div>
      </div>
    </article>
  );
}

export default TripCard;
