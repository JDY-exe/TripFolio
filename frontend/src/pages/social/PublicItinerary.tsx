import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { Button, LoadingIndicator } from '../../components/common';
import ErrorDisplay from '../../components/common/ErrorDisplay/ErrorDisplay';
import { usePublicItinerary } from '../../queries/itineraries';
import TripReadingView from '../trip/itinerary/reading/TripReadingView';
import PublicTripShare from '../trip/itinerary/reading/PublicTripShare';

/** Presents a public trip timeline without any itinerary editing controls.
 * @returns The read-only itinerary detail page and its navigation back to Social.
 */
const PublicItinerary = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
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

      <div className="mt-5">
        <TripReadingView
          title={data.trip.name}
          startDate={data.trip.startDate}
          endDate={data.trip.endDate}
          archived={data.trip.archived}
          ownerName={data.owner?.username}
          travelers={data.travelers}
          itinerary={data.itinerary}
          events={data.events}
          shareAction={<PublicTripShare />}
        />
      </div>
    </section>
  );
};

export default PublicItinerary;
