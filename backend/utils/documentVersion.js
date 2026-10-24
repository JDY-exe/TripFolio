const { isDeepStrictEqual } = require("node:util");

/** Creates an HTTP error whose details can safely be returned to the caller. */
const mutationError = (status, message, details = {}) =>
  Object.assign(new Error(message), { status, ...details });

/** Requires a nonnegative, incrementable integer supplied by the client. */
const requireVersion = (value) => {
  if (value === undefined)
    throw mutationError(428, "expectedVersion is required");
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= Number.MAX_SAFE_INTEGER
  ) {
    throw mutationError(
      400,
      "expectedVersion must be a nonnegative safe integer",
    );
  }
  return value;
};

/** Checks a client's baseline before validating or changing a hydrated document. */
const checkVersion = (document, expectedVersion) => {
  requireVersion(expectedVersion);
  if (document.version !== expectedVersion) {
    throw mutationError(409, "This item changed while you were editing it.", {
      code: "VERSION_CONFLICT",
      current: document,
    });
  }
};

/** Reports a failed compare-and-swap using a fresh read, never the local draft. */
const throwCurrentConflict = async (Model, id, session) => {
  const current = await Model.findById(id).session(session || null);
  if (!current) throw mutationError(404, "This item has been deleted.");
  throw mutationError(409, "This item changed while you were editing it.", {
    code: "VERSION_CONFLICT",
    current,
  });
};

/** Validates an allowlisted patch and commits it with one atomic version check. */
const updateVersioned = async (document, expectedVersion, changes, session) => {
  checkVersion(document, expectedVersion);
  const before = document.toObject();
  for (const [field, value] of Object.entries(changes))
    document.set(field, value);
  await document.validate();
  const after = document.toObject();
  const patch = Object.fromEntries(
    Object.keys(changes)
      .filter((field) => !isDeepStrictEqual(before[field], after[field]))
      .map((field) => [field, after[field]]),
  );
  const Model = document.constructor;
  if (Object.keys(patch).length === 0) {
    const current = await Model.findOne({
      _id: document._id,
      version: expectedVersion,
    }).session(session || null);
    if (!current) await throwCurrentConflict(Model, document._id, session);
    return current;
  }
  const updated = await Model.findOneAndUpdate(
    { _id: document._id, version: expectedVersion },
    { $set: patch, $inc: { version: 1 } },
    { returnDocument: "after", session },
  );
  if (!updated) await throwCurrentConflict(Model, document._id, session);
  return updated;
};

/** Deletes only the document whose version the user reviewed. */
const deleteVersioned = async (document, expectedVersion, session) => {
  checkVersion(document, expectedVersion);
  const removed = await document.constructor.findOneAndDelete(
    { _id: document._id, version: expectedVersion },
    { session },
  );
  if (!removed)
    await throwCurrentConflict(document.constructor, document._id, session);
  return removed;
};

/** Returns typed mutation failures without leaking unexpected server errors. */
const sendMutationError = (res, error) =>
  res
    .status(error.status || (error.name === "ValidationError" ? 400 : 500))
    .json({
      message:
        error.status || error.name === "ValidationError"
          ? error.message
          : "Unable to save changes",
      ...(error.code === "VERSION_CONFLICT"
        ? { code: error.code, current: error.current }
        : {}),
    });

module.exports = {
  mutationError,
  requireVersion,
  checkVersion,
  updateVersioned,
  deleteVersioned,
  sendMutationError,
};
