import { ArrowUpRight, CalendarDays, MapPin, UsersRound, Trash2 } from 'lucide-react';
import { Button, Text } from '../../components/common';
import { useNavigate } from 'react-router';

export interface TripCardProps {
  id: string;
  title: string;
  destination: string;
  dates: string;
  travelers: string;
  status: string;
  image: string;
  onDelete: (id: string) => void;
}

/**
 * Displays a sample trip as a photo, destination, and compact planning summary.
 * All fields are display copy and the action is inactive in this UI mockup.
 *
 * @param props - Static trip copy and cover image URL.
 * @returns A themed, presentation-only trip card.
 */
function TripCard({
  id,
  title,
  destination,
  dates,
  travelers,
  status,
  image,
  onDelete,
}: TripCardProps) {
  const navigate = useNavigate();
  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      onDelete(id);
    }
  };

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

      <div className="relative p-5 sm:p-6">

        <button
          onClick={handleDeleteClick}
          className="absolute right-4 top-4 rounded-full bg-surface p-1.5 text-error hover:bg-error/10 motion-safe:transition-colors"
          aria-label={`Delete ${title}`}
        >
          <Trash2 size={16} />
        </button>

        <Text color="muted" className="flex items-center gap-1.5 text-sm pr-8">
          <MapPin aria-hidden size={15} className="shrink-0" />
          {destination}
        </Text>
        <Text as="h2" variant="title" className="mt-2 pr-8">
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
            onClick={() => navigate(`/trip/${id}`)}
            aria-label={`Open ${title}`}
            fullWidth
            className="justify-between px-0"
            trailingIcon={<ArrowUpRight aria-hidden size={18} />}
          >
            View Trip
          </Button>
        </div>
      </div>
    </article>
  );
}

export default TripCard;
