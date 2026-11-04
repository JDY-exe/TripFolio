const test = require("node:test");
const assert = require("node:assert/strict");
const Event = require("../models/event");
const {
  validateActions,
  actionLocation,
} = require("../utils/reservationEvents");
const trip = { startDate: "2027-06-12", endDate: "2027-06-15" };
const booking = {
  type: "rentals",
  trip: "trip",
  startTime: "2027-06-12T00:00:00Z",
  endTime: "2027-06-15T00:00:00Z",
  rentals: {
    pickupAddress: "Airport",
    pickupPlaceId: "airport",
    returnAddress: "Downtown",
    returnPlaceId: "downtown",
  },
};
const slot = {
  eventType: "rentalcar_return",
  startTime: "2027-06-15T10:00:00Z",
  endTime: "2027-06-15T10:30:00Z",
};

test("events require a known type and default new activities without transitional fields", () => {
  assert.equal(new Event().eventType, "activity");
  assert.equal(Event.schema.path("eventType").isRequired, true);
  assert.equal(
    new Event({ eventType: "unknown" }).validateSync().errors.eventType.kind,
    "enum",
  );
  assert.equal(Event.schema.path("restaurant"), undefined);
  assert.equal(Event.schema.path("legacyLogistics"), undefined);
});
test("rental actions resolve separate places and reject missing slots, locations and incompatible dates", () => {
  assert.deepEqual(actionLocation(booking, "rentalcar_return"), {
    address: "Downtown",
    placeId: "downtown",
  });
  assert.deepEqual(actionLocation(booking, "rentalcar_pickup"), {
    address: "Airport",
    placeId: "airport",
  });
  assert.doesNotThrow(() => validateActions(booking, [slot], trip));
  for (const actions of [
    [slot, slot],
    [{ ...slot, endTime: slot.startTime }],
    [{ ...slot, startTime: null }],
    [{ ...slot, eventType: "hotel_checkout" }],
    [{ ...slot, endTime: "2027-06-16T01:00:00Z" }],
  ])
    assert.throws(() => validateActions(booking, actions, trip), {
      status: 400,
    });
  assert.throws(
    () => validateActions({ ...booking, rentals: {} }, [slot], trip),
    /locations/,
  );
});
