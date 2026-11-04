import archivedTrip from './archived-trip';

export default {
  trip: {
    ...archivedTrip.trip,
    currentUserRole: null,
  },
  archivedTrip: {
    ...archivedTrip.trip,
    sharedWithYou: true,
  },
};
