const { isDeepStrictEqual } = require("node:util");

const badRequest = (message) =>
  Object.assign(new Error(message), { status: 400 });
const conflictError = (current, conflicts) =>
  Object.assign(
    new Error(
      "This record changed. Review the saved values before continuing.",
    ),
    { status: 409, payload: { code: "EDIT_CONFLICT", current, conflicts } },
  );
const get = (value, path) =>
  path
    .split(".")
    .reduce(
      (item, key) => (item instanceof Map ? item.get(key) : item?.[key]),
      value,
    );
/** Canonicalizes dates and empty optional values without reordering arrays. */
const normalize = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(new Date(value).getTime())
  )
    return new Date(value).toISOString();
  if (typeof value.toHexString === "function") return value.toHexString();
  if (typeof value.toObject === "function")
    return normalize(value.toObject({ flattenMaps: true }));
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => key !== "_id" && key !== "__v")
        .map((key) => [key, normalize(value[key])]),
    );
  return value;
};
/** Casts input with the model schema before comparing it to persisted values. */
const comparable = (Model, field, value) => {
  const path = Model.schema.path(field);
  try {
    return normalize(
      value == null || value === "" ? null : path ? path.cast(value) : value,
    );
  } catch {
    throw badRequest(`Invalid value for ${field}`);
  }
};
/** Validates a checked patch and compares only submitted logical fields.
 * Groups contain coupled paths, all of which must be included together.
 * Returns the whitelisted changes or throws a structured, non-mutating conflict.
 */
const checkChanges = (Model, current, request, fields, groups = []) => {
  if (!request || typeof request !== "object")
    throw badRequest("Provide a checked update request");
  const { expectedVersion, changes, original } = request;
  if (
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    !changes ||
    typeof changes !== "object" ||
    Array.isArray(changes) ||
    !original ||
    typeof original !== "object" ||
    Array.isArray(original)
  )
    throw badRequest("Provide expectedVersion, changes, and original values");
  for (const field of Object.keys(changes)) {
    if (
      !fields.includes(field) ||
      !Object.hasOwn(original, field) ||
      changes[field] === undefined
    )
      throw badRequest(`Invalid or missing original field: ${field}`);
  }
  for (const group of groups) {
    if (
      group.some((field) => Object.hasOwn(changes, field)) &&
      !group.every((field) => Object.hasOwn(changes, field))
    )
      throw badRequest(`Submit coupled fields together: ${group.join(", ")}`);
  }
  const conflicts = [];
  if (current.version !== expectedVersion) {
    const visited = new Set();
    for (const field of Object.keys(changes)) {
      if (visited.has(field)) continue;
      const group = groups.find((item) => item.includes(field)) || [field];
      group.forEach((key) => visited.add(key));
      if (
        group.some(
          (key) =>
            !isDeepStrictEqual(
              comparable(Model, key, original[key]),
              comparable(Model, key, get(current, key)),
            ),
        )
      ) {
        for (const key of group)
          conflicts.push({
            field: key,
            ...(group.length > 1 ? { group } : {}),
            original: normalize(original[key]),
            current: normalize(get(current, key)),
            submitted: changes[key],
          });
      }
    }
  }
  if (conflicts.length)
    throw conflictError(
      current.toObject ? current.toObject({ flattenMaps: true }) : current,
      conflicts,
    );
  return { ...changes };
};
/** Reloads, authorizes, merges, validates and conditionally writes a record.
 * A lost CAS retries from fresh data. Transaction write conflicts are retried
 * by MongoDB's transaction callback, never converted into edit conflicts.
 */
const checkedUpdate = async ({
  Model,
  id,
  request,
  fields,
  groups,
  authorize,
  prepare,
  session,
  serializeCurrent,
}) => {
  for (;;) {
    const current = await Model.findById(id, null, { session });
    if (!current)
      throw Object.assign(new Error("Record not found"), { status: 404 });
    await authorize(current);
    let changes;
    try {
      changes = checkChanges(Model, current, request, fields, groups);
    } catch (error) {
      if (error.payload && serializeCurrent)
        error.payload.current = serializeCurrent(current);
      throw error;
    }
    const merged = Model.hydrate(current.toObject());
    merged.set(changes);
    if (prepare) await prepare(merged, current, changes);
    try {
      await merged.validate();
    } catch (error) {
      error.status = 400;
      throw error;
    }
    const set = { ...changes };
    for (const path of merged.directModifiedPaths())
      set[path] = merged.get(path);
    const updated = await Model.findOneAndUpdate(
      { _id: id, version: current.version },
      { $set: set, $inc: { version: 1 } },
      { returnDocument: "after", runValidators: true, session },
    );
    if (updated) return updated;
    if (session)
      throw Object.assign(
        new Error("Concurrent transactional write; retry the operation"),
        { status: 503 },
      );
  }
};
/** Deletes only the exact record version that the user reviewed. */
const checkedDelete = async (Model, current, expectedVersion, session) => {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    throw badRequest("Provide the version being deleted");
  if (current.version !== expectedVersion) throw conflictError(current, []);
  const result = await Model.deleteOne(
    { _id: current._id, version: expectedVersion },
    { session },
  );
  if (!result.deletedCount) {
    const latest = await Model.findById(current._id, null, { session });
    throw conflictError(latest, []);
  }
};
module.exports = {
  checkedUpdate,
  checkChanges,
  checkedDelete,
  conflictError,
  normalize,
};
