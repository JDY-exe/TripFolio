import { useEffect, useMemo, useState } from 'react';
import { useEvents } from '../../../../queries/events';
import { useItinerary } from '../../../../queries/itineraries';
import { usePhotos } from '../../../../queries/photos';
import { useTripDetails } from '../../../../queries/trips';
import type { RecapKind } from './dailyRecap';
import { buildHighlightRecaps } from './highlights';

/** Composes shared server queries and completes album pagination only while mounted.
 * @param tripId - Private album to summarize; the dialog owns this hook's lifetime.
 * @param kind - Format selected from Share highlights.
 * @returns Complete recap data, loading/error states, UTC clock, and retry action.
 */
export const useHighlights = (tripId: string, kind: RecapKind) => {
  const album = usePhotos(tripId);
  const itinerary = useItinerary(tripId);
  const events = useEvents(itinerary.itinerary?._id);
  const trip = useTripDetails(tripId);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const { hasNextPage, isFetching, isError, fetchNextPage } = album;
  useEffect(() => {
    if (hasNextPage && !isFetching && !isError)
      void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetching, isError, fetchNextPage]);
  const photos = useMemo(
    () => album.data?.pages.flatMap((page) => page.photos) ?? [],
    [album.data],
  );
  const slides = useMemo(
    () =>
      buildHighlightRecaps(
        {
          tripId,
          photos,
          events: events.events,
          startDate: itinerary.itinerary?.startDate ?? '',
          endDate: itinerary.itinerary?.endDate ?? '',
          now,
        },
        kind,
      ),
    [tripId, photos, events.events, itinerary.itinerary, now, kind],
  );
  const error =
    album.isError || itinerary.isError || events.isError || trip.isError;
  const loading =
    !error &&
    (album.isPending ||
      Boolean(album.hasNextPage) ||
      itinerary.isPending ||
      events.isPending ||
      trip.isPending);
  /** Retries failed data sources without replacing the shared entity caches. */
  const retry = () => {
    if (album.isError) {
      if (album.isFetchNextPageError)
        void album.fetchNextPage({ cancelRefetch: false });
      else void album.refetch();
    }
    if (itinerary.isError) void itinerary.refetch();
    if (events.isError) void events.refetch();
    if (trip.isError) void trip.refetch();
  };
  return {
    slides,
    photos,
    tripName: trip.data?.name ?? '',
    error,
    loading,
    retry,
    today: new Date(now).toISOString().slice(0, 10),
  };
};
