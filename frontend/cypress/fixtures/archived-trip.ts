import features from './owned-features.json';
import album from './album.json';
import map from './itinerary-map.json';

export default {
  ...features,
  trip: { ...features.trip, archived: true, currentUserRole: 'owner' },
  activeTrip: { ...features.trip, archived: false },
  photo: album.photo,
  mapStyle: map.style,
  location: map.locations['map-museum'],
};
