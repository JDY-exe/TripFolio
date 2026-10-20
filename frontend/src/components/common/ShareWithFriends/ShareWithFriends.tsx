import { useEffect, useId, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useFriends } from '../../../queries/friends';
import { getApiErrorMessage } from '../../../utils/api';
import Button from '../Button';
import { Chip } from '../Chip/Chip';
import LoadingIndicator from '../LoadingIndicator';
import Text from '../Text';
import { InfoPopover } from '../InfoPopover/InfoPopover';

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

/**
 * Searches friends in a chip-filled combobox without sending invitations.
 * @param props - Controlled selection, existing members, and interaction options.
 * @returns A labeled combobox with removable chips and a keyboard-accessible dropdown.
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
  const friendsQuery = useFriends(user?.id);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const searchId = useId();
  const listId = `${searchId}-options`;
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const members = new Set(memberIds.map(String));
  const friends = friendsQuery.friends?.friends ?? [];
  const filteredFriends = friends.filter((friend) =>
    friend.username.toLocaleLowerCase().includes(normalizedSearch),
  );
  const availableFriends = filteredFriends.filter(
    (friend) => !members.has(friend.id),
  );
  const selectedFriends = friends.filter(
    (friend) =>
      selectedFriendIds.includes(friend.id) && !members.has(friend.id),
  );
  const expanded = open && !disabled;
  const activeFriendId = availableFriends.some(
    (friend) => friend.id === activeId,
  )
    ? activeId
    : undefined;

  useEffect(() => {
    if (!expanded) return;
    /** Dismisses results when a pointer lands outside the combobox. */
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wrapper.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [expanded]);

  /** Toggles a non-member friend while preserving search and input focus.
   * @param friendId - Identifier of the friend being toggled.
   * @returns Nothing; reports the new controlled selection.
   */
  const toggleFriend = (friendId: string) => {
    if (disabled || members.has(friendId)) return;
    const selected = selectedFriendIds.includes(friendId);
    onSelectionChange(
      selected
        ? selectedFriendIds.filter((id) => id !== friendId)
        : multiple
          ? [...selectedFriendIds, friendId]
          : [friendId],
    );
    input.current?.focus();
    if (!multiple) setOpen(false);
  };

  return (
    <div
      ref={wrapper}
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="mb-2 flex items-center gap-1">
        <Text as="label" htmlFor={searchId} variant="label">
          {label}
        </Text>
        {description ? (
          <InfoPopover label={`About ${label.toLocaleLowerCase()}`}>
            {description}
          </InfoPopover>
        ) : null}
      </div>
      <div className="relative">
        <div
          data-cy="share-trip-combobox"
          className={[
            'flex min-h-12 flex-wrap items-center gap-x-2 rounded-xl border border-outline bg-surface-container-low px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
            disabled ? 'opacity-50' : '',
          ].join(' ')}
        >
          {selectedFriends.map((friend) => (
            <Chip
              key={friend.id}
              label={friend.username}
              avatar={
                friend.profile_picture ? (
                  <img src={friend.profile_picture} alt="" />
                ) : (
                  <UserRound aria-hidden size={16} />
                )
              }
              disabled={disabled}
              data-cy={`share-trip-selected-${friend.id}`}
              onRemove={() => toggleFriend(friend.id)}
            />
          ))}
          <input
            ref={input}
            id={searchId}
            data-cy="share-trip-friend-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={
              expanded && activeFriendId
                ? `${listId}-${activeFriendId}`
                : undefined
            }
            autoComplete="off"
            disabled={disabled}
            className="min-h-12 min-w-24 flex-1 basis-24 bg-transparent py-3 text-body text-on-surface outline-none placeholder:text-on-surface-variant disabled:cursor-not-allowed"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveId(undefined);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && expanded) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                setActiveId(undefined);
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setOpen(true);
                const currentIndex = availableFriends.findIndex(
                  (friend) => friend.id === activeFriendId,
                );
                const nextIndex =
                  event.key === 'ArrowDown'
                    ? (currentIndex + 1) % availableFriends.length
                    : currentIndex < 0
                      ? availableFriends.length - 1
                      : (currentIndex - 1 + availableFriends.length) %
                        availableFriends.length;
                const nextId = availableFriends[nextIndex]?.id;
                setActiveId(nextId);
                if (nextId)
                  requestAnimationFrame(() =>
                    document
                      .getElementById(`${listId}-${nextId}`)
                      ?.scrollIntoView({ block: 'nearest' }),
                  );
              } else if (event.key === 'Enter' && expanded) {
                event.preventDefault();
                if (activeFriendId) toggleFriend(activeFriendId);
              }
            }}
            placeholder={
              selectedFriends.length ? 'Add friends…' : 'Search by username'
            }
            type="text"
            value={search}
          />
        </div>
        {expanded ? (
          <div
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-high p-2 shadow-lg"
            data-cy="share-trip-dropdown"
          >
            <ul
              id={listId}
              role="listbox"
              aria-label="Friends available to invite"
              aria-multiselectable={multiple}
              data-cy="share-trip-friends"
            >
              {filteredFriends.map((friend) => {
                const isTripMember = members.has(friend.id);
                const selected =
                  !isTripMember && selectedFriendIds.includes(friend.id);
                return (
                  <li role="presentation" key={friend.id}>
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-${friend.id}`}
                      aria-selected={selected}
                      aria-disabled={isTripMember}
                      disabled={isTripMember}
                      tabIndex={-1}
                      data-cy={`share-trip-friend-${friend.id}`}
                      className={[
                        'flex w-full items-center gap-3 rounded-lg border-0 px-3 py-2 text-left text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors',
                        selected
                          ? 'bg-on-surface/8 hover:bg-on-surface/12'
                          : 'hover:bg-on-surface/8',
                        activeFriendId === friend.id
                          ? 'bg-on-surface/12'
                          : '',
                      ].join(' ')}
                      onMouseDown={(event) => event.preventDefault()}
                      onPointerMove={() => {
                        if (!isTripMember) setActiveId(friend.id);
                      }}
                      onClick={() => toggleFriend(friend.id)}
                    >
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary-container text-on-secondary-container">
                        {friend.profile_picture ? (
                          <img
                            alt=""
                            className="size-full object-cover"
                            src={friend.profile_picture}
                          />
                        ) : (
                          <UserRound aria-hidden size={18} />
                        )}
                      </span>
                      <Text
                        as="span"
                        className="min-w-0 flex-1 truncate"
                        variant="label"
                        color="inherit"
                      >
                        {friend.username}
                      </Text>
                      {isTripMember ? (
                        <Text
                          as="span"
                          className="shrink-0"
                          color="muted"
                          data-cy={`share-trip-member-badge-${friend.id}`}
                          variant="caption"
                        >
                          Already a participant
                        </Text>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {friendsQuery.isPending ? (
              <LoadingIndicator label="Loading friends" size={36} />
            ) : friendsQuery.isError ? (
              <div className="grid gap-2 p-2" role="alert">
                <Text color="error">
                  {getApiErrorMessage(
                    friendsQuery.error,
                    'Could not load your friends.',
                  )}
                </Text>
                <Button
                  onClick={() => void friendsQuery.refetch()}
                  size="sm"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : !filteredFriends.length ? (
              <Text className="p-2" color="muted" role="status">
                {search.trim()
                  ? 'No friends match your search.'
                  : 'You do not have any friends to invite yet.'}
              </Text>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
