/** Gives editable models an explicit CAS version on saves and all query updates.
 * Document saves use Mongoose optimistic concurrency with `version`, not `__v`.
 * Query callers still own conflict checking; this hook covers internal mutations.
 */
module.exports = (schema) => {
  schema.set("versionKey", "version");
  schema.set("optimisticConcurrency", true);
  schema.add({ version: { type: Number, default: 0, min: 0 } });
  schema.pre("save", function () {
    // Even a same-millisecond/no-op save must execute a versioned write.
    if (!this.isNew) this.markModified("updatedAt");
  });
  for (const operation of ["replaceOne", "findOneAndReplace", "bulkWrite"]) {
    schema.pre(operation, function () {
      throw new Error(
        "Use checked updates or versioned document saves instead of replacement/bulk writes",
      );
    });
  }
  for (const operation of ["updateOne", "updateMany", "findOneAndUpdate"]) {
    schema.pre(operation, function () {
      const update = this.getUpdate();
      if (Array.isArray(update))
        throw new Error(
          "Pipeline updates must explicitly support record versions",
        );
      if (!update) return;
      delete update.version;
      if (update.$set) delete update.$set.version;
      if (update.$unset) delete update.$unset.version;
      update.$inc = { ...update.$inc, version: 1 };
    });
  }
};
