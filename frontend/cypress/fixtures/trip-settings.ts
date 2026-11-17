import featureFixture from './owned-features.json';
import sharingFixture from './trip-sharing.json';

export const settingsFixture = {
  trip: {
    ...featureFixture.trip,
    ownerId: sharingFixture.ownerId,
    users: [
      sharingFixture.ownerId,
      sharingFixture.memberId,
      sharingFixture.viewerId,
    ],
    memberRoles: {
      [sharingFixture.memberId]: 'editor',
      [sharingFixture.viewerId]: 'viewer',
    },
    hiddenUsers: [] as string[],
    travelers: [
      { id: sharingFixture.ownerId, username: 'Alex' },
      { id: sharingFixture.memberId, username: 'Jordan' },
      { id: sharingFixture.viewerId, username: 'Sam' },
    ],
  },
  itinerary: featureFixture.itinerary,
  draft: 'A relaxed weekend exploring the coast together.',
  saveError: 'Description could not be saved',
};
