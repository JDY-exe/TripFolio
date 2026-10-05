import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, LoadingIndicator, Text } from '../../components/common';
import ErrorDisplay from '../../components/common/ErrorDisplay/ErrorDisplay';
import { usePublicItinerary } from '../../queries/itineraries';
import ItineraryDaySection from '../trip/itinerary/ItineraryDaySection';
import ItineraryDescription from '../trip/itinerary/ItineraryDescription';
import { getItineraryDays } from '../trip/itinerary/itineraryDays';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Presents a public trip timeline without any itinerary editing controls.
 * @returns The read-only itinerary detail page and its navigation back to Social.
 */
const PublicItinerary = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [showDayNumbers, setShowDayNumbers] = useState(false);
  const { data, isPending, isError, refetch } = usePublicItinerary(tripId);

  if (isPending) {
    return (
      <div
        className="flex min-h-[50dvh] items-center justify-center"
        role="status"
      >
        <LoadingIndicator size={56} label="Loading public itinerary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 text-center">
        <ErrorDisplay message="This public itinerary could not be loaded." />
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            leadingIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/social')}
          >
            Back to Social
          </Button>
          <Button size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const days = getItineraryDays(
    data.itinerary.startDate,
    data.itinerary.endDate,
  );
  const eventsByDay = new Map<string, typeof data.events>();
  for (const event of data.events) {
    const date = new Date(event.startTime).toISOString().slice(0, 10);
    const dayEvents = eventsByDay.get(date) ?? [];
    dayEvents.push(event);
    eventsByDay.set(date, dayEvents);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<ArrowLeft size={18} />}
        onClick={() => navigate('/social')}
      >
        Back to Social
      </Button>

      <header className="mb-8 mt-5 border-b border-outline-variant/60 pb-6">
        <div className="flex items-center gap-3">
          {data.owner?.profile_picture ? (
            <img
              src={data.owner.profile_picture}
              alt=""
              className="size-11 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <Text variant="label" color="muted">
            {data.owner?.username ?? 'Traveler'}
          </Text>
        </div>
        <Text as="h1" variant="display" className="mt-4 break-words">
          {data.trip.name}
        </Text>
        <Text
          variant="label"
          color="primary"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <CalendarDays aria-hidden size={17} />
          {dateFormatter.format(new Date(data.trip.startDate))}
          <span aria-hidden="true">to</span>
          {dateFormatter.format(new Date(data.trip.endDate))}
        </Text>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <section aria-labelledby="public-itinerary-heading" className="min-w-0">
          <Text
            as="h2"
            id="public-itinerary-heading"
            variant="headline"
            className="mb-6"
          >
            {data.itinerary.title || 'Itinerary'}
          </Text>
          {days.length > 0 ? (
            days.map((date, index) => (
              <ItineraryDaySection
                key={date}
                date={date}
                dayNumber={index + 1}
                showDayNumber={showDayNumbers}
                onToggleDayDisplay={() =>
                  setShowDayNumbers((current) => !current)
                }
                events={eventsByDay.get(date) ?? []}
                eventsLoading={false}
                itineraryId={data.itinerary._id}
                startDate={data.itinerary.startDate}
                endDate={data.itinerary.endDate}
                readOnly
              />
            ))
          ) : (
            <Text color="muted">No itinerary days are available.</Text>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <ItineraryDescription
            itinerary={data.itinerary}
            tripId={data.trip._id}
            readOnly
          />
        </aside>
      </div>
    </section>
  );
};

export default PublicItinerary;
