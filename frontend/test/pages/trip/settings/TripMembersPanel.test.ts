import { describe, expect, it } from 'vitest';
import { getTripMembers } from '../../../../src/pages/trip/settings/tripMembers';

describe('getTripMembers', () => {
  it('resolves member names and explicit or legacy roles', () => {
    const members = getTripMembers(
      ['owner-id', 'viewer-id', 'editor-id', 'viewer-id'],
      [
        { id: 'owner-id', username: 'owner' },
        { id: 'viewer-id', username: 'viewer', profile_picture: 'avatar-data' },
        { id: 'editor-id', username: 'editor' },
      ],
      'owner-id',
      ['viewer-id'],
      { 'editor-id': 'editor' },
    );

    expect(members).toEqual([
      {
        id: 'owner-id',
        username: 'owner',
        profilePicture: undefined,
        role: 'owner',
        roleLabel: 'Owner',
      },
      {
        id: 'viewer-id',
        username: 'viewer',
        profilePicture: 'avatar-data',
        role: 'viewer',
        roleLabel: 'Viewer',
      },
      {
        id: 'editor-id',
        username: 'editor',
        profilePicture: undefined,
        role: 'editor',
        roleLabel: 'Editor',
      },
    ]);
  });

  it('falls back to the legacy first-member owner and a safe display name', () => {
    expect(getTripMembers(['legacy-owner', 'unknown-member'], [])).toEqual([
      {
        id: 'legacy-owner',
        username: 'Trip participant',
        profilePicture: undefined,
        role: 'owner',
        roleLabel: 'Owner',
      },
      {
        id: 'unknown-member',
        username: 'Trip participant',
        profilePicture: undefined,
        role: 'editor',
        roleLabel: 'Editor',
      },
    ]);
  });
});
