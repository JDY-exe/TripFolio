import { Crown, UsersRound } from 'lucide-react';
import { Text } from '../../../components/common';
import type { TripMemberRole } from '../../../queries/trips';
import type { TripMember } from './tripMembers';

/**
 * Presents trip members with their current roles and owner/editor role controls.
 * @param props - Members, edit permission, pending state, and role-change handler.
 * @returns The trip participants section.
 */
const TripMembersPanel = ({
  members,
  canManageMembers,
  updatingMemberId,
  onRoleChange,
}: {
  members: TripMember[];
  canManageMembers: boolean;
  updatingMemberId?: string;
  onRoleChange: (
    userId: string,
    role: Exclude<TripMemberRole, 'owner'>,
  ) => void;
}) => (
  <section
    aria-labelledby="trip-members-heading"
    className="mb-8 max-w-2xl rounded-panel border border-outline-variant bg-surface-container-low p-5"
    data-cy="trip-members"
  >
    <div className="flex items-center gap-3">
      <UsersRound aria-hidden className="text-primary" size={20} />
      <Text as="h3" id="trip-members-heading" variant="title">
        Trip participants
      </Text>
      <Text as="span" color="muted" variant="caption">
        {members.length}
      </Text>
    </div>
    <ul className="mt-4 divide-y divide-outline-variant">
      {members.map((member) => {
        const isUpdating = updatingMemberId === member.id;

        return (
          <li
            key={member.id}
            className="flex min-h-16 items-center gap-3 py-3"
            data-cy={`trip-member-${member.id}`}
          >
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-container text-on-primary-container">
              {member.profilePicture && (
                <img
                  src={member.profilePicture}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              )}
              {!member.profilePicture && (
                <span aria-hidden className="text-label">
                  {member.username.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <Text as="span" variant="label" className="block truncate">
                {member.username}
              </Text>
            </span>
            {canManageMembers && member.role !== 'owner' && (
              <label className="grid shrink-0 gap-1">
                <Text as="span" color="muted" variant="caption">
                  Role
                </Text>
                <select
                  aria-label={`Role for ${member.username}`}
                  data-cy={`trip-member-role-${member.id}`}
                  value={member.role}
                  disabled={Boolean(updatingMemberId)}
                  onChange={(event) => {
                    const role = event.target.value;
                    if (role === 'editor' || role === 'viewer') {
                      onRoleChange(member.id, role);
                    }
                  }}
                  className="min-h-11 rounded-xl border border-outline bg-surface-container-low px-3 text-body text-on-surface outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                {isUpdating && (
                  <Text as="span" color="muted" variant="caption">
                    Saving…
                  </Text>
                )}
              </label>
            )}
            {(!canManageMembers || member.role === 'owner') && (
              <span
                aria-label={`${member.role} role`}
                data-cy={`trip-member-role-label-${member.id}`}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-secondary-container px-3 text-label text-on-secondary-container"
              >
                {member.role === 'owner' && <Crown aria-hidden size={14} />}
                {member.roleLabel}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

export default TripMembersPanel;
