import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import { MapPin } from 'lucide-react';
import type { LocatedEvent } from '../../../../queries/eventLocations';

interface EventPinProps {
  map: MapLibreMap;
  event: LocatedEvent;
}

/** Marks an itinerary location independently of whether it has photos.
 * @param props - Loaded map and the event's resolved location.
 * @returns A focusable location pin with its event title on hover or focus.
 */
const EventPin = ({ map, event }: EventPinProps) => {
  const [element] = useState(() => document.createElement('div'));
  useEffect(() => {
    // Place pins below GPS anchors so photo stacks above them remain visible.
    const marker = new Marker({ element, anchor: 'top', offset: [0, 8] })
      .setLngLat([event.lng, event.lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, element, event.lng, event.lat]);

  return createPortal(
    <span
      className="atlas-event-pin"
      tabIndex={0}
      role="img"
      aria-label={`Event: ${event.title}`}
      data-cy="atlas-event-pin"
    >
      <MapPin size={28} aria-hidden="true" />
      <span className="atlas-event-label" aria-hidden="true">
        {event.title}
      </span>
    </span>,
    element,
  );
};

export default EventPin;
