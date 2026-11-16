import { Button, Text } from '../../../../components/common';
import { useAuth } from '../../../../contexts/AuthContext';
import { useItinerary } from '../../../../queries/itineraries';
import { useEvents } from '../../../../queries/events';
import { useTrips, type TripDetails } from '../../../../queries/trips';
import ArchivedTripShare from '../ArchivedTripShare';
import ArchivedItineraryNotes from '../ArchivedItineraryNotes';
import { TripEssentialsBoard } from '../essentialsBoard/TripEssentialsBoard';
import TripReadingView from './TripReadingView';
import PublicTripShare from './PublicTripShare';
import { getTripTravelerCount } from '../../../my-trips/tripTravelerCount';

interface SharedTripItineraryProps {
  trip: TripDetails;
  archived: boolean;
}

/** Loads archived or shared trip content while retaining read-only permissions.
 * @param props - Trip details already loaded by the parent and effective archive state.
 * @returns The shared reading layout, including private notes only for signed-in participants.
 */
const SharedTripItinerary = ({ trip, archived }: SharedTripItineraryProps) => {
  const { user } = useAuth();
  const { itinerary, isPending, isError, refetch } = useItinerary(trip._id);
  const {
    events,
    isPending: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEvents(itinerary?._id);
  const { trips } = useTrips(user?.id, archived);
  const travelers =
    trips.find((item) => item._id === trip._id)?.travelers ??
    trip.travelers ??
    [];
  const canShareArchived =
    archived &&
    (trip.currentUserRole === 'owner' || trip.currentUserRole === 'editor');
  const canKeepNotes = archived;

  if (isPending)
    return (
      <Text color="muted" role="status">
        Loading itinerary...
      </Text>
    );
  if (isError || !itinerary)
    return (
      <div role="alert" className="space-y-3">
        <Text color="error">Could not load this itinerary.</Text>
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );

  return (
    <TripReadingView
      title={trip.name}
      startDate={trip.startDate}
      endDate={trip.endDate}
      archived={archived}
      ownerName={
        travelers.find((traveler) => traveler.id === trip.ownerId)?.username
      }
      travelers={travelers}
      travelerCount={travelers.length || getTripTravelerCount(trip)}
      itinerary={itinerary}
      events={events}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
      onRetry={() => void refetchEvents()}
      shareAction={
        <>
          {trip.isPublic && <PublicTripShare />}
          {!trip.isPublic && canShareArchived && (
            <ArchivedTripShare
              tripId={trip._id}
              memberIds={[
                ...(trip.users ?? []),
                ...(trip.ownerId ? [trip.ownerId] : []),
              ]}
            />
          )}
        </>
      }
      supportingContent={
        <TripEssentialsBoard
          tripId={trip._id}
          essentials={trip.essentials}
          canEdit={false}
        />
      }
      personalNotes={
        canKeepNotes &&
        user?.id && (
          <ArchivedItineraryNotes tripId={trip._id} userId={user.id} />
        )
      }
    />
  );
};

export default SharedTripItinerary;
