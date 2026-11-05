import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ReservationType,
  reservationsQueryKey,
  useDeleteReservation,
  useSaveReservation,
  type Reservation,
} from '../../src/queries/reservations';
import { eventsQueryKey } from '../../src/queries/events';
import { deleteFromApi, patchToApi, postToApi } from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  getFromApi: vi.fn(),
  postToApi: vi.fn(),
  patchToApi: vi.fn(),
  deleteFromApi: vi.fn(),
}));

const reservation: Reservation = {
  _id: 'reservation',
  version: 0,
  type: ReservationType.Accommodations,
  name: 'Hotel',
  startTime: '2027-04-01T15:00:00Z',
  endTime: '2027-04-05T11:00:00Z',
  accommodations: { address: 'Hotel address' },
};

/** Captures a mutation hook under its real query provider without needing a browser.
 * @param useHook - Mutation hook to exercise.
 * @param client - Query client containing fresh cached entity data.
 * @returns The mutation's public API.
 */
const captureHook = <T>(useHook: () => T, client: QueryClient): T => {
  let result: T;
  /** Reads the hook while rendering inside its query provider. */
  const Probe = () => {
    result = useHook();
    return null;
  };
  renderToString(
    createElement(QueryClientProvider, { client }, createElement(Probe)),
  );
  return result!;
};

afterEach(() => vi.resetAllMocks());

describe('reservation mutation cache consistency', () => {
  it('checks linked flight slots when changing journey times', async () => {
    const client = new QueryClient();
    const flight: Reservation = {
      ...reservation,
      type: ReservationType.Flights,
      version: 3,
      startTime: '2027-04-01T09:00:00.000Z',
      endTime: '2027-04-01T10:00:00.000Z',
      itineraryActions: [
        {
          eventType: 'flight',
          startTime: '2027-04-01T09:00:00.000Z',
          endTime: '2027-04-01T10:00:00.000Z',
        },
      ],
      flights: {
        departAirport: 'IND',
        arriveAirport: 'MIA',
        segments: [
          {
            flightNum: 'A1',
            departAirport: 'IND',
            arriveAirport: 'MIA',
            departTime: '2027-04-01T09:00',
            arriveTime: '2027-04-01T10:00',
          },
        ],
      },
    };
    vi.mocked(patchToApi).mockResolvedValue({ reservation: flight });
    try {
      const mutation = captureHook(() => useSaveReservation('trip'), client);
      await mutation.mutateAsync({
        type: flight.type,
        id: flight._id,
        original: flight,
        values: {
          name: flight.name,
          startTime: '2027-04-01T11:00:00.000Z',
          endTime: '2027-04-01T12:00:00.000Z',
          flights: {
            ...flight.flights!,
            segments: [
              {
                ...flight.flights!.segments[0],
                departTime: '2027-04-01T11:00',
                arriveTime: '2027-04-01T12:00',
              },
            ],
          },
        },
      });
      expect(patchToApi).toHaveBeenCalledWith(
        '/logistics/flights/reservation',
        expect.objectContaining({
          expectedVersion: 3,
          changes: expect.objectContaining({
            itineraryActions: [
              {
                eventType: 'flight',
                startTime: '2027-04-01T11:00:00.000Z',
                endTime: '2027-04-01T12:00:00.000Z',
              },
            ],
          }),
          original: expect.objectContaining({
            itineraryActions: flight.itineraryActions,
          }),
        }),
      );
    } finally {
      client.clear();
    }
  });
  for (const operation of ['create', 'update', 'delete'] as const) {
    it(`${operation} invalidates fresh reservation and event queries`, async () => {
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity } },
      });
      const reservationKey = reservationsQueryKey('trip', reservation.type);
      const eventKey = eventsQueryKey('itinerary');
      client.setQueryData(reservationKey, [reservation]);
      client.setQueryData(eventKey, [{ _id: 'linked-event' }]);
      vi.mocked(postToApi).mockResolvedValue({ reservation });
      vi.mocked(patchToApi).mockResolvedValue({ reservation });
      vi.mocked(deleteFromApi).mockResolvedValue(undefined);
      try {
        if (operation === 'delete') {
          const mutation = captureHook(
            () => useDeleteReservation('trip'),
            client,
          );
          await mutation.mutateAsync(reservation);
          expect(deleteFromApi).toHaveBeenCalledWith(
            '/logistics/hotels/reservation',
            { data: { expectedVersion: 0 } },
          );
        } else {
          const mutation = captureHook(
            () => useSaveReservation('trip'),
            client,
          );
          await mutation.mutateAsync({
            type: reservation.type,
            values: reservation,
            ...(operation === 'update' && {
              id: reservation._id,
              original: reservation,
            }),
          });
          expect(
            operation === 'create' ? postToApi : patchToApi,
          ).toHaveBeenCalledOnce();
        }
        expect(client.getQueryState(reservationKey)?.isInvalidated).toBe(true);
        expect(client.getQueryState(eventKey)?.isInvalidated).toBe(true);
      } finally {
        client.clear();
      }
    });
  }
});
