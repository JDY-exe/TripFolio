import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { EventData } from './events';
import { getFromApi, patchToApi, postToApi } from '../utils/api';

export interface Itinerary {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface ArchivedItineraryNote {
  _id: string;
  tripId: string;
  itineraryId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Creates an archived-note cache key isolated by user and trip. */
export const archivedItineraryNoteQueryKey = (
  userId?: string,
  tripId?: string,
) => ['archived-itinerary-note', userId, tripId] as const;

/**
 * Loads the current user's note for one archived trip.
 * @param userId - Authenticated user identifier; disables the query when absent.
 * @param tripId - Archived trip identifier; disables the query when absent.
 * @returns The private note and query status, or null when no note exists.
 */
export const useArchivedItineraryNote = (userId?: string, tripId?: string) => {
  const query = useQuery({
    queryKey: archivedItineraryNoteQueryKey(userId, tripId),
    queryFn: () =>
      getFromApi<ArchivedItineraryNote | null>(`/itinerary/${tripId}/notes`),
    enabled: Boolean(userId && tripId),
  });

  return {
    note: query.data,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
};

interface SaveArchivedItineraryNoteInput {
  content: string;
  noteId?: string;
}

/**
 * Creates or updates a private archived-itinerary note and synchronizes its cache.
 * @param userId - Authenticated user owning the note cache.
 * @param tripId - Archived trip containing the note.
 * @returns A mutation accepting note content and the existing note ID, if present.
 */
export const useSaveArchivedItineraryNote = (
  userId: string,
  tripId: string,
) => {
  const queryClient = useQueryClient();
  const queryKey = archivedItineraryNoteQueryKey(userId, tripId);

  return useMutation({
    mutationFn: ({ content, noteId }: SaveArchivedItineraryNoteInput) =>
      noteId
        ? patchToApi<ArchivedItineraryNote>(`/itinerary/${tripId}/notes`, {
            content,
          })
        : postToApi<ArchivedItineraryNote>(`/itinerary/${tripId}/notes`, {
            content,
          }),
    onSuccess: (note) => {
      queryClient.setQueryData(queryKey, note);
    },
  });
};

export interface PublicItineraryTraveler {
  id: string;
  username: string;
  profile_picture?: string | null;
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
  votes?: number;
  hasUpvoted?: boolean;
  hasDownvoted?: boolean;
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
  travelers: PublicItineraryTraveler[];
  itinerary: Itinerary;
  events: EventData[];
}

/** Creates a cache key for each user's location-filtered feed. */
export const publicItineraryFeedQueryKey = (userId?: string, location = '') =>
  ['public-itinerary-feed', userId, location] as const;

/** Loads public itineraries filtered by location as the user scrolls.
 * @param userId - Authenticated account ID.
 * @param location - Optional location search filter.
 * @returns Infinite-query pages and controls for loading subsequent pages.
 */
export const usePublicItineraryFeed = (userId?: string, location = '') =>
  useInfiniteQuery({
    queryKey: publicItineraryFeedQueryKey(userId, location),
    queryFn: ({ pageParam }) =>
      getFromApi<PublicItineraryFeedPage>('/api/itineraries/feed', {
        params: {
          page: pageParam,
          limit: 10,
          ...(location.trim() ? { location: location.trim() } : {}),
        },
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
  const {
    data: itinerary,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: itineraryQueryKey(tripId),
    queryFn: () => getFromApi<Itinerary>(`/itinerary?id=${tripId}`),
    enabled: Boolean(tripId),
  });

  return { itinerary, isPending, isError, refetch };
};
