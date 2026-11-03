import type { TripMemberRole, TripTraveler } from '../../../queries/trips';

export interface TripMember {
  id: string;
  username: string;
  profilePicture?: string | null;
  role: TripMemberRole;
  roleLabel: string;
}

/**
 * Combines trip membership IDs with traveler profiles and legacy role fields.
 * @param userIds - Trip membership IDs.
 * @param travelers - Profiles returned with the user's trip list.
 * @param ownerId - Explicit trip owner, if present.
 * @param legacyViewerIds - Viewer IDs stored by older role implementations.
 * @param memberRoles - Explicit member roles keyed by user ID.
 * @returns Unique trip members with display names and resolved roles.
 */
export const getTripMembers = (
  userIds: readonly string[],
  travelers: readonly TripTraveler[],
  ownerId?: string,
  legacyViewerIds: readonly string[] = [],
  memberRoles: Record<string, TripMemberRole> = {},
): TripMember[] => {
  const resolvedOwnerId = ownerId ?? userIds[0];
  const travelerById = new Map(
    travelers.map((traveler) => [traveler.id, traveler]),
  );

  return [...new Set(userIds)].map((id) => {
    const traveler = travelerById.get(id);
    const role =
      id === resolvedOwnerId
        ? 'owner'
        : (memberRoles[id] ??
          (legacyViewerIds.includes(id) ? 'viewer' : 'editor'));

    return {
      id,
      username: traveler?.username ?? 'Trip participant',
      profilePicture: traveler?.profile_picture,
      role,
      roleLabel: role[0].toUpperCase() + role.slice(1),
    };
  });
};
