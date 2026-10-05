const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getFriendRequestError,
  getFriendshipPairKey
} = require("../utils/friendship");

test("friendship pair keys are independent of request direction", () => {
  assert.equal(getFriendshipPairKey("user-a", "user-b"), "user-a:user-b");
  assert.equal(getFriendshipPairKey("user-b", "user-a"), "user-a:user-b");
});

test("friend requests reject self-requests and existing friends", () => {
  assert.equal(
    getFriendRequestError({
      requesterId: "user-a",
      recipientId: "user-a",
      requesterFriends: [],
      existingFriendship: null
    }),
    "You cannot send a friend request to yourself"
  );
  assert.equal(
    getFriendRequestError({
      requesterId: "user-a",
      recipientId: "user-b",
      requesterFriends: ["user-b"],
      existingFriendship: null
    }),
    "You are already friends with this user"
  );
});

test("friend requests reject an existing pending or accepted relationship", () => {
  for (const status of ["pending", "accepted"]) {
    assert.equal(
      getFriendRequestError({
        requesterId: "user-a",
        recipientId: "user-b",
        requesterFriends: [],
        existingFriendship: { status }
      }),
      status === "pending"
        ? "A friend request already exists"
        : "You are already friends with this user"
    );
  }
});