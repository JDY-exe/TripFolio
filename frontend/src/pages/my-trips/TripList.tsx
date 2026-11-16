import { Button, Text } from '../../components/common';
import type { Trip } from '../../queries/trips';
import TripCard from './TripCard';
import { getTripTravelerCount } from './tripTravelerCount';

interface TripListProps {
  trips: Trip[];
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
  archived?: boolean;
}

/**
 * Renders one trip collection's cards or its independent loading/error state.
 * @param props - Cached trips, query state, retry action, and archive treatment.
 * @returns Grid children with cards linked to the appropriate trip view.
 */
const TripList = ({
  trips,
  isPending,
  isError,
  refetch,
  archived = false,
}: TripListProps) => {
  const collection = archived ? 'archived trips' : 'current trips';

  return (
    <>
      {isPending && (
        <Text className="col-span-full" role="status">
          Loading {collection}...
        </Text>
      )}
      {!isPending && isError && (
        <div
          className="col-span-full flex flex-wrap items-center gap-3"
          role="status"
        >
          <Text>Unable to load {collection}.</Text>
          <Button
            variant="outline"
            data-cy={archived ? 'retry-archived-trips' : 'retry-current-trips'}
            onClick={() => {
              void refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!isPending &&
        !isError &&
        trips.map((trip) => {
          const travelerCount = getTripTravelerCount(trip);

          return (
            <TripCard
              key={trip._id}
              id={trip._id}
              title={trip.name}
              archived={archived}
              sharedWithYou={trip.sharedWithYou}
              dates={`${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`}
              travelers={`${travelerCount} ${travelerCount === 1 ? 'Traveler' : 'Travelers'}`}
              status={archived ? 'archived' : 'Upcoming'}
              imagePath={
                trip.profilePictureId
                  ? `/trip/${trip._id}/profile_picture?v=${trip.profilePictureId}`
                  : undefined
              }
            />
          );
        })}
    </>
  );
};

export default TripList;
