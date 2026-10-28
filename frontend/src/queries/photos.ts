import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  deleteFromApi,
  getApiErrorMessage,
  getBlobFromApi,
  getFromApi,
  postToApi,
} from '../utils/api';

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
  contentUrl: string;
}

interface PhotoPage {
  photos: TripPhoto[];
  nextCursor: string | null;
}

/** Loads album pages in server order, retaining opaque pagination cursors.
 * @param tripId - Trip whose private album is requested.
 * @returns Cached pages, loading state, and pagination controls.
 */
export const usePhotos = (tripId: string) =>
  useInfiniteQuery({
    queryKey: ['photos', tripId],
    queryFn: ({ pageParam }) =>
      getFromApi<PhotoPage>(`/trip/${tripId}/photos`, {
        params: { limit: 60, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(tripId),
  });

/** Fetches image bytes with bearer authentication, never through a public URL.
 * @param photo - Photo metadata containing its protected content path.
 * @param enabled - Defers downloading off-screen images.
 * @returns A shared, short-lived binary query for the photo.
 */
export const usePhotoContent = (photo: TripPhoto, enabled: boolean) =>
  useQuery({
    queryKey: ['photo-content', photo.trip, photo.id],
    queryFn: () => getBlobFromApi(photo.contentUrl),
    enabled,
    staleTime: 60_000,
    gcTime: 60_000,
    retry: false,
  });

/** Deletes a selection independently, refreshing shared data even after partial failure.
 * @param tripId - Trip containing the selected photos.
 * @returns A batch mutation reporting successful IDs and retryable failures.
 */
export const useDeletePhotos = (tripId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      const deletedIds: string[] = [];
      const failures: { id: string; message: string }[] = [];
      for (const id of ids) {
        try {
          await deleteFromApi<void>(`/trip/${tripId}/photos/${id}`);
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
        ['photos', tripId],
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
          queryKey: ['photo-content', tripId, id],
          exact: true,
        }),
      );
      await client.invalidateQueries({ queryKey: ['photos', tripId] });
    },
  });
};

/**
 * Sends one original photo for server-side normalization and refreshes album data.
 * @param tripId - Trip receiving the photo.
 * @returns A React Query upload mutation; callers serialize multi-file selections.
 */
export const useUploadPhoto = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('image', file);
      return postToApi<{ photo: TripPhoto }>(`/trip/${tripId}/photos`, body);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['photos', tripId] }),
  });
};
