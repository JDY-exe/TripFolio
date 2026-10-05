import { ChevronDown, Clock3, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, IconButton, Text } from '../../../components/common';
import { useEventPhoto } from '../../../queries/events';
import type { EventData } from '../../../queries/events';
import EventPhoto from './EventPhoto';

interface EventCardProps {
  event: EventData;
  onEdit?: (event: EventData) => void;
  onDelete?: (event: EventData) => void;
  readOnly?: boolean;
}

const eventTime = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** Builds a Google Maps listing URL for an event's selected place.
 * @param event - Event name, address, and optional place ID.
 * @returns A Maps search URL that prioritizes the matched place ID.
 */
const getGoogleMapsPlaceUrl = (event: EventData): string => {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', event.address || event.title);
  if (event.placeId) url.searchParams.set('query_place_id', event.placeId);
  return url.toString();
};

/** Displays a compact itinerary event with expandable location and notes.
 * @param props - Event data and callbacks for its actions.
 * @returns A single event card.
 */
const EventCard = ({
  event,
  onEdit,
  onDelete,
  readOnly = false,
}: EventCardProps): ReactNode => {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const photoRef = useRef<HTMLDivElement>(null);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const { photo, isPending: photoLoading } = useEventPhoto(
    event._id,
    event.placeId,
    Boolean(event.placeId && photoVisible),
  );
  const displayPhoto = photo?.url === failedPhotoUrl ? null : photo;
  const hasDetails = Boolean(event.address || event.notes || displayPhoto);
  const placeUrl = getGoogleMapsPlaceUrl(event);

  useEffect(() => {
    if (!event.placeId || !photoRef.current) return;
    if (!('IntersectionObserver' in window)) {
      const timeout = setTimeout(() => setPhotoVisible(true), 0);
      return () => clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhotoVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(photoRef.current);
    return () => observer.disconnect();
  }, [event.placeId]);

  return (
    <article className="group relative grid min-h-42 grid-cols-[minmax(7rem,34%)_minmax(0,1fr)] overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] bg-surface-container-low">
      {!readOnly && onEdit && onDelete ? (
        <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-full bg-surface-container-low/90 p-1 opacity-0 pointer-events-none shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none sm:right-5 sm:top-5">
          <IconButton
            label={`Edit ${event.title}`}
            size="sm"
            icon={<Pencil aria-hidden size={18} />}
            onClick={() => onEdit(event)}
          />
          <IconButton
            label={`Delete ${event.title}`}
            size="sm"
            variant="dangerGhost"
            icon={<Trash2 aria-hidden size={18} />}
            onClick={() => onDelete(event)}
          />
        </div>
      ) : null}

      <div
        ref={photoRef}
        className="relative col-start-1 row-start-1 min-h-0 overflow-hidden"
      >
        <EventPhoto
          key={displayPhoto?.url ?? 'placeholder'}
          photo={displayPhoto}
          placeUrl={placeUrl}
          loading={Boolean(event.placeId && photoVisible && photoLoading)}
          title={event.title}
          onError={() => setFailedPhotoUrl(displayPhoto?.url ?? null)}
        />
      </div>
      <div className="col-start-2 row-start-1 flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex h-42 shrink-0 flex-col">
          <div className="px-4 pb-1 pt-10 sm:px-6">
            <Text as="h4" variant="title" className="break-words">
              {event.title}
            </Text>
            <Text
              variant="label"
              color="primary"
              className="mt-2 flex flex-wrap items-center gap-x-1.5 tabular-nums"
            >
              <Clock3 aria-hidden size={16} className="shrink-0" />
              <time dateTime={event.startTime}>
                {eventTime.format(new Date(event.startTime))}
              </time>
              <span>to</span>
              <time dateTime={event.endTime}>
                {eventTime.format(new Date(event.endTime))}
              </time>
            </Text>
          </div>
          {hasDetails ? (
            <div className="mt-auto flex justify-center px-3 py-1">
              <Button
                variant="ghost"
                size="sm"
                trailingIcon={
                  <ChevronDown
                    aria-hidden
                    size={16}
                    className={`motion-safe:transition-transform motion-safe:duration-300 ${expanded ? 'rotate-180' : ''}`}
                  />
                }
                aria-label={expanded ? 'Hide details' : 'Show details'}
                aria-expanded={expanded}
                aria-controls={detailsId}
                onClick={() => setExpanded((current) => !current)}
              >
                Details
              </Button>
            </div>
          ) : null}
        </div>

        {hasDetails ? (
          <div
            id={detailsId}
            aria-hidden={!expanded}
            inert={!expanded}
            className={`grid min-h-0 overflow-hidden motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-standard ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`border-t border-outline-variant px-4 py-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-standard sm:px-6 ${expanded ? 'translate-y-0' : '-translate-y-2'}`}
              >
                {event.notes ? (
                  <Text color="muted" className="whitespace-pre-wrap text-sm">
                    {event.notes}
                  </Text>
                ) : null}
                {event.address || displayPhoto ? (
                  <div
                    className={
                      event.notes
                        ? 'mt-4 border-t border-outline-variant/60 pt-4'
                        : ''
                    }
                  >
                    {event.address ? (
                      <Text
                        color="muted"
                        className="flex items-start gap-2 text-sm"
                      >
                        <MapPin
                          aria-hidden
                          size={16}
                          className="mt-0.5 shrink-0 text-primary"
                        />
                        {event.placeId ? (
                          <a
                            href={placeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-outline underline-offset-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {event.address}
                          </a>
                        ) : (
                          event.address
                        )}
                      </Text>
                    ) : null}
                    {displayPhoto ? (
                      <Text
                        color="muted"
                        variant="caption"
                        className={event.address ? 'mt-3' : ''}
                      >
                        {displayPhoto.authorAttributions.length > 0 ? (
                          <>
                            Photo by{' '}
                            {displayPhoto.authorAttributions.map(
                              (author, index) => (
                                <span key={`${author.displayName}-${index}`}>
                                  {index > 0 ? ', ' : ''}
                                  {author.uri ? (
                                    <a
                                      href={author.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline hover:text-primary"
                                    >
                                      {author.displayName}
                                    </a>
                                  ) : (
                                    author.displayName
                                  )}
                                </span>
                              ),
                            )}
                            {' | '}
                          </>
                        ) : null}
                        <a
                          href={displayPhoto.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary"
                        >
                          View original on Google Maps
                        </a>
                      </Text>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default EventCard;
