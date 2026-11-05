const { checkChanges, conflictError } = require("./checkedUpdate");
const { mergeReservationActions } = require("./reservationActionMerge");

/** Checks every submitted booking field and linked action before reporting conflicts.
 * A conflict response includes the merged action batch even when only a booking
 * field conflicts, so rebasing the whole patch cannot discard concurrent slots.
 * @param {object} Model - Reservation model used to cast booking field comparisons.
 * @param {object} current - Current reservation with linked action snapshots.
 * @param {object} request - Immutable checked editor request.
 * @param {string[]} fields - Editable booking field paths (excluding actions).
 * @param {string[][]} groups - Coupled booking field paths.
 * @returns {object} Checked changes, including safely merged actions if submitted.
 */
const checkReservationChanges = (
  Model,
  current,
  request,
  fields,
  groups = [],
) => {
  const conflicts = [];
  const collectConflict = (error) => {
    if (error.payload?.code !== "EDIT_CONFLICT") throw error;
    conflicts.push(...error.payload.conflicts);
  };
  const submitted = request?.changes;
  const bookingChanges =
    submitted && typeof submitted === "object" && !Array.isArray(submitted)
      ? Object.fromEntries(
          Object.entries(submitted).filter(
            ([field]) => field !== "itineraryActions",
          ),
        )
      : submitted;
  try {
    checkChanges(
      Model,
      current,
      { ...request, changes: bookingChanges },
      fields,
      groups,
    );
  } catch (error) {
    collectConflict(error);
  }

  let mergedChanges = {};
  if (Object.hasOwn(submitted, "itineraryActions")) {
    try {
      const checked = mergeReservationActions(current, request);
      mergedChanges = { itineraryActions: checked.changes.itineraryActions };
    } catch (error) {
      collectConflict(error);
      mergedChanges = error.payload.mergedChanges;
    }
  }
  if (conflicts.length > 0) {
    const error = conflictError(current, conflicts);
    error.payload.mergedChanges = mergedChanges;
    throw error;
  }
  return { ...bookingChanges, ...mergedChanges };
};
module.exports = { checkReservationChanges };
