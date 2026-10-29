import { Expand } from 'lucide-react';
import { lazy, Suspense, useRef, useState } from 'react';
import {
  Button,
  IconButton,
  Modal,
  Skeleton,
  Text,
} from '../../../../components/common';
import { useEventLocations } from '../../../../queries/eventLocations';
import type { EventData } from '../../../../queries/events';

const ItineraryMapCanvas = lazy(() => import('./ItineraryMapCanvas'));
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

interface ItineraryMapProps {
  events: EventData[];
  activeDate?: string;
  startDate: string;
  loading: boolean;
  onEdit: (event: EventData) => void;
  onDelete: (event: EventData) => void;
}

/** Presents a day-following map preview and the shared expanded-map modal.
 * @param props - Itinerary events, visible day, loading state, and event actions.
 * @returns A themed sidebar card with progressive location status and expanded map.
 */
const ItineraryMap = ({
  events,
  activeDate,
  startDate,
  loading,
  onEdit,
  onDelete,
}: ItineraryMapProps) => {
  const [expanded, setExpanded] = useState(false);
  const pendingAction = useRef<(() => void) | undefined>(undefined);
  const { locatedEvents, isLoading } = useEventLocations(events);
  const dayNumber = activeDate
    ? Math.round(
        (Date.parse(activeDate) - Date.parse(startDate.slice(0, 10))) /
          86400000,
      ) + 1
    : 1;
  const title = activeDate
    ? `Day ${dayNumber} · ${dateFormatter.format(new Date(`${activeDate}T00:00:00Z`))}`
    : 'Places';
  const mapProps = {
    events: locatedEvents,
    activeDate,
    onEdit: (event: EventData) => {
      pendingAction.current = () => onEdit(event);
      setExpanded(false);
    },
    onDelete: (event: EventData) => {
      pendingAction.current = () => onDelete(event);
      setExpanded(false);
    },
  };
  return (
    <>
      <section
        className="rounded-panel bg-surface-container-low p-5 text-on-surface"
        data-cy="itinerary-map"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <Text as="h2" variant="label">
            {title}
          </Text>
          <IconButton
            data-cy="expand-itinerary-map"
            label="Expand map"
            size="sm"
            icon={<Expand aria-hidden size={18} />}
            onClick={() => setExpanded(true)}
            disabled={!locatedEvents.length}
          />
        </header>
        {locatedEvents.length > 0 && (
          <Suspense
            fallback={<Skeleton className="h-56 w-full rounded-panel" />}
          >
            <ItineraryMapCanvas {...mapProps} />
          </Suspense>
        )}
        {!locatedEvents.length && (loading || isLoading) && (
          <div role="status" aria-label="Locating itinerary events">
            <Skeleton className="h-56 w-full rounded-panel" />
          </div>
        )}
        {!locatedEvents.length && !(loading || isLoading) && (
          <Text color="muted" className="py-8 text-center">
            {events.some((event) => event.address)
              ? 'No event locations could be mapped.'
              : 'Add locations to your events to see them here.'}
          </Text>
        )}
      </section>
      <Modal
        open={expanded}
        title={title}
        onClose={() => setExpanded(false)}
        onExited={() => {
          const action = pendingAction.current;
          pendingAction.current = undefined;
          action?.();
        }}
        panelClassName="max-w-6xl"
        footer={
          <Button variant="secondary" onClick={() => setExpanded(false)}>
            Close map
          </Button>
        }
      >
        {expanded && (
          <Suspense
            fallback={<Skeleton className="h-[65dvh] w-full rounded-panel" />}
          >
            <ItineraryMapCanvas {...mapProps} interactive />
          </Suspense>
        )}
      </Modal>
    </>
  );
};

export default ItineraryMap;
