import featureFixture from './owned-features.json';

export const hotelReservation = featureFixture.accommodation;
export const hotelPrediction = {
  placePrediction: {
    placeId: 'harbor-hotel-place',
    text: {
      text: `${hotelReservation.name}, ${hotelReservation.accommodations.address}`,
    },
    structuredFormat: {
      mainText: { text: hotelReservation.name },
      secondaryText: { text: hotelReservation.accommodations.address },
    },
    types: ['lodging'],
  },
};
export const reservationEvent = {
  ...featureFixture.event,
  title: hotelReservation.name,
  eventType: 'hotel_checkin',
  reservation: hotelReservation._id,
  startTime: `${hotelReservation.startTime.slice(0, 10)}T15:00:00.000Z`,
  endTime: `${hotelReservation.startTime.slice(0, 10)}T15:30:00.000Z`,
  address: hotelReservation.accommodations.address,
  reservationMade: true,
  placeId: null,
  lat: 25.77,
  lng: -80.19,
};
export const updatedHotelName = 'Updated harbor booking';
export const actionInput = {
  checkin: '15:00',
  checkout: '10:00',
  pickup: '10:00',
  return: '16:00',
  pickupAddress: 'Airport rental center',
  returnAddress: 'Downtown rental center',
};
export const bookingInput = {
  cost: '120',
  invalidCost: '-1',
  confirmationNumber: 'TRIP-2048',
  notes: 'Late arrival requested with the booking.',
};
export const checkoutEvent = {
  ...reservationEvent,
  _id: '64b000000000000000000011',
  eventType: 'hotel_checkout',
  startTime: `${hotelReservation.endTime.slice(0, 10)}T10:00:00.000Z`,
  endTime: `${hotelReservation.endTime.slice(0, 10)}T10:30:00.000Z`,
};
