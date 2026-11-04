import { Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useArchivedTrips } from '../../queries/trips';
import TripCard from '../my-trips/TripCard';
import { getTripTravelerCount } from '../my-trips/tripTravelerCount';

/** Loads archived trips and displays shared trip cards linked to read-only views.
 * @returns The archived list with loading, error, and empty states.
 */
const MyArchivedTrips = () => {
  const { user } = useAuth();
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
            {trips.length === 0 && (
              <Text color="muted">No archived trips yet.</Text>
            )}
            {trips.length > 0 &&
              trips.map((trip) => {
                const travelerCount = getTripTravelerCount(trip);

                return (
                  <TripCard
                    archived
                    key={trip._id}
                    id={trip._id}
                    title={trip.name}
                    sharedWithYou={trip.sharedWithYou}
                    dates={`${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`}
                    travelers={`${travelerCount} ${travelerCount === 1 ? 'Traveler' : 'Travelers'}`}
                    status="Archived"
                    imagePath={
                      trip.profilePictureId
                        ? `/trip/${trip._id}/profile_picture?v=${trip.profilePictureId}`
                        : undefined
                    }
                  />
                );
              })}
          </div>
        )}
      </section>
    </>
  );
};

export default MyArchivedTrips;
