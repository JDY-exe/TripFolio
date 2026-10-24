import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  changedValues,
  refreshEditingDocument,
} from '../../src/queries/tripEditing';
import { getFromApi } from '../../src/utils/api';

vi.mock('../../src/utils/api', () => ({
  getFromApi: vi.fn(),
  patchToApi: vi.fn(),
  postToApi: vi.fn(),
  deleteFromApi: vi.fn(),
}));
const records = {
  trip: {
    _id: 'trip',
    version: 2,
    name: 'Trip',
    isPublic: false,
    currentUserRole: 'owner',
    startDate: '2030-01-01',
    endDate: '2030-01-02',
  },
  itinerary: {
    _id: 'itinerary',
    version: 3,
    title: 'Plans',
    description: 'Fresh',
    startDate: '2030-01-01',
    endDate: '2030-01-02',
  },
  events: [
    {
      _id: 'event',
      version: 4,
      title: 'Event',
      address: 'Address',
      startTime: '2030-01-01T09:00Z',
      endTime: '2030-01-01T10:00Z',
    },
  ],
  reservations: [
    {
      _id: 'hotel',
      version: 5,
      type: 'accommodations',
      name: 'Hotel',
      startTime: '2030-01-01',
      endTime: '2030-01-02',
    },
  ],
} as const;

afterEach(() => vi.resetAllMocks());
describe('trip editing refresh', () => {
  it('refreshes only the itinerary even when its cached query is fresh and inactive', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    client.setQueryData(['itinerary', 'trip'], {
      ...records.itinerary,
      version: 0,
    });
    client.setQueryData(['events', 'itinerary'], records.events);
    vi.mocked(getFromApi).mockResolvedValue(records.itinerary);
    expect(
      await refreshEditingDocument(client, 'trip', {
        kind: 'itinerary',
        id: 'itinerary',
      }),
    ).toEqual(records.itinerary);
    expect(getFromApi).toHaveBeenCalledExactlyOnceWith('/itinerary?id=trip');
    expect(client.getQueryData(['events', 'itinerary'])).toEqual(
      records.events,
    );
    expect(client.getQueryData(['itinerary', 'trip'])).toEqual(
      records.itinerary,
    );
    client.clear();
  });

  it('updates the trip detail and list caches without reading child endpoints', async () => {
    const client = new QueryClient();
    client.setQueryData(['trips', 'user'], [{ ...records.trip, version: 0 }]);
    vi.mocked(getFromApi).mockResolvedValue(records.trip);
    await refreshEditingDocument(client, 'trip', { kind: 'trip', id: 'trip' });
    expect(getFromApi).toHaveBeenCalledExactlyOnceWith('/trip/trip');
    expect(client.getQueryData(['trip-settings', 'trip'])).toEqual(
      records.trip,
    );
    expect(client.getQueryData(['trips', 'user'])).toEqual([records.trip]);
    client.clear();
  });

  it('requests only the edited event and preserves its siblings in the cache', async () => {
    const client = new QueryClient();
    const sibling = { ...records.events[0], _id: 'sibling' };
    client.setQueryData(['itinerary', 'trip'], records.itinerary);
    client.setQueryData(
      ['events', 'itinerary'],
      [{ ...records.events[0], version: 0 }, sibling],
    );
    vi.mocked(getFromApi).mockResolvedValue(records.events);
    expect(
      await refreshEditingDocument(client, 'trip', {
        kind: 'event',
        id: 'event',
      }),
    ).toEqual(records.events[0]);
    expect(getFromApi).toHaveBeenCalledExactlyOnceWith(
      '/event?itinerary_id=itinerary&id=event',
    );
    expect(client.getQueryData(['events', 'itinerary'])).toEqual([
      records.events[0],
      sibling,
    ]);
    client.clear();
  });

  it('refreshes one reservation category and document without touching other categories', async () => {
    const client = new QueryClient();
    const sibling = { ...records.reservations[0], _id: 'sibling' };
    client.setQueryData(['reservations', 'trip', 'accommodations'], [sibling]);
    client.setQueryData(['reservations', 'trip', 'flights'], []);
    vi.mocked(getFromApi).mockResolvedValue({
      reservations: records.reservations,
    });
    await refreshEditingDocument(client, 'trip', {
      kind: 'reservation',
      id: 'hotel',
      type: 'accommodations',
    });
    expect(getFromApi).toHaveBeenCalledExactlyOnceWith('/logistics/hotels', {
      params: { tripId: 'trip', id: 'hotel' },
    });
    expect(
      client.getQueryData(['reservations', 'trip', 'accommodations']),
    ).toEqual([sibling, records.reservations[0]]);
    expect(client.getQueryData(['reservations', 'trip', 'flights'])).toEqual(
      [],
    );
    client.clear();
  });

  it('removes only the deleted document from its collection', async () => {
    const client = new QueryClient();
    const sibling = { ...records.events[0], _id: 'sibling' };
    client.setQueryData(['itinerary', 'trip'], records.itinerary);
    client.setQueryData(['events', 'itinerary'], [...records.events, sibling]);
    vi.mocked(getFromApi).mockResolvedValue([]);
    expect(
      await refreshEditingDocument(client, 'trip', {
        kind: 'event',
        id: 'event',
      }),
    ).toBeUndefined();
    expect(client.getQueryData(['events', 'itinerary'])).toEqual([sibling]);
    client.clear();
  });

  it('does not create a partial collection cache from a single-document response', async () => {
    const client = new QueryClient();
    vi.mocked(getFromApi).mockResolvedValue({
      reservations: records.reservations,
    });
    expect(
      await refreshEditingDocument(client, 'trip', {
        kind: 'reservation',
        id: 'hotel',
        type: 'accommodations',
      }),
    ).toEqual(records.reservations[0]);
    expect(
      client.getQueryData(['reservations', 'trip', 'accommodations']),
    ).toBeUndefined();
    client.clear();
  });

  it('preserves the cached document when its refresh fails', async () => {
    const client = new QueryClient();
    client.setQueryData(['itinerary', 'trip'], records.itinerary);
    vi.mocked(getFromApi).mockRejectedValue(new Error('Unavailable'));
    await expect(
      refreshEditingDocument(client, 'trip', {
        kind: 'itinerary',
        id: 'itinerary',
      }),
    ).rejects.toThrow('Unavailable');
    expect(client.getQueryData(['itinerary', 'trip'])).toEqual(
      records.itinerary,
    );
    client.clear();
  });

  it('omits unchanged draft fields while retaining explicit clears', () => {
    expect(
      changedValues(
        {
          name: 'Hotel',
          notes: 'Old',
          cost: 20,
          accommodations: { address: 'Road' },
        },
        {
          name: 'Hotel',
          notes: '',
          cost: null,
          accommodations: { address: 'Road' },
        },
      ),
    ).toEqual({ notes: '', cost: null });
  });
});
