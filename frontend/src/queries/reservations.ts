import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFromApi, getFromApi, postToApi } from '../utils/api';
import {
  createCheckedPatch,
  equalField,
  saveChecked,
} from '../utils/checkedSave';
import { eventsQueryKey } from './events';
import type { EventData, ItineraryAction } from './events';

/** Reservation categories recognized by the logistics API. */
export const ReservationType = {
  Flights: 'flights',
  Rentals: 'rentals',
  Accommodations: 'accommodations',
} as const;

export type ReservationType =
  (typeof ReservationType)[keyof typeof ReservationType];

export interface FlightSegment {
  flightNum: string;
  departAirport: string;
  departTime: string;
  arriveAirport: string;
  arriveTime: string;
}

export interface Reservation {
  version: number;
  itineraryActions?: ItineraryAction[];
  _id: string;
  type: ReservationType;
  name: string;
  startTime: string;
  endTime: string;
  confirmationNumber?: string;
  cost?: number | null;
  notes?: string;
  flights?: {
    airline?: string;
    flightNum?: string;
    departAirport: string;
    arriveAirport: string;
    segments: FlightSegment[];
  };
  rentals?: {
    company: string;
    pickupAddress?: string;
    pickupPlaceId?: string | null;
    returnAddress?: string;
    returnPlaceId?: string | null;
  };
  accommodations?: { address: string; placeId?: string | null };
}

export type ReservationInput = Pick<
  Reservation,
  'name' | 'startTime' | 'endTime'
> &
  Partial<
    Pick<
      Reservation,
      'confirmationNumber' | 'notes' | 'flights' | 'rentals' | 'accommodations'
    >
  > & { cost?: number | null; itineraryActions?: ItineraryAction[] };

export const paths: Record<ReservationType, string> = {
  [ReservationType.Flights]: ReservationType.Flights,
  [ReservationType.Rentals]: 'rental_cars',
  [ReservationType.Accommodations]: 'hotels',
};

/**
 * Creates a trip and reservation type scoped cache key.
 * @param tripId - Trip owning the reservations.
 * @param type - Reservation category.
 * @returns The React Query cache key.
 */
export const reservationsQueryKey = (tripId?: string, type?: ReservationType) =>
  ['reservations', tripId, type] as const;

/**
 * Loads one category of reservations for a trip.
 * @param tripId - Trip identifier, if available.
 * @param type - Reservation category to load.
 * @returns Reservation records and query status.
 */
