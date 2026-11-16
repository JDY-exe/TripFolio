import { useQueryClient } from '@tanstack/react-query';
import { Mail, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Text } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  tripsQueryKey,
  useTrips,
  useArchivedTrips,
  useTripInvitations,
} from '../../queries/trips';
import CreateTrip from './CreateTrip';
import TripList from './TripList';
import TripInvitations from './TripInvitations';
import EmptyTrips from './EmptyTrips';

/** Fetches and displays trips, with creation available from an in-page modal. @returns The My Trips page. */
const MyTrips = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentTrips = useTrips(user?.id);
  const archivedTrips = useArchivedTrips(user?.id);
  const isEmpty =
    !currentTrips.isPending &&
    !currentTrips.isError &&
    !archivedTrips.isPending &&
    !archivedTrips.isError &&
    currentTrips.trips.length === 0 &&
    archivedTrips.trips.length === 0;
  const invitations = useTripInvitations(user?.id);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /** Closes creation and invalidates trips so the new cover appears. @returns Nothing. */
  const handleTripCreated = () => {
    setIsCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: tripsQueryKey(user?.id) });
  };

  return (
    <>
      <section className="text-on-surface">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Text as="h1" data-cy="my-trips-title" variant="display">
            My Trips
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              data-cy="trip-invitations"
              leadingIcon={<Mail aria-hidden size={18} />}
              onClick={() => setIsInvitationsOpen(true)}
            >
              Invitations
              {invitations.data?.length ? ` (${invitations.data.length})` : ''}
            </Button>
            <Button
              data-cy="new-trip"
              onClick={() => setIsCreateOpen(true)}
              leadingIcon={<Plus aria-hidden size={18} />}
              className="shrink-0"
            >
              New Trip
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {isEmpty && <EmptyTrips />}
          <TripList {...currentTrips} />
          <TripList {...archivedTrips} archived />
        </div>
      </section>
      <TripInvitations
        userId={user?.id}
        open={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
      />
      {isCreateOpen && (
        <CreateTrip
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleTripCreated}
        />
      )}
    </>
  );
};

export default MyTrips;
