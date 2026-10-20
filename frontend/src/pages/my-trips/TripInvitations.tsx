import InvitationCover from './InvitationCover';
import { Button, Modal, Text, displayAlert } from '../../components/common';
import {
  useRespondToTripInvitation,
  useTripInvitations,
} from '../../queries/trips';

/** Lists pending invitations and persists recipient decisions.
 * @param props - Recipient ID, visibility, and dismissal callback.
 * @returns The invitation modal with retry and response controls.
 */
const TripInvitations = ({
  userId,
  open,
  onClose,
}: {
  userId?: string;
  open: boolean;
  onClose: () => void;
}) => {
  const query = useTripInvitations(userId);
  const response = useRespondToTripInvitation(userId);
  /** Responds to an invitation and reports failures for retry.
   * @param id - Invitation ID.
   * @param status - Recipient decision.
   * @returns Nothing.
   */
  const respond = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await response.mutateAsync({ id, status });
    } catch {
      displayAlert({
        message: 'Unable to respond. Please try again.',
        tone: 'error',
      });
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trip invitations"
      dismissDisabled={response.isPending}
    >
      {query.isPending && <Text>Loading invitations...</Text>}
      {!query.isPending && query.isError && (
        <div>
          <Text>Unable to load invitations.</Text>
          <Button onClick={() => void query.refetch()}>Try again</Button>
        </div>
      )}
      {!query.isPending && !query.isError && query.data.length === 0 && (
        <Text color="muted">You're all caught up. No pending invitations.</Text>
      )}
      {!query.isPending && !query.isError && query.data.length > 0 && (
        <ul className="space-y-3">
          {query.data.map(({ _id, trip }) => (
            <li
              key={_id}
              data-cy={`invitation-${_id}`}
              className="flex rounded-panel border border-outline-variant bg-surface-container-low overflow-hidden"
            >
              <div className="w-20 shrink-0 sm:w-28">
                <InvitationCover trip={trip} />
              </div>
              <div className="min-w-0 flex-1 p-3 sm:p-4">
                <Text as="h2" variant="label" className="break-words">
                  {trip.name}
                </Text>
                <Text variant="caption" color="muted" className="mt-1">
                  {new Date(trip.startDate).toLocaleDateString()} –{' '}
                  {new Date(trip.endDate).toLocaleDateString()}
                </Text>
                <div className="mt-2 flex items-center gap-2">
                  {trip.owner?.profile_picture && (
                    <img
                      data-cy="invitation-owner-picture"
                      src={trip.owner.profile_picture}
                      alt=""
                      className="size-7 rounded-full object-cover"
                    />
                  )}
                  {!trip.owner?.profile_picture && (
                    <span
                      aria-hidden="true"
                      className="flex size-7 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
                    >
                      {trip.owner?.username?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  )}
                  <div>
                    <Text variant="caption">
                      {trip.owner?.username ?? 'Trip owner'}
                    </Text>
                    <Text variant="caption" color="muted">
                      Trip owner
                    </Text>
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-cy="decline-invitation"
                    disabled={response.isPending}
                    onClick={() => void respond(_id, 'declined')}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    data-cy="accept-invitation"
                    disabled={response.isPending}
                    onClick={() => void respond(_id, 'accepted')}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
export default TripInvitations;
