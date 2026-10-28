const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const sharp = require("sharp");
const { Readable } = require("node:stream");
const Trip = require("../models/trip");
const Photo = require("../models/Photo");
const storage = require("../services/photoStorage");
const routes = require("../routes/photoRoutes");

// Exercise HTTP, multipart parsing, auth and real Sharp processing without a database.
test("photo API permissions, upload, content, pagination and compensation", { timeout: 10000 }, async (t) => {
  const owner = new mongoose.Types.ObjectId();
  const editor = new mongoose.Types.ObjectId();
  const viewer = new mongoose.Types.ObjectId();
  const stranger = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const trip = { _id: tripId, ownerId: owner, users: [owner, editor, viewer], viewerIds: [viewer], isPublic: true };
  const records = new Map();
  const files = new Map();
  const secret = "photo-test-secret";
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
  t.mock.method(Trip, "findById", async (id) => String(id) === String(tripId) ? trip : null);
  t.mock.method(storage, "upload", async (data) => {
    const id = new mongoose.Types.ObjectId(); files.set(String(id), data); return id;
  });
  t.mock.method(storage, "remove", async (id) => { files.delete(String(id)); });
  t.mock.method(storage, "find", async (id) => files.has(String(id)) ? {} : null);
  t.mock.method(storage, "download", (id) => Readable.from([files.get(String(id))]));
  let failCreate = false;
  let loseCreateAcknowledgement = false;
  t.mock.method(Photo, "create", async (data) => {
    if (failCreate) throw new Error("database unavailable");
    const record = { ...data, _id: data._id || new mongoose.Types.ObjectId(), status: "ready", createdAt: new Date() };
    records.set(String(record._id), record);
    if (loseCreateAcknowledgement) throw new Error("insert committed but acknowledgement lost");
    return record;
  });
  const matches = (record, filter) => String(record.trip) === String(filter.trip) &&
    (!filter._id || String(record._id) === String(filter._id)) && (!filter.status || record.status === filter.status) &&
    (!filter.$or || filter.$or.some((condition) => condition._id
      ? record.createdAt.getTime() === condition.createdAt.getTime() && String(record._id) < String(condition._id.$lt)
      : record.createdAt < condition.createdAt.$lt));
  t.mock.method(Photo, "findOne", async (filter) => [...records.values()].find((p) => matches(p, filter)) || null);
  t.mock.method(Photo, "findOneAndUpdate", async (filter) => {
    const record = [...records.values()].find((p) => matches(p, filter));
    if (record) record.status = "deleting";
    return record;
  });
  t.mock.method(Photo, "deleteOne", async ({ _id }) => { records.delete(String(_id)); });
  let failCompensationUpdate = false;
  t.mock.method(Photo, "updateOne", async ({ _id }) => {
    if (failCompensationUpdate) throw new Error("metadata cleanup unavailable");
    const record = records.get(String(_id));
    if (record) record.status = "deleting";
  });
  t.mock.method(Photo, "find", (filter) => ({ sort: () => ({ limit: (limit) => ({
    lean: async () => [...records.values()].filter((p) => matches(p, filter))
      .sort((a, b) => b.createdAt - a.createdAt || String(b._id).localeCompare(String(a._id))).slice(0, limit)
  }) }) }));
  const app = express();
  app.use("/trip/:tripId/photos", routes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/trip/${tripId}/photos`;
  const send = (url = "", user = owner, options = {}) => fetch(base + url, {
    ...options, headers: { ...(user ? { Authorization: `Bearer ${jwt.sign({ id: String(user) }, secret)}` } : {}), ...options.headers }
  });
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: "blue" } }).png().toBuffer();
  const form = (data = png, name = "image") => {
    const body = new FormData(); body.append(name, new Blob([data], { type: "image/png" }), "test.png"); return body;
  };
  assert.equal((await send("", null)).status, 401);
  assert.equal((await send("", stranger)).status, 404);
  assert.equal((await send("", viewer, { method: "POST", body: form() })).status, 403);
  assert.equal((await send("", owner, { method: "POST", body: form(png, "wrong") })).status, 400);
  assert.equal((await send("", owner, { method: "POST", body: form(Buffer.from("garbage")) })).status, 400);
  assert.equal((await send("", owner, { method: "POST", body: new FormData() })).status, 400);
  const extra = form(); extra.append("caption", "not supported");
  assert.equal((await send("", owner, { method: "POST", body: extra })).status, 400);
  assert.equal((await send("", owner, { method: "POST", body: form(Buffer.alloc(16 * 1024 * 1024 + 1)) })).status, 413);
  const response = await send("", editor, { method: "POST", body: form() });
  assert.equal(response.status, 201, await response.clone().text());
  const { photo } = await response.json();
  assert.equal(photo.contentType, "image/webp");
  assert.equal(photo.fileId, undefined);
  assert.equal(files.size, 1);
  const listed = await (await send("?limit=1", viewer)).json();
  assert.equal(listed.photos.length, 1);
  assert.equal(listed.nextCursor, null);
  const second = await (await send("", owner, { method: "POST", body: form() })).json();
  // Equal timestamps must still paginate without losing either record.
  records.get(second.photo.id).createdAt = records.get(photo.id).createdAt;
  const firstPage = await (await send("?limit=1")).json();
  assert.ok(firstPage.nextCursor);
  const secondPage = await (await send(`?limit=1&cursor=${firstPage.nextCursor}`)).json();
  assert.equal(secondPage.photos.length, 1);
  assert.notEqual(firstPage.photos[0].id, secondPage.photos[0].id);
  assert.equal(secondPage.nextCursor, null);
  await send(`/${second.photo.id}`, owner, { method: "DELETE" });
  const otherTripPhoto = { ...records.get(photo.id), _id: new mongoose.Types.ObjectId(), trip: new mongoose.Types.ObjectId() };
  records.set(String(otherTripPhoto._id), otherTripPhoto);
  assert.equal((await send(`/${otherTripPhoto._id}/content`)).status, 404);
  assert.equal((await send(`/${otherTripPhoto._id}`, owner, { method: "DELETE" })).status, 204);
  assert.ok(records.has(String(otherTripPhoto._id)));
  records.delete(String(otherTripPhoto._id));
  assert.equal((await send("?cursor=bad")).status, 400);
  assert.equal((await send("?limit=101")).status, 400);
  const content = await send(`/${photo.id}/content`, viewer);
  assert.equal(content.status, 200);
  assert.equal(content.headers.get("cache-control"), "no-store");
  assert.equal((await sharp(Buffer.from(await content.arrayBuffer())).metadata()).format, "webp");
  assert.equal((await send(`/${photo.id}/content`, stranger)).status, 404);
  assert.equal((await send("/bad/content")).status, 400);
  assert.equal((await send(`/${photo.id}`, viewer, { method: "DELETE" })).status, 403);
  const originalRemove = storage.remove;
  storage.remove = async () => { throw new Error("storage unavailable"); };
  assert.equal((await send(`/${photo.id}`, editor, { method: "DELETE" })).status, 500);
  assert.equal(records.get(photo.id).status, "deleting");
  assert.equal((await send(`/${photo.id}/content`, viewer)).status, 404);
  storage.remove = originalRemove;
  assert.equal((await send(`/${photo.id}`, editor, { method: "DELETE" })).status, 204);
  assert.equal((await send(`/${photo.id}`, editor, { method: "DELETE" })).status, 204);
  assert.equal(files.size, 0);
  failCreate = true;
  assert.equal((await send("", owner, { method: "POST", body: form() })).status, 500);
  assert.equal(files.size, 0);

  failCreate = false;
  loseCreateAcknowledgement = true;
  assert.equal((await send("", owner, { method: "POST", body: form() })).status, 500);
  assert.equal(records.size, 0, "a committed insert must be cleaned up even when create rejects");
  assert.equal(files.size, 0);

  storage.remove = async () => { throw new Error("storage unavailable"); };
  assert.equal((await send("", owner, { method: "POST", body: form() })).status, 500);
  assert.equal(records.size, 1);
  const tombstone = [...records.values()][0];
  assert.equal(tombstone.status, "deleting", "failed file cleanup must retain a hidden retryable record");
  assert.ok(files.has(String(tombstone.fileId)));
  assert.equal((await (await send()).json()).photos.length, 0);
  storage.remove = originalRemove;
  assert.equal((await send(`/${tombstone._id}`, owner, { method: "DELETE" })).status, 204);
  assert.equal(records.size, 0);
  assert.equal(files.size, 0);

  failCompensationUpdate = true;
  assert.equal((await send("", owner, { method: "POST", body: form() })).status, 500);
  assert.equal(records.size, 1);
  const retained = [...records.values()][0];
  assert.equal(retained.status, "ready");
  assert.ok(files.has(String(retained.fileId)), "do not remove bytes if metadata could not be hidden");
  failCompensationUpdate = false;
  assert.equal((await send(`/${retained._id}`, owner, { method: "DELETE" })).status, 204);
  assert.equal(records.size, 0);
  assert.equal(files.size, 0);
  loseCreateAcknowledgement = false;

  // Reserve slots across processing/storage, rejecting excess work without queuing.
  const originalUpload = storage.upload;
  let releaseUploads;
  let notifyArrived;
  let arrivals = 0;
  const blocked = new Promise((resolve) => { releaseUploads = resolve; });
  const arrived = new Promise((resolve) => { notifyArrived = resolve; });
  storage.upload = async (...args) => {
    arrivals += 1;
    if (arrivals === 2) notifyArrived();
    await blocked;
    return originalUpload(...args);
  };
  const pending = [
    send("", owner, { method: "POST", body: form() }),
    send("", editor, { method: "POST", body: form() })
  ];
  await arrived;
  const busy = await send("", owner, { method: "POST", body: form() });
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get("retry-after"), "5");
  releaseUploads();
  assert.deepEqual((await Promise.all(pending)).map((r) => r.status), [201, 201]);
  storage.upload = originalUpload;
  // Revoking edit permission while storage writes triggers compensation.
  storage.upload = async (...args) => {
    const id = await originalUpload(...args);
    trip.viewerIds.push(editor);
    return id;
  };
  const fileCount = files.size;
  assert.equal((await send("", editor, { method: "POST", body: form() })).status, 403);
  assert.equal(files.size, fileCount);
  storage.upload = originalUpload;
});
