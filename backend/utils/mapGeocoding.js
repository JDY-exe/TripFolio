const MapLocation = require('../models/MapLocation');

let queue = Promise.resolve();
let lastRequestAt = 0;
const pending = new Map();

/** Resolves an address through Nominatim, caching hits and misses in MongoDB.
 * Concurrent requests for the same address share one lookup. Public-service
 * requests run serially at most once per second, never as autocomplete.
 * @param {string} address - The saved event address.
 * @returns {Promise<{lat: number, lng: number} | null>} Matched coordinates.
 */
const geocodeAddress = (address) => {
  const key = address.trim().replace(/\s+/g, ' ');
  if (!key) return Promise.resolve(null);
  if (pending.has(key)) return pending.get(key);

  const lookup = queue.catch(() => {}).then(async () => {
    const cached = await MapLocation.findOne({ address: key });
    if (cached) return Number.isFinite(cached.lat) && Number.isFinite(cached.lng)
      ? { lat: cached.lat, lng: cached.lng } : null;

    const delay = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
    const url = new URL(process.env.MAP_GEOCODING_URL || 'https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', key);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    const response = await fetch(url, {
      headers: { 'User-Agent': process.env.MAP_GEOCODING_USER_AGENT || 'TripFolio/1.0 (itinerary map)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Location lookup returned ${response.status}`);
    const [match] = await response.json();
    const lat = Number(match?.lat);
    const lng = Number(match?.lon);
    const location = match && Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
    await MapLocation.findOneAndUpdate(
      { address: key },
      { $set: location || {}, $setOnInsert: { address: key } },
      { upsert: true },
    );
    return location;
  });
  queue = lookup;
  pending.set(key, lookup);
  lookup.finally(() => pending.delete(key)).catch(() => {});
  return lookup;
};

module.exports = { geocodeAddress };
