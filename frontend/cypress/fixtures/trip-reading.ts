import archived from './archived-trip';

const travelers = [
  { id: archived.user.id, username: archived.user.username },
  { id: archived.friend.id, username: archived.friend.username },
];
const itinerary = {
  ...archived.itinerary,
  description:
    'We spent five days following the coast, taking the smaller roads whenever we could. Mornings started at the harbor with coffee and a walk past the fishing boats. By afternoon we were usually somewhere between a quiet beach and a village we had only just discovered.\n\nThe museum by the pier was worth slowing down for. We stayed longer than planned, then found a little place for dinner where the windows opened straight onto the sea. If we came back, we would leave another day free just to wander.',
};
const trip = { ...archived.trip, ownerId: archived.user.id, travelers };
const event = { ...archived.event, ...archived.location };

export default {
  ...archived,
  trip,
  itinerary,
  event,
  legacyEvent: archived.event,
  publicDetails: {
    trip,
    owner: { ...travelers[0], profile_picture: null },
    travelers,
    itinerary,
    events: [event],
  },
  longTitle:
    'A slow journey along the coast, through fishing villages and the places we discovered along the way',
};
