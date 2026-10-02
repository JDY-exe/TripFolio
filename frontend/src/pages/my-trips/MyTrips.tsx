import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getFromApi } from '../../utils/api';
import CreateTrip from './CreateTrip';
import TripCard from './TripCard';

interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
}

/** Fetches and validates the trip collection for the active account. @returns Trips returned by the API. */
const getTrips = async (): Promise<Trip[]> => {
  const trips = await getFromApi<Trip[]>('/trip');
  if (!Array.isArray(trips)) throw new Error('Expected an array of trips.');
  return trips;
};

/** Fetches and displays trips, with creation available from an in-page modal. @returns The My Trips page. */
const MyTrips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tripsQueryKey = ['trips', user?.id] as const;
  const {
    data: trips = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: tripsQueryKey,
    queryFn: getTrips,
    enabled: Boolean(user?.id),
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /** Closes creation and invalidates trips so the new cover appears. @returns Nothing. */
  const handleTripCreated = () => {
    setIsCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: tripsQueryKey });
  };

  return (
    <>
      <section className="text-on-surface">
        <header className="flex items-center justify-between gap-4">
          <Text as="h1" variant="display">
            My Upcoming Trips
          </Text>
          <Button
            onClick={() => setIsCreateOpen(true)}
            leadingIcon={<Plus aria-hidden size={18} />}
            className="shrink-0"
          >
            New Trip
          </Button>
        </header>

        {isPending ? (
          <p className="mt-8">Loading trips...</p>
        ) : isError ? (
          <p className="mt-8">Unable to load trips. Please try again.</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {trips.length === 0 ? (
              <p>No trips found. Create one to get started!</p>
            ) : (
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
                      ? `/trip/${trip._id}/profile_picture`
                      : undefined
                  }
                />
              ))
            )}
          </div>
        )}
      </section>
      {isCreateOpen ? (
        <CreateTrip
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleTripCreated}
        />
      ) : null}
    </>
  );
};

export default MyTrips;
