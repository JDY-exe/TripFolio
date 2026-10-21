/** Reads a valid coordinate pair, including zero, from an event record.
 * @param {object} event - Stored event or resolved location.
 * @returns {{lat: number, lng: number} | null} Usable coordinates.
 */
const getEventCoordinates = (event) =>
  Number.isFinite(event.lat) && Number.isFinite(event.lng)
    && Math.abs(event.lat) <= 90 && Math.abs(event.lng) <= 180
    ? { lat: event.lat, lng: event.lng } : null;

/** Fetches only coordinates for a selected Google place, without address matching.
 * @param {string} placeId - Selected Google place identifier.
 * @returns {Promise<{lat: number, lng: number} | null>} The place's coordinates.
 */
const lookupPlaceCoordinates = async (placeId) => {
  if (!placeId) return null;
  if (!process.env.GOOGLE_API_KEY) throw new Error('Google Places is not configured');
  const id = placeId.replace(/^places\//, '');
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'location',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Google place lookup returned ${response.status}`);
  const { location } = await response.json();
  return getEventCoordinates({ lat: location?.latitude, lng: location?.longitude });
};

/** Looks up selected-place coordinates during saving without blocking event creation on failure.
 * @param {string} placeId - Google place identifier, if selected.
 * @returns {Promise<{lat: number, lng: number} | null>} Coordinates, or null for lazy retry.
 */
const tryPlaceCoordinates = async (placeId) => {
  try {
    return await lookupPlaceCoordinates(placeId);
  } catch {
    return null;
  }
};

module.exports = { getEventCoordinates, lookupPlaceCoordinates, tryPlaceCoordinates };
