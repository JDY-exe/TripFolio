import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { deletePhotoWithRetry } from '../utils/photoDeletion';
import {
  getApiErrorMessage,
  getBlobFromApi,
  getFromApi,
  postToApi,
} from '../utils/api';

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

export interface TripPhoto {
  id: string;
  trip: string;
  uploadedBy: string;
  originalName: string;
  contentType: 'image/webp';
  byteLength: number;
  width: number;
  height: number;
  createdAt: string;
  /** Camera-local ISO capture time without an inferred timezone; absent on legacy photos. */
  takenAt?: string | null;
  contentUrl: string;
  location: PhotoLocation | null;
  linkedEvent: string | null;
}

interface PhotoPage {
  photos: TripPhoto[];
  nextCursor: string | null;
}

/** Builds an account-scoped album cache key.
 * @param userId - Authenticated account whose permissions apply to the album.
 * @param tripId - Trip containing the photos.
 * @returns The private album query key shared by queries and mutations.
 */
const photosQueryKey = (userId: string | undefined, tripId: string) =>
  ['photos', userId, tripId] as const;

/** Builds an account-scoped cache key for protected photo bytes.
 * @param userId - Authenticated account requesting the image.
 * @param tripId - Trip containing the photo.
 * @param photoId - Photo whose bytes are cached.
 * @returns The private image query key shared by queries and mutations.
 */
export const photoContentQueryKey = (
  userId: string | undefined,
  tripId: string,
  photoId: string,
) => ['photo-content', userId, tripId, photoId] as const;

/** Loads album pages in server order, retaining opaque pagination cursors.
 * @param tripId - Trip whose private album is requested.
 * @returns Cached pages, loading state, and pagination controls.
 */
export const usePhotos = (tripId: string) => {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: photosQueryKey(user?.id, tripId),
    queryFn: ({ pageParam }) =>
      getFromApi<PhotoPage>(`/trip/${tripId}/photos`, {
        params: { limit: 60, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(user?.id && tripId),
  });
};

/** Shares protected image loading between gallery hooks and on-demand exporters.
 * @param userId - Account whose permissions apply to these private bytes.
 * @param photo - Metadata with its authenticated content path.
 * @returns Account-scoped query options, retaining bytes briefly without public URLs.
 */
export const photoContentOptions = (
  userId: string | undefined,
  photo: TripPhoto,
) => ({
  queryKey: photoContentQueryKey(userId, photo.trip, photo.id),
  queryFn: () => getBlobFromApi(photo.contentUrl),
  staleTime: 60_000,
  gcTime: 60_000,
  retry: false as const,
});

/** Fetches image bytes with bearer authentication, never through a public URL.
 * @param photo - Photo metadata containing its protected content path.
 * @param enabled - Defers downloading off-screen images.
 * @returns A shared, short-lived binary query for the photo.
 */
export const usePhotoContent = (photo: TripPhoto, enabled: boolean) => {
  const { user } = useAuth();
  return useQuery({
    ...photoContentOptions(user?.id, photo),
    enabled: enabled && Boolean(user?.id),
  });
};

/** Deletes each selected photo with transient retries before refreshing shared data.
 * @param tripId - Trip containing the selected photos.
 * @returns A batch mutation reporting successful IDs and retryable failures.
 */
export const useDeletePhotos = (tripId: string) => {
  const { user } = useAuth();
  const client = useQueryClient();
  const deletionController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    deletionController.current = controller;
    return () => controller.abort();
  }, [user?.id, tripId]);

  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      const signal = deletionController.current?.signal;
      if (!signal || !user)
        throw new Error('An active album session is required.');
      const deletedIds: string[] = [];
      const failures: { id: string; message: string }[] = [];
      for (const id of ids) {
        try {
          await deletePhotoWithRetry(`/trip/${tripId}/photos/${id}`, signal);
          deletedIds.push(id);
        } catch (error) {
          failures.push({
            id,
            message: getApiErrorMessage(
              error,
              'Could not delete this photo. Please try again.',
            ),
          });
        }
      }
      return { deletedIds, failures };
    },
    onSuccess: async ({ deletedIds }) => {
      const removed = new Set(deletedIds);
      client.setQueryData<InfiniteData<PhotoPage>>(
        photosQueryKey(user?.id, tripId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              photos: page.photos.filter((photo) => !removed.has(photo.id)),
            })),
          },
      );
      deletedIds.forEach((id) =>
        client.removeQueries({
          queryKey: photoContentQueryKey(user?.id, tripId, id),
          exact: true,
        }),
      );
      await client.invalidateQueries({
        queryKey: photosQueryKey(user?.id, tripId),
      });
    },
  });
};

/**
 * Sends one original photo for server-side normalization and refreshes album data.
 * @param tripId - Trip receiving the photo.
 * @returns A React Query upload mutation; callers serialize multi-file selections.
 */
export const useUploadPhoto = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, eventId }: { file: File, eventId?: string }) => {
      const body = new FormData();
      body.append('image', file);
      
      // Send the eventId safely in the URL query string to bypass strict body limits
      const url = eventId 
        ? `/trip/${tripId}/photos?eventId=${eventId}`
        : `/trip/${tripId}/photos`;
        
      return postToApi<{ photo: TripPhoto }>(url, body);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: photosQueryKey(user?.id, tripId),
      }),
  });
};
