import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { paths } from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import type {
  EventData,
  EventType,
  ItineraryAction,
} from '../../../queries/events';
import { getFromApi } from '../../../utils/api';

export interface ActionDraft {
  eventType: EventType;
  selected: boolean;
  start: string;
  end: string;
  nextDay: boolean;
}
export const actionLabels: Partial<Record<EventType, string>> = {
  hotel_checkin: 'Hotel check-in',
  hotel_checkout: 'Hotel check-out',
  rentalcar_pickup: 'Rental car pickup',
  rentalcar_return: 'Rental car return',
};
/** Builds action drafts from a local linked-event snapshot, never from later cache updates. */
const buildDrafts = (
  types: readonly EventType[],
  events: ItineraryAction[],
  creating: boolean,
): ActionDraft[] =>
  types.map((eventType) => {
    const event = events.find((item) => item.eventType === eventType);
    return {
      eventType,
      selected: Boolean(event) || creating,
      start: event?.startTime.slice(11, 16) ?? '',
      end: event?.endTime.slice(11, 16) ?? '',
      nextDay: Boolean(
        event && event.endTime.slice(0, 10) > event.startTime.slice(0, 10),
      ),
    };
  });
/** Manages cached linked action drafts with one non-blocking initial refresh.
 * @param reservation - Optional edited booking.
 * @param types - Ordered boundary action types.
 * @param dates - Current local booking dates.
 * @returns Local drafts, originals, serialized actions and validation controls.
 */
export const useItineraryActions = (
  reservation: Reservation | undefined,
  types: readonly EventType[],
  dates: readonly string[],
) => {
  const client = useQueryClient();
  const [originalEvents, setOriginalEvents] = useState<ItineraryAction[]>(
    () =>
      reservation?.itineraryActions ??
      client.getQueryData<EventData[]>([
        'reservation-events',
        reservation?._id,
      ]) ??
      [],
  );
  const [drafts, setDrafts] = useState<ActionDraft[]>(() =>
    buildDrafts(types, originalEvents, !reservation),
  );
  const saving = useRef(false);
  const [hasActionSnapshot] = useState(
    reservation?.itineraryActions !== undefined,
  );
  const id = reservation?._id;
  const type = reservation?.type;
  const typesKey = types.join(',');
  useEffect(() => {
    if (!id || !type || hasActionSnapshot) return;
    let ignore = false;
    void getFromApi<{ events: EventData[] }>(
      `/logistics/${paths[type]}/${id}/events`,
    )
      .then(({ events }) => {
        if (ignore || saving.current) return;
        setOriginalEvents(events);
        setDrafts(
          buildDrafts(typesKey.split(',') as EventType[], events, false),
        );
      })
      .catch(() => {
        /* Keep cached actions editable if the best-effort refresh fails. */
      });
    return () => {
      ignore = true;
    };
  }, [id, type, typesKey, hasActionSnapshot]);
  const actions: ItineraryAction[] = [];
  let error = '';
  drafts.forEach((draft, index) => {
    if (!draft.selected) return;
    const start = new Date(`${dates[index]}T${draft.start}:00.000Z`);
    const end = new Date(`${dates[index]}T${draft.end}:00.000Z`);
    if (draft.nextDay) end.setUTCDate(end.getUTCDate() + 1);
    if (
      !draft.start ||
      !draft.end ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      error =
        'Enter a start and later end time for each selected itinerary action.';
      return;
    }
    actions.push({
      eventType: draft.eventType,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  });
  if (
    actions.length === 2 &&
    new Date(actions[1].startTime) < new Date(actions[0].endTime)
  )
    error = 'Check-out or return must be after the check-in or pickup action.';
  const dateKey = dates.join('/');
  const [confirmedDates, setConfirmedDates] = useState('');
  const datesChanged = Boolean(
    reservation &&
    (dates[0] !== reservation.startTime.slice(0, 10) ||
      dates[1] !== reservation.endTime.slice(0, 10)) &&
    drafts.some((draft) => draft.selected),
  );
  if (datesChanged && confirmedDates !== dateKey)
    error = 'Review and confirm itinerary times for the changed booking dates.';
  return {
    drafts,
    setDrafts,
    actions,
    originalEvents,
    error,
    datesChanged,
    datesConfirmed: confirmedDates === dateKey,
    confirmDates: (confirmed: boolean) =>
      setConfirmedDates(confirmed ? dateKey : ''),
    startSaving: () => {
      saving.current = true;
    },
    rebase: (current: ItineraryAction[], resolved?: ItineraryAction[]) => {
      setOriginalEvents(current);
      setDrafts(buildDrafts(types, resolved ?? current, false));
    },
    loading: false,
    isError: false,
    retry: async () => undefined,
  };
};
