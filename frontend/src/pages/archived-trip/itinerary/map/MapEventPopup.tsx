import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popup, type Map as MapLibreMap } from 'maplibre-gl';
import type { EventData } from '../../../../queries/events';
import type { LocatedEvent } from '../../../../queries/eventLocations';
import EventCard from '../EventCard';

interface MapEventPopupProps {
  map: MapLibreMap;
  events: LocatedEvent[];
  onEnter: () => void;
  onLeave: () => void;
  onEdit: (event: EventData) => void;
  onDelete: (event: EventData) => void;
}

/** Places existing event cards inside a map-anchored popup using the current React tree.
 * @param props - Selected venue, hover lifecycle, and existing event actions.
 * @returns A portal retaining query/auth contexts and normal EventCard behavior.
 */
const MapEventPopup = ({
  map,
  events,
  onEnter,
  onLeave,
  onEdit,
  onDelete,
}: MapEventPopupProps) => {
  const [host] = useState(() => document.createElement('div'));
  useEffect(() => {
    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: 'min(32rem, calc(100vw - 6rem))',
      offset: 20,
      className: 'itinerary-map-popup',
    })
      .setLngLat([events[0].lng, events[0].lat])
      .setDOMContent(host)
      .addTo(map);
    return () => {
      popup.remove();
    };
  }, [map, events, host]);
  return createPortal(
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocusCapture={onEnter}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onLeave();
      }}
      className="w-[min(32rem,calc(100vw-6rem))]"
      data-cy="map-event-popup"
    >
      <div className="max-h-[min(26rem,45dvh)] space-y-3 overflow-y-auto p-1">
        {events.map((event) => (
          <EventCard
            size="lg"
            key={event._id}
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>,
    host,
  );
};

export default MapEventPopup;
