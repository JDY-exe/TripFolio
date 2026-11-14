const mongoose = require('mongoose');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const Event = require('../models/event');
const Expense = require('../models/Expense');
const Photo = require('../models/Photo');
const MapLocation = require('../models/MapLocation');
const { canReadTrip } = require('../utils/tripAccess');

const calculateHaversineMiles = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth's radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const hasValidCoords = (doc) =>
  doc &&
  typeof doc.lat === 'number' &&
  typeof doc.lng === 'number' &&
  Number.isFinite(doc.lat) &&
  Number.isFinite(doc.lng);

/**
 * Extracts the city name from formatted place addresses
 * (e.g., "Waffle House, East US Highway 36, Avon, IN, USA" -> "Avon").
 */
const extractCityFromAddress = (address) => {
  if (!address || typeof address !== 'string') return null;
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    return /^\d+\s/.test(parts[0]) ? parts[1] : parts[0];
  }

  const working = [...parts];
  // Drop trailing country segment (e.g., "USA", "United States", "France")
  working.pop();

  const last = working[working.length - 1];
  const isStateOrPostal =
    /^[A-Z]{2,3}(\s+[A-Z0-9-]+)?$/i.test(last) || /^\d{4,6}$/.test(last);

  let rawCity =
    isStateOrPostal && working.length >= 2
      ? working[working.length - 2]
      : last;

  // Strip leading or trailing postal/state codes (e.g., "75007 Paris" or "Sydney NSW 2000")
  rawCity = rawCity
    .replace(/^\d{4,6}\s+/, '')
    .replace(/\s+[A-Z]{2,3}\s+\d{4,6}$/i, '')
    .replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '')
    .trim();

  return rawCity || null;
};

exports.getTripStats = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(id).lean();
    if (!trip || (req.user?.id && !canReadTrip(trip, req.user.id))) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // 1. Travel Crew Count (unique IDs across owner, users, and travelers)
    const memberIds = new Set();
    if (trip.ownerId) memberIds.add(String(trip.ownerId));
    if (Array.isArray(trip.users)) {
      trip.users.forEach((u) => u && memberIds.add(String(u)));
    }
    if (Array.isArray(trip.travelers)) {
      trip.travelers.forEach((t) => {
        const tid = t?.id || t?._id || t;
        if (tid) memberIds.add(String(tid));
      });
    }
    const travelerCount = memberIds.size;

    // 2. Total Trip Duration (in days)
    let durationDays = 0;
    if (trip.startDate && trip.endDate) {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffMs =
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) -
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
      durationDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    // 3. Total Expenses & Average Daily Spend
    const expenses = await Expense.find({ tripId: trip._id }).lean();
    const totalExpenses = expenses.reduce((sum, exp) => {
      const val = Number(exp.amount ?? 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    const averageDailySpend =
      durationDays > 0 ? Number((totalExpenses / durationDays).toFixed(2)) : 0;

    // 4. Total Events & Culinary Stops
    const itinerary = await Itinerary.findOne({ tripId: trip._id }).lean();
    const events = itinerary
      ? await Event.find({ itineraryID: itinerary._id })
          .sort({ startTime: 1 })
          .lean()
      : [];

    const totalEvents = events.length;
    const culinaryStops = events.filter(
      (ev) => ev.eventType === 'restaurant'
    ).length;

    // 5. Busiest Day (highest number of events on a single day)
    const eventCountByDate = new Map();
    for (const ev of events) {
      if (!ev.startTime) continue;
      const dateKey = new Date(ev.startTime).toISOString().slice(0, 10);
      eventCountByDate.set(dateKey, (eventCountByDate.get(dateKey) || 0) + 1);
    }

    let busiestDayDate = null;
    let busiestDayCount = 0;
    for (const [dateKey, count] of eventCountByDate.entries()) {
      if (count > busiestDayCount) {
        busiestDayCount = count;
        busiestDayDate = dateKey;
      }
    }

    // 6. Unique Cities Visited & Top 3 by Longest Time Spent
    const cityDurations = new Map();
    for (const ev of events) {
      const city = extractCityFromAddress(ev.address);
      if (!city) continue;

      const startMs = ev.startTime ? new Date(ev.startTime).getTime() : 0;
      const endMs = ev.endTime ? new Date(ev.endTime).getTime() : 0;
      const durationMs =
        Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? endMs - startMs
          : 0;

      const existing = cityDurations.get(city) || {
        name: city,
        totalMs: 0,
        eventCount: 0,
      };
      existing.totalMs += durationMs;
      existing.eventCount += 1;
      cityDurations.set(city, existing);
    }

    const rankedCities = [...cityDurations.values()].sort(
      (a, b) => b.totalMs - a.totalMs || b.eventCount - a.eventCount
    );
    const uniqueCitiesCount = rankedCities.length;
    const topCities = rankedCities.slice(0, 3).map((c) => ({
      name: c.name,
      hours: Number((c.totalMs / (1000 * 60 * 60)).toFixed(1)),
    }));

    // 7. Total Ready Album Photos
    const totalPhotos = await Photo.countDocuments({
      trip: trip._id,
      status: 'ready',
    });

    // 8. Total Geographic Distance across Chronological Events
    const addressesNeedingLookup = [
      ...new Set(
        events
          .filter((ev) => !hasValidCoords(ev) && ev.address)
          .map((ev) => ev.address)
      ),
    ];

    const fallbackLocations =
      addressesNeedingLookup.length > 0
        ? await MapLocation.find({
            address: { $in: addressesNeedingLookup },
          }).lean()
        : [];

    const coordsByAddress = new Map();
    for (const loc of fallbackLocations) {
      if (hasValidCoords(loc)) {
        coordsByAddress.set(loc.address, { lat: loc.lat, lng: loc.lng });
      }
    }

    const orderedCoords = [];
    for (const ev of events) {
      if (hasValidCoords(ev)) {
        orderedCoords.push({ lat: ev.lat, lng: ev.lng });
      } else if (ev.address && coordsByAddress.has(ev.address)) {
        orderedCoords.push(coordsByAddress.get(ev.address));
      }
    }

    let totalDistanceMiles = 0;
    for (let i = 1; i < orderedCoords.length; i++) {
      const prev = orderedCoords[i - 1];
      const curr = orderedCoords[i];
      totalDistanceMiles += calculateHaversineMiles(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      );
    }

    return res.status(200).json({
      tripName: trip.name || 'My Trip',
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelerCount: travelerCount || 0,
      durationDays: durationDays || 0,
      totalExpenses: Number(totalExpenses.toFixed(2)) || 0,
      averageDailySpend: averageDailySpend || 0,
      totalEvents: totalEvents || 0,
      culinaryStops: culinaryStops || 0,
      busiestDay: {
        date: busiestDayDate,
        count: busiestDayCount || 0,
      },
      uniqueCitiesCount: uniqueCitiesCount || 0,
      topCities,
      totalPhotos: totalPhotos || 0,
      totalDistanceMiles: Number(totalDistanceMiles.toFixed(1)) || 0,
    });
  } catch (error) {
    console.error('Error calculating trip stats:', error);
    return res.status(500).json({ message: 'Failed to calculate trip statistics' });
  }
};