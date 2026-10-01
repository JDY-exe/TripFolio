import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Text } from '../../components/common';
import { deleteFromApi, getFromApi } from '../../utils/api';
import CreateTrip from './CreateTrip';
import TripCard from './TripCard';

// Trip data shape
interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  profilePictureId?: string;
}

/** Fetches and displays trips, with creation available from an in-page modal. @returns The My Trips page. */
const MyTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /** Retrieves the latest trip collection for the initial view and after creation. @returns A promise that resolves after the list is updated. */
  const fetchTrips = useCallback(
    () =>
      getFromApi<Trip[]>('/trip')
        .then((data) => {
          if (Array.isArray(data)) {
            setTrips(data);
          } else {
            setTrips([]);
            console.error(
              'Expected an array of trips, but got something else.',
            );
          }
        })
        .catch((error) => {
          console.error('Failed to fetch trips', error);
        })
        .finally(() => setIsLoading(false)),
    [],
  );

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  /** Deletes a trip and removes it from the visible collection. @param id - Trip identifier. @returns A promise that resolves after deletion completes. */
  const handleDeleteTrip = async (id: string) => {
    try {
      await deleteFromApi(`/trip/${id}`);
      setTrips((prevTrips) => prevTrips.filter((trip) => trip._id !== id));
    } catch (error) {
      console.error('Failed to delete trip on the server', error);
    }
  };

  /** Closes creation and reloads trips so the new cover appears. @returns Nothing. */
  const handleTripCreated = () => {
    setIsCreateOpen(false);
    setIsLoading(true);
    void fetchTrips();
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

        {isLoading ? (
          <p className="mt-8">Loading trips...</p>
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
