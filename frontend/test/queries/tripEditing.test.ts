import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  changedValues,
  findEditingDocument,
  refreshTripEditingData,
} from '../../src/queries/tripEditing';
import type { TripEditingData } from '../../src/queries/tripEditing';
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
} satisfies TripEditingData;

afterEach(() => vi.resetAllMocks());
describe('trip editing refresh', () => {
  it('fetches every existing endpoint even when queries are inactive and cached data is fresh', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    client.setQueryData(['trip-settings', 'trip'], {
      ...records.trip,
      version: 0,
    });
    client.setQueryData(['trips', 'user'], [records.trip]);
    vi.mocked(getFromApi).mockImplementation(async (url) => {
      if (url === '/trip/trip') return records.trip;
      if (url === '/itinerary?id=trip') return records.itinerary;
      if (url === '/event?itinerary_id=itinerary') return records.events;
      return {
        reservations: url === '/logistics/hotels' ? records.reservations : [],
      };
    });
    const result = await refreshTripEditingData(client, 'trip');
    expect(getFromApi).toHaveBeenCalledTimes(6);
    expect(result).toEqual(records);
    expect(client.getQueryData(['trip-settings', 'trip'])).toEqual(
      records.trip,
    );
    expect(client.getQueryData(['itinerary', 'trip'])).toEqual(
      records.itinerary,
    );
    expect(client.getQueryData(['events', 'itinerary'])).toEqual(
      records.events,
    );
    expect(
      client.getQueryData(['reservations', 'trip', 'accommodations']),
    ).toEqual(records.reservations);
    client.clear();
  });

  it('does not partially replace caches when one endpoint fails', async () => {
    const client = new QueryClient();
    const original = { ...records.trip, version: 0 };
    client.setQueryData(['trip-settings', 'trip'], original);
    vi.mocked(getFromApi).mockImplementation(async (url) => {
      if (url === '/trip/trip') return records.trip;
      if (url === '/itinerary?id=trip') return records.itinerary;
      if (url === '/event?itinerary_id=itinerary')
        throw new Error('Unavailable');
      return { reservations: [] };
    });
    await expect(refreshTripEditingData(client, 'trip')).rejects.toThrow(
      'Unavailable',
    );
    expect(client.getQueryData(['trip-settings', 'trip'])).toEqual(original);
    client.clear();
  });

  it('finds the exact document without substituting another booking', () => {
    expect(findEditingDocument(records, 'event', 'event')?.version).toBe(4);
    expect(findEditingDocument(records, 'reservation', 'hotel')?.version).toBe(
      5,
    );
    expect(
      findEditingDocument(records, 'reservation', 'deleted'),
    ).toBeUndefined();
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
