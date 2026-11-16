import { useAuth } from '../../../contexts/AuthContext';
import { useFriends } from '../../../queries/friends';
import { getApiErrorMessage } from '../../../utils/api';
import { Combobox } from '../Combobox/Combobox';

export interface ShareWithFriendsProps {
  selectedFriendIds: readonly string[];
  onSelectionChange: (friendIds: string[]) => void;
  memberIds?: readonly string[];
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

/** Searches the authenticated user's friends with the shared combobox.
 * @param props - Controlled selection, current members, and display options.
 * @returns A friend picker preserving chip selection, disabled members, and query retry behavior.
 */
export const ShareWithFriends = ({
  selectedFriendIds,
  onSelectionChange,
  memberIds = [],
  multiple = false,
  disabled = false,
  className,
  label = 'Search friends',
  description,
}: ShareWithFriendsProps) => {
  const { user } = useAuth();
  const query = useFriends(user?.id);
  const members = new Set(memberIds.map(String));
  return (
    <Combobox
      label={label}
      description={description}
      options={(query.friends?.friends ?? []).map((friend) => ({
        id: friend.id,
        label: friend.username,
        imageUrl: friend.profile_picture,
        disabled: members.has(friend.id),
        disabledReason: members.has(friend.id)
          ? 'Already a participant'
          : undefined,
      }))}
      selectedIds={selectedFriendIds}
      onSelectionChange={onSelectionChange}
      multiple={multiple}
      disabled={disabled}
      className={className}
      placeholder="Search by username"
      emptyMessage="You do not have any friends to invite yet."
      noResultsMessage="No friends match your search."
      listLabel="Friends available to invite"
      loading={query.isPending}
      loadError={
        query.isError
          ? getApiErrorMessage(query.error, 'Could not load your friends.')
          : undefined
      }
      onRetry={() => void query.refetch()}
      dataCyPrefix="share-trip"
      testIds={{
        input: 'share-trip-friend-search',
        list: 'share-trip-friends',
        optionPrefix: 'share-trip-friend',
        disabledPrefix: 'share-trip-member-badge',
      }}
    />
  );
};
