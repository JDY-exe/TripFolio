const toId = (value) => {
  if (value == null) return null;
  return String(value._id ?? value);
};

/**
 * Resolves a user's trip role, retaining compatibility with older trips whose
 * first user was the creator before owner IDs were stored explicitly.
 *
 * @param {object} trip - Trip document or plain trip record.
 * @param {string|object} userId - Authenticated user's ID.
 * @returns {"owner"|"editor"|"viewer"|null} The user's role on the trip.
 */
const getTripRole = (trip, userId) => {
  if (!trip || !userId) return null;

  const currentUserId = toId(userId);
  const ownerId = toId(trip.ownerId);
  if (ownerId === currentUserId) return 'owner';

  const users = Array.isArray(trip.users) ? trip.users : [];
  const isMember = users.some((memberId) => toId(memberId) === currentUserId);
  const memberRoles = trip.memberRoles;
  if (isMember && memberRoles) {
    const explicitRole = memberRoles instanceof Map
      ? memberRoles.get(currentUserId)
      : memberRoles[currentUserId] ?? memberRoles[String(currentUserId)];
    if (explicitRole === 'editor' || explicitRole === 'viewer') {
      return explicitRole;
    }
  }

  if (!ownerId && toId(users[0]) === currentUserId) return 'owner';

  const viewerIds = Array.isArray(trip.viewerIds) ? trip.viewerIds : [];
  if (viewerIds.some((memberId) => toId(memberId) === currentUserId)) {
    return 'viewer';
  }

  if (isMember) return 'editor';

  return null;
};

/**
 * Allows trip members and explicitly shared recipients to read trip content.
 * Archive grants apply only while the trip remains archived.
 *
 * @param {object} trip - Trip document or plain trip record.
 * @param {string|object} userId - Authenticated user's ID.
 * @returns {boolean} Whether the user can read the trip.
 */
const canReadTrip = (trip, userId) => {
  if (!trip || !userId) return false;
  if (getTripRole(trip, userId)) return true;
  if (!trip.archived) return false;

  const sharedWith = Array.isArray(trip.archivedSharedWith)
    ? trip.archivedSharedWith
    : [];
  const currentUserId = toId(userId);
  return sharedWith.some((recipientId) => toId(recipientId) === currentUserId);
};

/**
 * Restricts trip mutations to owners and editors, never read-only viewers.
 *
 * @param {object} trip - Trip document or plain trip record.
 * @param {string|object} userId - Authenticated user's ID.
 * @returns {boolean} Whether the user can modify trip content.
 */
const canEditTrip = (trip, userId) => {
  const role = getTripRole(trip, userId);
  return role === 'owner' || role === 'editor';
};

module.exports = { getTripRole, canReadTrip, canEditTrip };