import featureFixture from './owned-features.json';

export const hotelReservation = featureFixture.accommodation;
export const reservationEvent = {
  ...featureFixture.event,
  title: hotelReservation.name,
  startTime: hotelReservation.startTime,
  endTime: hotelReservation.endTime,
  address: hotelReservation.accommodations.address,
  reservationMade: true,
  placeId: null,
  lat: 25.77,
  lng: -80.19,
};
export const updatedHotelName = 'Updated harbor booking';
