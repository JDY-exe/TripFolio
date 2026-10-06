import { CalendarDays, UsersRound } from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { Text } from '../../components/common';
import type { PublicItineraryFeedItem } from '../../queries/itineraries';
import { getBlobFromApi } from '../../utils/api';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats a trip's start and end dates for a compact feed card.
 * @param startDate - ISO-formatted trip start date.
 * @param endDate - ISO-formatted trip end date.
 * @returns A readable date range in the user's locale.
 */
const formatTripDateRange = (startDate: string, endDate: string): string =>
  `${dateFormatter.format(new Date(startDate))} - ${dateFormatter.format(new Date(endDate))}`;

/** Renders one public itinerary as a link to its read-only detail page.
 * @param props - Public trip, itinerary, owner, and feed ranking data.
 * @returns A keyboard-accessible itinerary feed card.
 */
const ItineraryFeedCard = ({ item }: { item: PublicItineraryFeedItem }) => {
  const ownerName = item.owner?.username ?? 'Traveler';
  const coverPath = `/api/itineraries/${item.tripId}/cover`;
  const [coverImage, setCoverImage] = useState<{
    path: string;
    url: string;
  }>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    /** Fetches the protected trip cover and creates a temporary browser URL. */
    const loadCoverImage = async () => {
      try {
        const imageBlob = await getBlobFromApi(coverPath);
        if (!active) return;

        objectUrl = URL.createObjectURL(imageBlob);
        setCoverImage({ path: coverPath, url: objectUrl });
      } catch {
        if (active) setCoverImage(undefined);
      }
    };

    void loadCoverImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverPath]);

  const coverUrl = coverImage?.path === coverPath ? coverImage.url : undefined;

  return (
    <Link
      to={`/public-itinerary/${item.tripId}`}
      aria-label={`View ${item.tripName} itinerary`}
      className="group block rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <article className="overflow-hidden rounded-panel border border-outline-variant/70 bg-surface-container-low text-on-surface shadow-sm transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-surface-container hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-center gap-3 p-4 sm:px-5 sm:py-4">
          {item.owner?.profile_picture ? (
            <img
              src={item.owner.profile_picture}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-surface-container"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-title text-on-secondary-container"
            >
              {ownerName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <Text as="p" variant="label" className="truncate">
              {ownerName}
            </Text>
            <Text as="p" variant="caption" color="muted">
              Shared {dateFormatter.format(new Date(item.createdAt))}
            </Text>
          </div>
          {item.isFriend ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 text-xs font-medium text-on-primary-container">
              <UsersRound aria-hidden size={14} />
              Friend
            </span>
          ) : null}
        </div>

        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            width={1200}
            height={675}
            loading="lazy"
            className="aspect-video w-full bg-surface-container object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-video w-full bg-secondary-container/60"
          />
        )}

        <div className="p-4 sm:p-5">
          <Text as="h2" variant="title" className="wrap-break-word">
            {item.tripName}
          </Text>
          {item.itinerary.title ? (
            <Text as="p" variant="label" color="primary" className="mt-1">
              {item.itinerary.title}
            </Text>
          ) : null}
          {item.itinerary.description ? (
            <Text
              as="p"
              color="muted"
              className="mt-2 whitespace-pre-wrap wrap-break-word"
            >
              {item.itinerary.description}
            </Text>
          ) : null}

          <div className="mt-4 flex items-center gap-2 border-t border-outline-variant/50 pt-3">
            <CalendarDays
              aria-hidden
              size={16}
              className="shrink-0 text-primary"
            />
            <Text as="span" variant="caption" color="muted">
              {formatTripDateRange(item.tripStartDate, item.tripEndDate)}
            </Text>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default ItineraryFeedCard;
