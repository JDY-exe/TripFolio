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
  if (!ownerId && toId(users[0]) === currentUserId) return 'owner';

  const viewerIds = Array.isArray(trip.viewerIds) ? trip.viewerIds : [];
  if (viewerIds.some((memberId) => toId(memberId) === currentUserId)) {
    return 'viewer';
  }

  if (users.some((memberId) => toId(memberId) === currentUserId)) {
    return 'editor';
  }

  return null;
};

/**
 * Allows only users with a trip role to read the trip, even if it is marked public.
 *
 * @param {object} trip - Trip document or plain trip record.
 * @param {string|object} userId - Authenticated user's ID.
 * @returns {boolean} Whether the user owns or belongs to the trip.
 */
const canReadTrip = (trip, userId) =>
  Boolean(trip && getTripRole(trip, userId));

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