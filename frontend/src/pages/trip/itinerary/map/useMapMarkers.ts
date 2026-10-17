import { useEffect, useRef } from 'react';
import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import type { LocatedEvent } from '../../../../queries/eventLocations';
import { getDayMapEvents, groupMapEvents } from './mapGeometry';

/** Renders themed keyboard-accessible markers, grouping events at shared venues.
 * @param map - Loaded map instance.
 * @param events - All located events in chronological order.
 * @param date - Day whose markers should be emphasized.
 * @param select - Opens a venue's event cards on hover or keyboard focus.
 * @param leave - Schedules hover dismissal while allowing entry into the card.
 * @param interactive - Whether pins support hover and keyboard previews.
 * @returns Nothing; markers are disposed when inputs change.
 */
export const useMapMarkers = (
  map: MapLibreMap | undefined,
  events: LocatedEvent[],
  date: string | undefined,
  select: (events: LocatedEvent[]) => void,
  leave: () => void,
  interactive: boolean,
) => {
  const records = useRef<
    { group: LocatedEvent[]; button: HTMLButtonElement; marker: Marker }[]
  >([]);
  useEffect(() => {
    if (!map) return;
    records.current = groupMapEvents(events).map((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'itinerary-map-pin';
      button.disabled = !interactive;
      if (!interactive) {
        button.tabIndex = -1;
        button.style.pointerEvents = 'none';
        button.style.cursor = 'default';
      }
      if (group.length > 1) button.dataset.count = String(group.length);
      button.setAttribute(
        'aria-label',
        group.map((event) => event.title).join(', '),
      );
      button.dataset.cy = `map-pin-${group[0]._id}`;
      if (interactive) {
        button.addEventListener('mouseenter', () => select(group));
        button.addEventListener('mouseleave', leave);
        button.addEventListener('focus', () => select(group));
        button.addEventListener('blur', leave);
      }
      const marker = new Marker({ element: button })
        .setLngLat([group[0].lng, group[0].lat])
        .addTo(map);
      return { group, button, marker };
    });
    return () => {
      records.current.forEach(({ marker }) => marker.remove());
      records.current = [];
    };
  }, [map, events, select, leave, interactive]);

  // Restyle existing buttons so changing the hovered day doesn't remove the hovered marker.
  useEffect(() => {
    const dayEvents = getDayMapEvents(events, date);
    records.current.forEach(({ group, button }) => {
      const active = group.find(
        (event) => event.startTime.slice(0, 10) === date,
      );
      button.classList.toggle('itinerary-map-pin-active', Boolean(active));
      button.textContent = active
        ? String(dayEvents.findIndex((event) => event._id === active._id) + 1)
        : '';
    });
  }, [map, events, date, select, leave, interactive]);
};
