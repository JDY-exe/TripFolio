import { useEffect, useRef, useState } from 'react';
import { useReservationEvents } from '../../../queries/reservations';
import type { Reservation } from '../../../queries/reservations';
import type { EventType, ItineraryAction } from '../../../queries/events';

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
/** Manages explicit booking-boundary time slots, loading existing entries before editing.
 * @param reservation - Optional booking being edited.
 * @param types - Ordered start/end action types.
 * @param dates - Booking start/end calendar dates.
 * @returns Draft controls, query status, serialized actions, and validation error.
 */
export const useItineraryActions = (
  reservation: Reservation | undefined,
  types: readonly EventType[],
  dates: readonly string[],
) => {
  const query = useReservationEvents(reservation);
  const initialized = useRef(false);
  const [ready, setReady] = useState(!reservation);
  const [drafts, setDrafts] = useState<ActionDraft[]>(() =>
    types.map((eventType) => ({
      eventType,
      selected: !reservation,
      start: '',
      end: '',
      nextDay: false,
    })),
  );
  useEffect(() => {
    // Do not restore an action from stale cached data while a fresh read is in flight.
    if (!query.data || query.isFetching || query.isError || initialized.current)
      return;
    initialized.current = true;
    setReady(true);
    setDrafts((current) =>
      current.map((draft) => {
        const event = query.data.find(
          (item) => item.eventType === draft.eventType,
        );
        return event
          ? {
              ...draft,
              selected: true,
              start: event.startTime.slice(11, 16),
              end: event.endTime.slice(11, 16),
              nextDay:
                event.endTime.slice(0, 10) > event.startTime.slice(0, 10),
            }
          : draft;
      }),
    );
  }, [query.data, query.isFetching, query.isError]);
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
    error,
    datesChanged,
    datesConfirmed: confirmedDates === dateKey,
    confirmDates: (confirmed: boolean) =>
      setConfirmedDates(confirmed ? dateKey : ''),
    loading: Boolean(reservation && (query.isPending || !ready)),
    isError: query.isError,
    retry: query.refetch,
  };
};
