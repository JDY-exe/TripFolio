import type { LocatedEvent } from '../../../../queries/eventLocations';

/** Groups coincident locations so every event at a shared venue stays accessible.
 * @param events - Chronologically ordered events with coordinates.
 * @returns Groups of events sharing a location to five decimal places.
 */
export const groupMapEvents = (events: LocatedEvent[]) => {
  const groups = new Map<string, LocatedEvent[]>();
  for (const event of events) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()];
};

/** Selects the day's valid locations without changing chronological event order.
 * @param events - Located itinerary events.
 * @param date - Active UTC date key.
 * @returns Events belonging to that date.
 */
export const getDayMapEvents = (events: LocatedEvent[], date?: string) =>
  events.filter((event) => event.startTime.slice(0, 10) === date);
