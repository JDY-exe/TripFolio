import { changedValues, useTripEditing } from './tripEditing';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFromApi, getFromApi, patchToApi, postToApi } from '../utils/api';

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
  rentals?: { company: string };
  accommodations?: { address: string };
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
  > & { cost?: number | null };

const paths: Record<ReservationType, string> = {
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

interface SaveReservationVariables {
  type: ReservationType;
  values: ReservationInput;
  id?: string;
  baseline?: Reservation;
}

/**
 * Creates or updates a reservation and refreshes its category after saving.
 * @param tripId - Trip that owns the reservation.
 * @returns A React Query mutation for reservation saves.
 */
export const useSaveReservation = (tripId: string) => {
  const queryClient = useQueryClient();
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async ({
      type,
      values,
      id,
      baseline,
    }: SaveReservationVariables) => {
      const url = `/logistics/${paths[type]}`;
      if (!editing) throw new Error('Trip editing is unavailable.');
      if (id && baseline) {
        const patch = changedValues(
          {
            ...baseline,
            confirmationNumber: baseline.confirmationNumber ?? '',
            notes: baseline.notes ?? '',
            cost: baseline.cost ?? null,
          },
          values,
        );
        // Flight summary dates belong to the ordered journey, not an independent patch.
        if (type === ReservationType.Flights && !patch.flights) {
          delete patch.startTime;
          delete patch.endTime;
        }
        const response = await editing.write({
          kind: 'reservation',
          baseline,
          draft: patch,
          send: (expectedVersion) =>
            patchToApi<{ reservation: Reservation }>(`${url}/${id}`, {
              ...patch,
              expectedVersion,
            }),
        });
        return response.reservation;
      }
      if (id) throw new Error('The original reservation is required.');
      await editing.refresh();
      const response = await postToApi<{ reservation: Reservation }>(url, {
        ...values,
        tripId,
      });
      return response.reservation;
    },
    onSuccess: async (reservation, variables) => {
      if (variables.baseline) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: reservationsQueryKey(tripId, reservation.type),
        }),
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
        queryClient.invalidateQueries({ queryKey: ['trip-settings', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['public-itinerary'] }),
        queryClient.invalidateQueries({ queryKey: ['public-itinerary-feed'] }),
      ]);
    },
  });
};

/**
 * Deletes a reservation and refreshes affected entities after removal.
 * @returns A React Query mutation for reservation deletion.
 */
export const useDeleteReservation = () => {
  const editing = useTripEditing();
  return useMutation({
    mutationFn: async (reservation: Reservation) => {
      if (!editing) throw new Error('Trip editing is unavailable.');
      await editing.write({
        kind: 'reservation',
        baseline: reservation,
        draft: {},
        deleting: true,
        send: (expectedVersion) =>
          deleteFromApi(
            `/logistics/${paths[reservation.type]}/${reservation._id}`,
            { data: { expectedVersion } },
          ),
      });
      return reservation.type;
    },
  });
};
