/**
 * Creates the same relationship key regardless of which user sends a request.
 * Sorting both IDs allows the unique database index to prevent duplicate pairs.
 *
 * @param {string|object} firstUserId - ID of either user in the pair.
 * @param {string|object} secondUserId - ID of the other user in the pair.
 * @returns {string} Stable key shared by either request direction.
 */
function getFriendshipPairKey(firstUserId, secondUserId) {
  return [String(firstUserId), String(secondUserId)].sort().join(":");
}

/**
 * Finds request conflicts before inserting a relationship record.
 * Self-requests and existing relationships are rejected with user-facing copy.
 *
 * @param {object} options - Request participants and existing relationship data.
 * @param {string|object} options.requesterId - Authenticated requester's ID.
 * @param {string|object} options.recipientId - Requested user's ID.
 * @param {Array<string|object>} options.requesterFriends - Confirmed friend IDs.
 * @param {object|null} options.existingFriendship - Existing pair record if present.
 * @returns {string|undefined} Conflict message, or undefined when valid.
 */
function getFriendRequestError({
  requesterId,
  recipientId,
  requesterFriends,
  existingFriendship
}) {
  if (String(requesterId) === String(recipientId)) {
    return "You cannot send a friend request to yourself";
  }

  if (requesterFriends.some((friendId) => String(friendId) === String(recipientId))) {
    return "You are already friends with this user";
  }

  if (existingFriendship) {
    return existingFriendship.status === "pending"
      ? "A friend request already exists"
      : "You are already friends with this user";
  }

  return undefined;
}

module.exports = { getFriendRequestError, getFriendshipPairKey };