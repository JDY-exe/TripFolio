import { describe, expect, it } from 'vitest';
import {
  classifyFriendRelationship,
  type FriendsResponse,
} from '../../../src/queries/friends';

const relationships: FriendsResponse = {
  friends: [{ id: 'friend', username: 'friend' }],
  incomingRequests: [
    {
      id: 'incoming-request',
      createdAt: '2026-10-01T00:00:00.000Z',
      user: { id: 'incoming', username: 'incoming' },
    },
  ],
  outgoingRequests: [
    {
      id: 'outgoing-request',
      createdAt: '2026-10-02T00:00:00.000Z',
      user: { id: 'outgoing', username: 'outgoing' },
    },
  ],
};

describe('classifyFriendRelationship', () => {
  it.each([
    ['current account', 'current-user', 'current-user', 'self'],
    ['existing friend', 'friend', 'current-user', 'friend'],
    ['incoming request', 'incoming', 'current-user', 'incoming'],
    ['outgoing request', 'outgoing', 'current-user', 'outgoing'],
    ['unrelated account', 'stranger', 'current-user', 'none'],
  ] as const)(
    'classifies %s',
    (_description, targetUserId, currentUserId, expected) => {
      expect(
        classifyFriendRelationship(targetUserId, currentUserId, relationships),
      ).toBe(expected);
    },
  );

  it('does not infer relationships when the server list is unavailable', () => {
    expect(
      classifyFriendRelationship('stranger', 'current-user', undefined),
    ).toBe('none');
  });
});
