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
}

/**
 * Creates or updates a reservation and refreshes its category after saving.
 * @param tripId - Trip that owns the reservation.
 * @returns A React Query mutation for reservation saves.
 */
export const useSaveReservation = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, values, id }: SaveReservationVariables) => {
      const url = `/logistics/${paths[type]}`;
      const response = id
        ? await patchToApi<{ reservation: Reservation }>(`${url}/${id}`, values)
        : await postToApi<{ reservation: Reservation }>(url, {
            ...values,
            tripId,
          });
      return response.reservation;
    },
    onSuccess: async (reservation) => {
      await queryClient.invalidateQueries({
        queryKey: reservationsQueryKey(tripId, reservation.type),
      });
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
      );
      return reservation.type;
    },
    onSuccess: async (type) => {
      await queryClient.invalidateQueries({
        queryKey: reservationsQueryKey(tripId, type),
      });
    },
  });
};
