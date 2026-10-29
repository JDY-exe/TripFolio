import { useQueryClient } from '@tanstack/react-query';
import { Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  useArchivedTrips,
} from '../../queries/trips';
import TripCard from './TripCard';

/** Fetches and displays trips, with creation available from an in-page modal. @returns The My Trips page. */
const MyArchivedTrips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trips, isPending, isError } = useArchivedTrips(user?.id);


  return (
    <>
      <section className="text-on-surface">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Text as="h1" data-cy="my-trips-title" variant="display">
            My Archived Trips
          </Text>
          
        </header>

        {isPending && <p className="mt-8">Loading trips...</p>}
        {!isPending && isError && (
          <p className="mt-8">Unable to load trips. Please try again.</p>
        )}
        {!isPending && !isError && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {trips.length > 0 &&
              trips.map((trip) => (
                <TripCard
                  key={trip._id}
                  id={trip._id}
                  title={trip.name}
                  dates={`${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`}
                  travelers="1 Traveler"
                  status="Upcoming"
                  imagePath={
                    trip.profilePictureId
                      ? `/trip/${trip._id}/profile_picture?v=${trip.profilePictureId}`
                      : undefined
                  }
                />
              ))}
          </div>
        )}
      </section>
    </>
  );
};

export default MyArchivedTrips;
