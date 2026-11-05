const { isDeepStrictEqual } = require("node:util");
const { normalize, conflictError } = require("./checkedUpdate");
const equal = (left, right) =>
  isDeepStrictEqual(normalize(left), normalize(right));
const selection = (actions) => actions.map(({ eventType }) => eventType).sort();
/** Merges a batch of linked-record edits at each event's scalar field boundaries.
 * itineraryActions is a write batch, not a stored reservation array. Flight
 * segments remain atomic; independent linked-event times must not conflict.
 * The booking version is touched by linked-event writes, so comparison and the
 * subsequent event writes are re-run together on transaction retries.
 * @param {object} current - Current booking with its linked itineraryActions.
 * @param {object} request - Immutable checked request from the editor.
 * @returns {object} A checked request containing the safely merged action batch.
 */
const mergeReservationActions = (current, request) => {
  if (!Object.hasOwn(request.changes || {}, "itineraryActions")) return request;
  if (
    !Number.isSafeInteger(request.expectedVersion) ||
    request.expectedVersion < 0
  )
    throw Object.assign(new Error("Provide expectedVersion"), { status: 400 });
  const original = request.original?.itineraryActions;
  const submitted = request.changes.itineraryActions;
  if (
    !Array.isArray(original) ||
    !Array.isArray(submitted) ||
    [...original, ...submitted].some(
      (action) =>
        !action ||
        typeof action !== "object" ||
        typeof action.eventType !== "string",
    )
  )
    throw Object.assign(
      new Error("Provide original and submitted itinerary action arrays"),
      { status: 400 },
    );
  if (
    [original, submitted].some(
      (actions) =>
        new Set(actions.map(({ eventType }) => eventType)).size !==
        actions.length,
    )
  )
    throw Object.assign(new Error("Choose each itinerary action only once"), {
      status: 400,
    });
  const saved = current.itineraryActions;
  const proposed = saved.map((action) => ({ ...action }));
  const stale = request.expectedVersion !== current.version;
  const selectionChanged = !equal(selection(original), selection(submitted));
  let selectionConflict =
    stale && selectionChanged && !equal(selection(original), selection(saved));
  const conflicts = [];
  if (selectionChanged) {
    for (const action of original) {
      if (
        !submitted.some((candidate) => candidate.eventType === action.eventType)
      ) {
        const index = proposed.findIndex(
          (candidate) => candidate.eventType === action.eventType,
        );
        const currentAction = saved.find(
          (candidate) => candidate.eventType === action.eventType,
        );
        // Removing a record that another editor changed also requires review.
        if (currentAction && !Number.isSafeInteger(action.version))
          throw Object.assign(
            new Error("Review the linked record version before removing it"),
            { status: 400 },
          );
        if (currentAction && action.version !== currentAction.version)
          selectionConflict = true;
        if (index >= 0) proposed.splice(index, 1);
      }
    }
  }
  for (const action of submitted) {
    const before = original.find(
      (candidate) => candidate.eventType === action.eventType,
    );
    let index = proposed.findIndex(
      (candidate) => candidate.eventType === action.eventType,
    );
    const currentAction = saved.find(
      (candidate) => candidate.eventType === action.eventType,
    );
    if (!before) {
      if (currentAction) selectionConflict = true;
      if (index < 0) {
        proposed.push({ ...action });
        index = proposed.length - 1;
      } else proposed[index] = { ...action };
      continue;
    }
    for (const field of ["startTime", "endTime"]) {
      if (equal(before[field], action[field])) continue;
      if (!currentAction) {
        selectionConflict = true;
        if (index < 0) {
          proposed.push({ ...action });
          index = proposed.length - 1;
        }
      } else if (
        (stale ||
          (before.version !== undefined &&
            before.version !== currentAction.version)) &&
        !equal(before[field], currentAction[field])
      ) {
        conflicts.push({
          field: `itineraryActions.${index}.${field}`,
          rootField: "itineraryActions",
          label: `${action.eventType.replaceAll("_", " ")} · ${field === "startTime" ? "Start time" : "End time"}`,
          original: before[field],
          current: currentAction[field],
          submitted: action[field],
        });
      }
      proposed[index][field] = action[field];
    }
  }
  if (selectionConflict) {
    const error = conflictError(current, [
      {
        field: "itineraryActions",
        label: "Linked itinerary entries",
        original,
        current: saved,
        submitted: proposed,
      },
    ]);
    error.payload.mergedChanges = { itineraryActions: proposed };
    throw error;
  }
  if (conflicts.length) {
    const error = conflictError(current, conflicts);
    error.payload.mergedChanges = { itineraryActions: proposed };
    throw error;
  }
  return {
    ...request,
    changes: { ...request.changes, itineraryActions: proposed },
    original: { ...request.original, itineraryActions: saved },
  };
};
module.exports = { mergeReservationActions };