export const useReservations = (
  tripId: string | undefined,
  type: ReservationType,
) => {
  const query = useQuery({
    queryKey: reservationsQueryKey(tripId, type),
    queryFn: async () => {
      const response = await getFromApi<{ reservations: Reservation[] }>(
        `/logistics/${paths[type]}`,
        { params: { tripId } },
      );
      return response.reservations;
    },
    enabled: Boolean(tripId),
  });

  return {
    reservations: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
};

/** Loads linked action slots before editing a reservation, including legacy entries.
 * @param reservation - Existing booking, absent when creating.
 * @returns Query state and the linked event collection.
 */
export const useReservationEvents = (reservation?: Reservation) =>
  useQuery({
    queryKey: ['reservation-events', reservation?._id],
    enabled: Boolean(reservation),
    queryFn: async () =>
      (
        await getFromApi<{ events: EventData[] }>(
          `/logistics/${paths[reservation!.type]}/${reservation!._id}/events`,
        )
      ).events,
  });

interface SaveReservationVariables {
  type: ReservationType;
  values: ReservationInput;
  id?: string;
  original?: Reservation;
  originalEvents?: ItineraryAction[];
  onRebase?: (current: Reservation, changes: Record<string, unknown>) => void;
}

/**
 * Creates or updates a reservation and refreshes its category after saving.
 * @param tripId - Trip that owns the reservation.
 * @returns A React Query mutation for reservation saves.
 */
export const useSaveReservation = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      type,
      values,
      id,
      original,
      originalEvents,
      onRebase,
    }: SaveReservationVariables) => {
      const url = `/logistics/${paths[type]}`;
      const editable: Record<string, unknown> = Object.fromEntries(
        Object.entries(values).filter(([key]) =>
          [
            'name',
            'startTime',
            'endTime',
            'notes',
            'cost',
            'confirmationNumber',
          ].includes(key),
        ),
      );
      for (const [key, value] of Object.entries(values[type] || {}))
        editable[`${type}.${key}`] = value;
      if (type === 'flights') {
        for (const key of [
          'startTime',
          'endTime',
          'flights.flightNum',
          'flights.departAirport',
          'flights.arriveAirport',
        ])
          delete editable[key];
      } else if (original) {
        // These editors expose booking calendar dates, not the stored clock time.
        for (const key of ['startTime', 'endTime'] as const) {
          if (values[key].slice(0, 10) === original[key].slice(0, 10))
            delete editable[key];
        }
      }
      const groups =
        type === 'accommodations'
          ? [['accommodations.address', 'accommodations.placeId']]
          : type === 'rentals'
            ? [
                ['rentals.pickupAddress', 'rentals.pickupPlaceId'],
                ['rentals.returnAddress', 'rentals.returnPlaceId'],
              ]
            : [];
      const savedActions =
        originalEvents?.map(
          ({ _id, version, eventType, startTime, endTime }) => ({
            _id,
            version,
            eventType,
            startTime,
            endTime,
          }),
        ) ?? original?.itineraryActions;
      if (
        type === 'flights' &&
        id &&
        savedActions &&
        (!equalField(original?.startTime, values.startTime) ||
          !equalField(original?.endTime, values.endTime))
      ) {
        editable.itineraryActions = savedActions.map((action) => ({
          ...action,
          startTime: values.startTime,
          endTime: values.endTime,
        }));
      }
      const actionsChanged =
        values.itineraryActions !== undefined &&
        !equalField(
          savedActions?.map(({ eventType, startTime, endTime }) => ({
            eventType,
            startTime,
            endTime,
          })),
          values.itineraryActions?.map(({ eventType, startTime, endTime }) => ({
            eventType,
            startTime,
            endTime,
          })),
        );
      if (actionsChanged) editable.itineraryActions = values.itineraryActions;
      const snapshot = original
        ? { ...original, itineraryActions: savedActions ?? [] }
        : undefined;
      const response = id
        ? await saveChecked<{ reservation: Reservation }>(
            `${url}/${id}`,
            createCheckedPatch(snapshot!, editable, groups),
            {},
            (current, changes) =>
              onRebase?.(current as unknown as Reservation, changes),
          )
        : await postToApi<{ reservation: Reservation }>(url, {
            ...values,
            tripId,
          });
      return response.reservation;
    },
    onSuccess: async (reservation) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: reservationsQueryKey(tripId, reservation.type),
        }),
        queryClient.invalidateQueries({ queryKey: ['reservation-events'] }),
        queryClient.invalidateQueries({
          queryKey: eventsQueryKey().slice(0, 1),
        }),
      ]);
    },
  });
};

/**
 * Deletes a reservation and refreshes its category after removal.
 * @param tripId - Trip that owns the reservation.
 * @returns A React Query mutation for reservation deletion.
 */
export const useDeleteReservation = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: Reservation) => {
      await deleteFromApi(
        `/logistics/${paths[reservation.type]}/${reservation._id}`,
        { data: { expectedVersion: reservation.version } },
      );
      return reservation.type;
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: reservationsQueryKey(tripId),
      });
    },
    onSuccess: async (type) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: reservationsQueryKey(tripId, type),
        }),
        queryClient.invalidateQueries({
          queryKey: eventsQueryKey().slice(0, 1),
        }),
      ]);
    },
  });
};
