import { describe, expect, it } from 'vitest';
import { getTripTravelerCount } from '../../../src/pages/my-trips/tripTravelerCount';

describe('getTripTravelerCount', () => {
  it('counts unique members and avoids counting the owner twice', () => {
    expect(
      getTripTravelerCount({
        ownerId: 'owner-id',
        users: ['owner-id', 'member-id', 'member-id'],
      }),
    ).toBe(2);
  });

  it('includes an explicit owner missing from the membership list', () => {
    expect(
      getTripTravelerCount({
        ownerId: 'owner-id',
        users: ['member-id'],
      }),
    ).toBe(2);
  });

  it('uses hydrated traveler profiles when membership IDs are unavailable', () => {
    expect(
      getTripTravelerCount({
        travelers: [
          { id: 'owner-id', username: 'owner' },
          { id: 'member-id', username: 'member' },
        ],
      }),
    ).toBe(2);
  });

  it('returns zero when no members or profiles are available', () => {
    expect(getTripTravelerCount({})).toBe(0);
  });
});
