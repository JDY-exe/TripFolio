import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLoading } from '../contexts/LoadingContext';
import type { EventData } from './events';
import { getFromApi } from '../utils/api';

export interface Itinerary {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface PublicItineraryOwner {
  id: string;
  username: string;
  profile_picture?: string | null;
}

export interface PublicItineraryFeedItem {
  tripId: string;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  isFriend: boolean;
  createdAt: string;
  owner: PublicItineraryOwner | null;
  itinerary: Itinerary;
}

export interface PublicItineraryFeedPage {
  items: PublicItineraryFeedItem[];
  nextPage: number | null;
}

export interface PublicItineraryDetails {
  trip: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  owner: PublicItineraryOwner | null;
  itinerary: Itinerary;
  events: EventData[];
}

/** Creates an account-scoped key for the paginated public itinerary feed. */
export const publicItineraryFeedQueryKey = (userId?: string) =>
  ['public-itinerary-feed', userId] as const;

/** Loads ranked public itinerary pages as the user scrolls the Social feed.
 * @param userId - Authenticated account ID; disables fetching when absent.
 * @returns Infinite-query pages and controls for loading subsequent pages.
 */
export const usePublicItineraryFeed = (userId?: string) =>
  useInfiniteQuery({
    queryKey: publicItineraryFeedQueryKey(userId),
    queryFn: ({ pageParam }) =>
      getFromApi<PublicItineraryFeedPage>('/api/itineraries/feed', {
        params: { page: pageParam, limit: 10 },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: Boolean(userId),
  });

/** Creates the cache key for a public itinerary detail view. */
export const publicItineraryQueryKey = (tripId?: string) =>
  ['public-itinerary', tripId] as const;

/** Loads a public itinerary and its events through the read-only API.
 * @param tripId - Public trip identifier; disables fetching when absent.
 * @returns Public trip, owner, itinerary, and event data with query state.
 */
export const usePublicItinerary = (tripId?: string) =>
  useQuery({
    queryKey: publicItineraryQueryKey(tripId),
    queryFn: () =>
      getFromApi<PublicItineraryDetails>(`/api/itineraries/${tripId}`),
    enabled: Boolean(tripId),
  });

/** Creates the cache key for a trip's itinerary. */
export const itineraryQueryKey = (tripId?: string) =>
  ['itinerary', tripId] as const;

/** Loads a trip's itinerary and returns its data and query state by name.
 * @param tripId - Trip identifier; disables the query when absent.
 * @returns Itinerary data, loading and error state, and a retry function.
 */
export const useItinerary = (tripId?: string) => {
  const { setLoading } = useLoading();
  const {
    data: itinerary,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: itineraryQueryKey(tripId),
    queryFn: async () => {
      setLoading(true);
      try {
        return await getFromApi<Itinerary>(`/itinerary?id=${tripId}`);
      } finally {
        setLoading(false);
      }
    },
    enabled: Boolean(tripId),
  });

  return { itinerary, isPending, isError, refetch };
};
