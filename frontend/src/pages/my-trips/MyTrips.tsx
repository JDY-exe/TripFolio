import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { deleteFromApi, getFromApi } from '../../utils/api';
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

  /** Deletes a trip and removes it from the visible collection. @param id - Trip identifier. @returns A promise that resolves after deletion completes. */
  const handleDeleteTrip = async (id: string) => {
    try {
      await deleteFromApi(`/trip/${id}`);
      queryClient.setQueryData<Trip[]>(tripsQueryKey, (previous) =>
        previous?.filter((trip) => trip._id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    } catch (error) {
      console.error('Failed to delete trip on the server', error);
    }
  };

  /** Closes creation and invalidates trips so the new cover appears. @returns Nothing. */
  const handleTripCreated = () => {
    setIsCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: tripsQueryKey });
  };

  return (
    <>
      <section className="text-on-surface">
        <header className="flex items-center justify-between gap-4">
          <Text as="h1" variant="headline">
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
                  destination="Destination TBD"
                  travelers="1 Traveler"
                  status="Upcoming"
                  imagePath={
                    trip.profilePictureId
                      ? `/trip/${trip._id}/profile_picture`
                      : undefined
                  }
                  onDelete={handleDeleteTrip}
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
