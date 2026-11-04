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
          );
        } else {
          const mutation = captureHook(
            () => useSaveReservation('trip'),
            client,
          );
          await mutation.mutateAsync({
            type: reservation.type,
            values: reservation,
            ...(operation === 'update' && { id: reservation._id }),
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
