import { useEffect, useRef } from 'react';
import { Button, LoadingIndicator, Text } from '../../components/common';
import ErrorDisplay from '../../components/common/ErrorDisplay/ErrorDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { usePublicItineraryFeed } from '../../queries/itineraries';
import ItineraryFeedCard from './ItineraryFeedCard';

/** Displays a paginated, vertically scrollable feed of public itineraries.
 * @returns The Social page with loading, retry, empty, and pagination states.
 */
const SocialFeed = () => {
  const { user } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicItineraryFeed(user?.id);
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { rootMargin: '360px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section aria-labelledby="social-heading" className="mx-auto max-w-2xl">
      <header className="mb-7 flex items-end justify-between gap-4">
        <Text as="h1" id="social-heading" variant="display">
          Global feed
        </Text>
      </header>

      {isPending ? (
        <div
          className="flex min-h-48 items-center justify-center"
          role="status"
        >
          <LoadingIndicator size={56} label="Loading public itineraries" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-panel bg-surface-container-low p-8 text-center">
          <ErrorDisplay message="Could not load public itineraries." />
          <Button size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-panel bg-surface-container-low px-6 py-12 text-center">
          <Text as="h2" variant="title">
            No public itineraries yet
          </Text>
          <Text color="muted" className="mt-2">
            Public trips will show up here when they are shared.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <ItineraryFeedCard key={item.tripId} item={item} />
          ))}
          <div
            ref={sentinelRef}
            className="flex min-h-16 items-center justify-center"
            role={isFetchingNextPage ? 'status' : undefined}
          >
            {isFetchingNextPage ? (
              <LoadingIndicator size={40} label="Loading more itineraries" />
            ) : null}
          </div>
          {!hasNextPage ? (
            <Text color="muted" variant="caption" className="pb-4 text-center">
              You are all caught up.
            </Text>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default SocialFeed;
