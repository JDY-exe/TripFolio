const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeReservationActions } = require("../utils/reservationActionMerge");
const slot = (eventType, hour, version = 0) => ({
  eventType,
  version,
  startTime: `2030-04-01T${hour}:00:00.000Z`,
  endTime: `2030-04-01T${hour}:30:00.000Z`,
});
const original = [slot("hotel_checkin", "09"), slot("hotel_checkout", "15")];
const patch = (submitted) => ({
  expectedVersion: 3,
  changes: { itineraryActions: submitted },
  original: { itineraryActions: original },
});

test("independent linked records merge without a reservation-wide conflict", () => {
  const current = {
    _id: "booking",
    version: 4,
    itineraryActions: [
      { ...original[0], startTime: "2030-04-01T10:00:00.000Z" },
      original[1],
    ],
  };
  const submitted = [
    original[0],
    { ...original[1], startTime: "2030-04-01T16:00:00.000Z" },
  ];
  const merged = mergeReservationActions(current, patch(submitted));
  assert.equal(
    merged.changes.itineraryActions[0].startTime,
    current.itineraryActions[0].startTime,
  );
  assert.equal(
    merged.changes.itineraryActions[1].startTime,
    submitted[1].startTime,
  );
});
test("independent start and end fields on the same linked event also merge", () => {
  const current = {
    _id: "booking",
    version: 4,
    itineraryActions: [
      { ...original[0], startTime: "2030-04-01T09:10:00.000Z" },
      original[1],
    ],
  };
  const submitted = [
    { ...original[0], endTime: "2030-04-01T09:45:00.000Z" },
    original[1],
  ];
  const merged = mergeReservationActions(current, patch(submitted));
  assert.equal(
    merged.changes.itineraryActions[0].startTime,
    current.itineraryActions[0].startTime,
  );
  assert.equal(
    merged.changes.itineraryActions[0].endTime,
    submitted[0].endTime,
  );
});
test("only overlapping linked scalar fields require choices and unrelated updates survive", () => {
  const current = {
    _id: "booking",
    version: 4,
    itineraryActions: [
      { ...original[0], startTime: "2030-04-01T10:00:00.000Z" },
      { ...original[1], endTime: "2030-04-01T18:00:00.000Z" },
    ],
  };
  const submitted = [
    { ...original[0], startTime: "2030-04-01T11:00:00.000Z" },
    { ...original[1], startTime: "2030-04-01T16:00:00.000Z" },
  ];
  assert.throws(
    () => mergeReservationActions(current, patch(submitted)),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.payload.conflicts.length, 1);
      assert.equal(
        error.payload.conflicts[0].field,
        "itineraryActions.0.startTime",
      );
      const merged = error.payload.mergedChanges.itineraryActions;
      assert.equal(merged[1].startTime, submitted[1].startTime);
      assert.equal(merged[1].endTime, current.itineraryActions[1].endTime);
      return true;
    },
  );
});
test("removing a linked record requires review of its exact latest version", () => {
  const current = {
    _id: "booking",
    version: 4,
    itineraryActions: [{ ...original[0], version: 1 }, original[1]],
  };
  assert.throws(
    () => mergeReservationActions(current, patch([original[1]])),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.payload.conflicts[0].field, "itineraryActions");
      return true;
    },
  );
});
test("a concurrently removed untouched action is not recreated by a different action edit", () => {
  const current = {
    _id: "booking",
    version: 4,
    itineraryActions: [original[1]],
  };
  const merged = mergeReservationActions(
    current,
    patch([
      original[0],
      { ...original[1], startTime: "2030-04-01T16:00:00.000Z" },
    ]),
  );
  assert.equal(merged.changes.itineraryActions.length, 1);
  assert.equal(merged.changes.itineraryActions[0].eventType, "hotel_checkout");
});
