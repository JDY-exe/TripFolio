const EVENT_TYPE = Object.freeze({
  ACTIVITY: "activity",
  RESTAURANT: "restaurant",
  HOTEL_CHECKIN: "hotel_checkin",
  HOTEL_CHECKOUT: "hotel_checkout",
  RENTALCAR_PICKUP: "rentalcar_pickup",
  RENTALCAR_RETURN: "rentalcar_return",
  FLIGHT: "flight",
});
const RESERVATION_EVENT_TYPES = Object.freeze({
  accommodations: [EVENT_TYPE.HOTEL_CHECKIN, EVENT_TYPE.HOTEL_CHECKOUT],
  rentals: [EVENT_TYPE.RENTALCAR_PICKUP, EVENT_TYPE.RENTALCAR_RETURN],
  flights: [EVENT_TYPE.FLIGHT],
});
module.exports = { EVENT_TYPE, RESERVATION_EVENT_TYPES };
