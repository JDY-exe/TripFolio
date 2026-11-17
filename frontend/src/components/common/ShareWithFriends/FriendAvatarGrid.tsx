import { useId, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { AvatarToggle } from '../AvatarToggle/AvatarToggle';
import Button from '../Button';
import Text from '../Text';
import TextField from '../TextField/TextField';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import type { FriendProfile } from '../../../queries/friends';

interface FriendAvatarGridProps {
  friends: FriendProfile[];
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  memberIds: readonly string[];
  multiple: boolean;
  disabled: boolean;
  loading: boolean;
  loadError?: string;
  onRetry: () => void;
  label: string;
  className?: string;
  searchAction?: ReactNode;
}

/** Presents friends in the same searchable avatar grid used for expense participants.
 * @param props - Friend records, controlled selection, membership, and query state.
 * @returns A responsive picker that preserves selection during search and disables existing participants.
 */
const FriendAvatarGrid = ({
  friends,
  selectedIds,
  onSelectionChange,
  memberIds,
  multiple,
  disabled,
  loading,
  loadError,
  onRetry,
  label,
  className,
  searchAction,
}: FriendAvatarGridProps) => {
  const id = useId();
  const [search, setSearch] = useState('');
  const members = new Set(memberIds.map(String));
  const filtered = friends.filter((friend) =>
    friend.username
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );

  /** Toggles an eligible friend, replacing the selection in single-select mode.
   * @param friendId - Friend selected by pointer or keyboard.
   * @returns Nothing; delegates the next selection to the owning form.
   */
  const toggle = (friendId: string) => {
    if (disabled || members.has(friendId)) return;
    if (selectedIds.includes(friendId)) {
      onSelectionChange(selectedIds.filter((value) => value !== friendId));
      return;
    }
    onSelectionChange(multiple ? [...selectedIds, friendId] : [friendId]);
  };

  return (
    <section
      className={`min-w-0 ${className ?? ''}`}
      aria-label={label}
      data-cy="share-trip-avatar-picker"
    >
      <div
        className={
          searchAction
            ? 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3'
            : undefined
        }
      >
        <TextField
          id={`${id}-search`}
          label={label}
          hideLabel
          type="search"
          leadingIcon={<Search aria-hidden size={18} />}
          placeholder="Search by username"
          autoComplete="off"
          value={search}
          disabled={disabled || loading || Boolean(loadError)}
          data-cy="share-trip-friend-search"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
            if (event.key === 'Escape' && search) {
              event.stopPropagation();
              setSearch('');
            }
          }}
        />
        {searchAction && <div>{searchAction}</div>}
      </div>
      {loading && (
        <div
          role="status"
          className="flex min-h-36 items-center justify-center"
        >
          <LoadingIndicator label="Loading friends" size={32} />
        </div>
      )}
      {!loading && loadError && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3">
          <Text color="error">{loadError}</Text>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {!loading && !loadError && (
        <>
          <div
            role="group"
            aria-label="Friends available to invite"
            data-cy="share-trip-friends"
            className="mt-3 grid max-h-72 min-w-0 grid-cols-3 gap-x-2 gap-y-1 overflow-y-auto px-1 py-1 sm:grid-cols-4"
          >
            {filtered.map((friend) => (
              <div key={friend.id} className="min-w-0">
                <AvatarToggle
                  label={friend.username}
                  imageUrl={friend.profile_picture}
                  selected={selectedIds.includes(friend.id)}
                  onToggle={() => toggle(friend.id)}
                  disabled={disabled || members.has(friend.id)}
                  className="w-full"
                  aria-describedby={
                    members.has(friend.id)
                      ? `${id}-${friend.id}-member`
                      : undefined
                  }
                  data-cy={`share-trip-friend-${friend.id}`}
                />
                {members.has(friend.id) && (
                  <Text
                    as="span"
                    variant="caption"
                    color="muted"
                    id={`${id}-${friend.id}-member`}
                    data-cy={`share-trip-member-badge-${friend.id}`}
                    className="block text-center"
                  >
                    Already on trip
                  </Text>
                )}
              </div>
            ))}
          </div>
          <div aria-live="polite">
            {friends.length === 0 && (
              <Text color="muted" className="mt-3">
                You do not have any friends to invite yet.
              </Text>
            )}
            {friends.length > 0 && filtered.length === 0 && (
              <Text color="muted" className="mt-3">
                No friends match your search.
              </Text>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default FriendAvatarGrid;
