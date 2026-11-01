import { useEffect, useRef, useState } from 'react';
import { Button, LoadingIndicator, Text, TextField } from '../../components/common';
import ErrorDisplay from '../../components/common/ErrorDisplay/ErrorDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { usePublicItineraryFeed } from '../../queries/itineraries';
import ItineraryFeedCard from './ItineraryFeedCard';
import { SearchIcon } from 'lucide-react';


/** Displays a paginated, vertically scrollable feed of public itineraries.
 * @returns The Social page with loading, retry, empty, and pagination states.
 */
const SocialFeed = () => {
  const { user } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);
   const [locationFilter, setLocationFilter] = useState('');
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicItineraryFeed(user?.id, locationFilter);
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const handleLocationSearch = () => {
    setLocationFilter(locationInput.trim());
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setLocationInput('');
    setLocationFilter('');
    void refetch(); // Reset the feed to show all public itineraries
  };
  

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

      <header className="mb-7 flex items-center justify-between gap-4">
        <Text as="h1" id="social-heading" variant="display">
          Global feed
        </Text>

        <div className="flex items-center gap-2">
          {isSearchOpen && (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleLocationSearch();
              }}
            >
              <div className="w-44 sm:w-56">
                <TextField
                  id="social-location-search"
                  label="Search by location"
                  type="text"
                  placeholder="City or country..."
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                />
              </div>

              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setIsSearchOpen((open) => !open)}
            aria-label={isSearchOpen ? 'Close location search' : 'Search by location'}
            className="flex h-10 w-10 shrink-0 items-center justify-center
        rounded-full hover:bg-surface-container"
          >
            {isSearchOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {locationFilter && (
        <div className="mb-5 flex items-center gap-2">
          <Text color="muted" variant="caption">
            Location: {locationFilter}
          </Text>
          <button
            type="button"
            onClick={handleCloseSearch}
            className="text-sm underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {isPending && (
        <div
          className="flex min-h-48 items-center justify-center"
          role="status"
        >
          <LoadingIndicator size={56} label="Loading public itineraries" />
        </div>
      )}
      {!isPending && isError && (
        <div className="flex flex-col items-center gap-4 rounded-panel bg-surface-container-low p-8 text-center">
          <ErrorDisplay message="Could not load public itineraries." />
          <Button size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!isPending && !isError && items.length === 0 && (
        <div className="rounded-panel bg-surface-container-low px-6 py-12 text-center">
          <Text as="h2" variant="title">
            {locationFilter
              ? 'No itineraries found for this location'
              : 'No public itineraries yet'}
          </Text>
          <Text color="muted" className="mt-2">
            Public trips will show up here when they are shared.
          </Text>
        </div>
      )}
      {!isPending && !isError && items.length > 0 && (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <ItineraryFeedCard key={item.tripId} item={item} />
          ))}
          <div
            ref={sentinelRef}
            className="flex min-h-16 items-center justify-center"
            role={isFetchingNextPage ? 'status' : undefined}
          >
            {isFetchingNextPage && (
              <LoadingIndicator size={40} label="Loading more itineraries" />
            )}
          </div>
          {!hasNextPage && (
            <Text color="muted" variant="caption" className="pb-4 text-center">
              You are all caught up.
            </Text>
          )}
        </div>
      )}
    </section>
  );
};

export default SocialFeed;
