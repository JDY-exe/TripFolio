import { Share2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  InfoPopover,
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
 * Lets an authorized participant invite friends with read-only access to an archived trip.
 * @param props - Archived trip and current participant identifiers.
 * @returns A share action that opens a friend selector and submits one invitation batch.
 */
const ArchivedTripShare = ({ tripId, memberIds }: ArchivedTripShareProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const shareMutation = useShareArchivedTrip(user?.id);

  /**
   * Sends all selected friends archived-trip invitations in one atomic request.
   * @returns A promise that settles after the result is reported.
   */
  const shareTrip = async () => {
    if (selectedFriendIds.length === 0 || shareMutation.isPending) return;

    try {
      const response = await shareMutation.mutateAsync({
        tripId,
        recipientIds: selectedFriendIds,
      });
      setIsOpen(false);
      setSelectedFriendIds([]);
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
    setSelectedFriendIds([]);
  };

  return (
    <>
      <Button
        data-cy="share-archived-trip-open"
        leadingIcon={<Share2 aria-hidden size={18} />}
        onClick={() => setIsOpen(true)}
      >
        Share trip
      </Button>
      <Modal
        data-cy="share-archived-trip-dialog"
        open={isOpen}
        title="Share trip"
        showCloseButton
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
              disabled={
                selectedFriendIds.length === 0 || shareMutation.isPending
              }
              onClick={() => void shareTrip()}
            >
              {shareMutation.isPending
                ? 'Sending...'
                : selectedFriendIds.length > 0
                  ? `Share with ${selectedFriendIds.length} ${selectedFriendIds.length === 1 ? 'friend' : 'friends'}`
                  : 'Share trip'}
            </Button>
          </>
        )}
        panelClassName="max-w-xl"
      >
        <div className="mb-5 flex items-center gap-1">
          <InfoPopover
            label="About sharing a private trip"
            className="[&>div]:left-0 [&>div]:right-auto"
          >
            Sharing invites a friend with read-only access to this private trip.
            To make it public, the owner can unarchive it and change visibility
            in Trip settings.
          </InfoPopover>
          <Text as="span" color="muted">
            This trip is private
          </Text>
        </div>
        <ShareWithFriends
          key={String(isOpen)}
          presentation="grid"
          multiple
          selectedFriendIds={selectedFriendIds}
          onSelectionChange={setSelectedFriendIds}
          memberIds={memberIds}
          disabled={shareMutation.isPending}
          label="Choose friends"
        />
      </Modal>
    </>
  );
};

export default ArchivedTripShare;
