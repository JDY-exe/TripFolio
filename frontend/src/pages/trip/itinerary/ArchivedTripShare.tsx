import { Share2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Modal,
  ShareWithFriends,
  Text,
  displayAlert,
} from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { useShareArchivedTrip } from '../../../queries/trips';
import { getApiErrorMessage } from '../../../utils/api';

interface ArchivedTripShareProps {
  tripId: string;
  memberIds: readonly string[];
}

/**
 * Lets an authorized participant grant one friend read-only access to an archived trip.
 * @param props - Archived trip and current participant identifiers.
 * @returns A share action that opens a friend selector and submits the access grant.
 */
const ArchivedTripShare = ({ tripId, memberIds }: ArchivedTripShareProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>();
  const shareMutation = useShareArchivedTrip(user?.id);

  /**
   * Sends the selected friend the archived-trip access grant.
   * @returns A promise that settles after the result is reported.
   */
  const shareTrip = async () => {
    if (!selectedFriendId || shareMutation.isPending) return;

    try {
      const response = await shareMutation.mutateAsync({
        tripId,
        recipientId: selectedFriendId,
      });
      setIsOpen(false);
      setSelectedFriendId(undefined);
      displayAlert({ message: response.message, tone: 'success' });
    } catch (error) {
      displayAlert({
        message: getApiErrorMessage(
          error,
          'Archived trip could not be shared.',
        ),
        tone: 'error',
      });
    }
  };

  /**
   * Closes the dialog and clears its pending selection.
   * @returns Nothing; resets local dialog state.
   */
  const closeDialog = () => {
    setIsOpen(false);
    setSelectedFriendId(undefined);
  };

  return (
    <>
      <Button
        data-cy="share-archived-trip-open"
        leadingIcon={<Share2 aria-hidden size={18} />}
        onClick={() => setIsOpen(true)}
      >
        Share archived trip
      </Button>
      <Modal
        data-cy="share-archived-trip-dialog"
        open={isOpen}
        title="Share archived trip"
        description="Choose a friend to give read-only access to this archived trip."
        onClose={closeDialog}
        dismissDisabled={shareMutation.isPending}
        footer={(requestClose) => (
          <>
            <Button
              data-cy="share-archived-trip-cancel"
              disabled={shareMutation.isPending}
              onClick={requestClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              data-cy="share-archived-trip-submit"
              disabled={!selectedFriendId || shareMutation.isPending}
              onClick={() => void shareTrip()}
            >
              {shareMutation.isPending ? 'Sharing...' : 'Share trip'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <ShareWithFriends
          key={String(isOpen)}
          selectedFriendIds={selectedFriendId ? [selectedFriendId] : []}
          onSelectionChange={(friendIds) => setSelectedFriendId(friendIds[0])}
          memberIds={memberIds}
          disabled={shareMutation.isPending}
          label="Choose a friend"
        />
        {!selectedFriendId && (
          <Text className="mt-3" color="muted" role="status">
            Select one friend to share this trip.
          </Text>
        )}
      </Modal>
    </>
  );
};

export default ArchivedTripShare;
