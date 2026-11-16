import archived from './archived-trip';
import features from './owned-features.json';

export default {
  currentTrip: features.trip,
  archivedTrip: { ...archived.trip, _id: 'archived-trip', sharedWithYou: true },
  photographedArchive: {
    ...archived.trip,
    _id: 'archived-photo',
    profilePictureId: 'cover',
  },
};
