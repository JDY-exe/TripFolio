import { useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds } from 'maplibre-gl';
import { Text } from '../../../../components/common';
import type { EventData } from '../../../../queries/events';
import type { LocatedEvent } from '../../../../queries/eventLocations';
import { getDayMapEvents } from './mapGeometry';
import { useMapRuntime } from './useMapRuntime';
import { useMapMarkers } from './useMapMarkers';
import MapEventPopup from './MapEventPopup';
import 'maplibre-gl/dist/maplibre-gl.css';
import './itineraryMap.css';

interface ItineraryMapCanvasProps {
  events: LocatedEvent[];
  activeDate?: string;
  interactive?: boolean;
  onEdit: (event: EventData) => void;
  onDelete: (event: EventData) => void;
}

/** Composes the map renderer, focused-day camera, markers, and reusable card popup.
 * @param props - Located events, focused day, interaction mode, and event actions.
 * @returns A map surface with accessible marker previews and failure feedback.
 */
const ItineraryMapCanvas = ({
  events,
  activeDate,
  interactive = false,
  onEdit,
  onDelete,
}: ItineraryMapCanvasProps) => {
  const container = useRef<HTMLDivElement>(null);
  const { map, failed } = useMapRuntime(container, interactive);
  const [selection, setSelection] = useState<{
    events: LocatedEvent[];
    date?: string;
  }>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastFrame = useRef('');

  /** Cancels pending dismissal while the pointer enters a pin or its card. */
  const keepOpen = useCallback(() => clearTimeout(timer.current), []);
  /** Opens a venue's existing cards while its marker is hovered or focused. */
  const select = useCallback(
    (selected: LocatedEvent[]) => {
      clearTimeout(timer.current);
      setSelection({ events: selected, date: activeDate });
    },
    [activeDate],
  );
  /** Lets the pointer cross the gap from a marker to its interactive popup. */
  const leave = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSelection(undefined), 250);
  }, []);
  const highlightedDate = interactive
    ? selection?.date === activeDate
      ? selection?.events[0].startTime.slice(0, 10)
      : undefined
    : activeDate;
  useMapMarkers(map, events, highlightedDate, select, leave, interactive);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!map || !events.length) return;
    const day = getDayMapEvents(events, activeDate);
    const focus = day.length ? day : lastFrame.current ? [] : events;
    if (!focus.length) return;
    const signature = `${activeDate}:${focus.map((event) => `${event._id}:${event.lat}:${event.lng}`).join('|')}`;
    if (signature === lastFrame.current) return;
    lastFrame.current = signature;
    const bounds = new LngLatBounds();
    focus.forEach((event) => bounds.extend([event.lng, event.lat]));
    map.fitBounds(bounds, {
      padding: interactive ? 72 : 35,
      maxZoom: interactive ? 14 : 13,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 450,
    });
  }, [map, events, activeDate, interactive]);

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-panel bg-surface-container-low ${interactive ? 'h-[65dvh] min-h-80' : 'h-56'}`}
        data-cy={
          interactive ? 'expanded-itinerary-map' : 'itinerary-map-preview'
        }
      >
        <div
          ref={container}
          className="h-full w-full"
          aria-label="Itinerary event locations"
        />
        {failed && (
          <div
            role="status"
            className="absolute inset-0 grid place-items-center bg-surface-container-low p-6 text-center"
          >
            <Text color="muted">
              Map unavailable. Your itinerary is still available.
            </Text>
          </div>
        )}
        {interactive && map && selection && selection.date === activeDate && (
          <MapEventPopup
            key={selection.events.map((event) => event._id).join(',')}
            map={map}
            events={selection.events}
            onEnter={keepOpen}
            onLeave={leave}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>
      <Text
        variant="caption"
        color="muted"
        className="mt-2"
        data-cy="map-attribution"
      >
        <a
          href="https://www.openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          © OpenMapTiles
        </a>
        {' · Data from '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          OpenStreetMap
        </a>
      </Text>
    </>
  );
};

export default ItineraryMapCanvas;
