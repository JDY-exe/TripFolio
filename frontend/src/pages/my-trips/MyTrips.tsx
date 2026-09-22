import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Text } from '../../components/common';
import { getFromApi, deleteFromApi } from '../../utils/api';
import TripCard from './TripCard';

// Trip data shape
interface Trip {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

/**
 * Presents a static trip-collection mockup using sample cards and native controls.
 * Controls are disabled deliberately; no application state or data wiring is added.
 *
 * @returns The presentation-only My Trips page.
 */
function MyTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await getFromApi<Trip[]>('/trip');
        
        // Debug output to consol
        console.log("Backend responded with:", data);
        if (Array.isArray(data)) {
          setTrips(data);
        } else {
          setTrips([]);
          console.error("Expected an array of trips, but got something else.");
        }
      } catch (error) {
        console.error("Failed to fetch trips", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const handleDeleteTrip = async (id: string) => {
    try {
      await deleteFromApi(`/trip/${id}`);
      setTrips((prevTrips) => prevTrips.filter((trip) => trip._id !== id));
    } catch (error) {
      console.error('Failed to delete trip on the server', error);
    }
  };

  return (
    <section className="text-on-surface">
      <header className="flex items-center justify-between gap-4">
        <Text as="h1" variant="headline">
          My Upcoming Trips
        </Text>
        <Button
          onClick={() => navigate('/create-trip')}
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
                image="https://placehold.co/600x400"
                onDelete={handleDeleteTrip}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default MyTrips;
