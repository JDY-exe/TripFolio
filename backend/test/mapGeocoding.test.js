const assert = require("node:assert/strict");
const test = require("node:test");
const MapLocation = require("../models/MapLocation");
const { geocodeAddress } = require("../utils/mapGeocoding");

test("geocoding deduplicates lookups, persists only coordinates, and caches misses", async (t) => {
  const originalFind = MapLocation.findOne;
  const originalUpdate = MapLocation.findOneAndUpdate;
  const originalFetch = global.fetch;
  t.after(() => {
    MapLocation.findOne = originalFind;
    MapLocation.findOneAndUpdate = originalUpdate;
    global.fetch = originalFetch;
  });
  const cache = new Map();
  MapLocation.findOne = async ({ address }) => cache.get(address);
  MapLocation.findOneAndUpdate = async ({ address }, update) =>
    cache.set(address, update.$set);
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url.searchParams.get("q"), "Museum, Miami");
    assert.match(options.headers["User-Agent"], /TripFolio/);
    return {
      ok: true,
      json: async () => [
        { lat: "25.78", lon: "-80.18", display_name: "Unused provider data" },
      ],
    };
  };
  const results = await Promise.all([
    geocodeAddress(" Museum, Miami "),
    geocodeAddress("Museum, Miami"),
  ]);
  assert.deepEqual(results, [
    { lat: 25.78, lng: -80.18 },
    { lat: 25.78, lng: -80.18 },
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(await geocodeAddress("Museum, Miami"), results[0]);
  assert.equal(calls, 1);
  cache.set("Unknown", {});
  assert.equal(await geocodeAddress("Unknown"), null);
  assert.equal(await geocodeAddress(""), null);
  assert.equal(calls, 1);
});
