import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { tripsQueryKey, useTrips } from '../../queries/trips';
import CreateTrip from './CreateTrip';
import TripCard from './TripCard';

/** Fetches and displays trips, with creation available from an in-page modal. @returns The My Trips page. */
const MyTrips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trips, isPending, isError } = useTrips(user?.id);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /** Closes creation and invalidates trips so the new cover appears. @returns Nothing. */
  const handleTripCreated = () => {
    setIsCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
  };

  return (
    <>
      <section className="text-on-surface">
        <header className="flex items-center justify-between gap-4">
          <Text as="h1" data-cy="my-trips-title" variant="display">
            My Upcoming Trips
          </Text>
          <Button
            data-cy="new-trip"
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
                      ? `/trip/${trip._id}/profile_picture?v=${trip.profilePictureId}`
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
