const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { Writable } = require("node:stream");
const storage = require("../services/photoStorage");
const Photo = require("../models/Photo");
const Trip = require("../models/trip");
const { deleteTripPhotos, reconcilePhotos } = require("../services/photoCleanup");

test("GridFS writes wait for completion, abort partial writes, and tolerate missing-file retries", async (t) => {
  const id = new mongoose.Types.ObjectId();
  let aborted = false;
  let failUpload = false;
  let deleteError;
  t.mock.getter(mongoose.mongo, "GridFSBucket", () => class {
    openUploadStream() {
      const stream = new Writable({ write(chunk, encoding, callback) { callback(failUpload ? new Error("write failed") : null); } });
      stream.id = id;
      stream.abort = async () => { aborted = true; };
      return stream;
    }
    async delete() { if (deleteError) throw deleteError; }
  });
  assert.equal(await storage.upload(Buffer.from("bytes"), id), id);
  failUpload = true;
  await assert.rejects(storage.upload(Buffer.from("bytes"), id), /write failed/);
  assert.equal(aborted, true);
  deleteError = new mongoose.mongo.MongoRuntimeError(`File not found for id ${id}`);
  await storage.remove(id);
  deleteError = new Error("database disconnected");
  await assert.rejects(storage.remove(id), /disconnected/);
});

test("trip cleanup removes bytes first and retains metadata when storage fails", async (t) => {
  const record = { _id: "photo", fileId: "file" };
  const operations = [];
  t.mock.method(Photo, "updateMany", async () => operations.push("hide"));
  t.mock.method(Photo, "find", () => ({ cursor: async function* () { yield record; } }));
  t.mock.method(Photo, "deleteOne", async () => operations.push("metadata"));
  const remove = t.mock.method(storage, "remove", async () => operations.push("bytes"));
  await deleteTripPhotos("trip");
  assert.deepEqual(operations, ["hide", "bytes", "metadata"]);
  operations.length = 0;
  remove.mock.mockImplementation(async () => { throw new Error("storage down"); });
  await assert.rejects(deleteTripPhotos("trip"), /storage down/);
  assert.deepEqual(operations, ["hide"]);
});

test("reconciliation repairs stale tombstones, deleted-trip records, and unreferenced files", async (t) => {
  const photos = [
    { _id: "deleting", status: "deleting", fileId: "a" },
    { _id: "orphan", status: "ready", trip: "gone", fileId: "b" },
    { _id: "live", status: "ready", trip: "exists", fileId: "c" }
  ];
  const removed = [];
  t.mock.method(Photo, "find", () => ({ cursor: async function* () { yield* photos; } }));
  t.mock.method(Trip, "exists", async ({ _id }) => _id === "exists");
  t.mock.method(Photo, "updateOne", async () => {});
  t.mock.method(Photo, "deleteOne", async () => {});
  t.mock.method(Photo, "exists", async ({ fileId }) => fileId === "referenced");
  t.mock.method(storage, "remove", async (id) => removed.push(id));
  t.mock.method(storage, "getBucket", () => ({ find: async function* () {
    yield { _id: "unreferenced" }; yield { _id: "referenced" };
  } }));
  await reconcilePhotos();
  assert.deepEqual(removed, ["a", "b", "unreferenced"]);
});
