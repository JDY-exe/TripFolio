// Temporary one-time migration for flights created before embedded segments.
// From backend/: node scripts/migrateFlightsToSegments.js [--apply]
// Dry-run is the default. Set MONGO_URI or provide backend/.env before running.
// Legacy timestamps have no airport time zone, so their UTC clock components
// become the local wall-clock strings. The original Date values are retained.

const path = require("node:path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Reservation = require("../models/Reservation");

dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

function toLocalClock(value) {
    if (value === null || value === undefined) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 16);
}

function legacySegment(reservation) {
    const { flightNum, departAirport, arriveAirport } = reservation.flights || {};
    const departTime = toLocalClock(reservation.startTime);
    const arriveTime = toLocalClock(reservation.endTime);
    if (![flightNum, departAirport, arriveAirport].every(value =>
        typeof value === "string" && value.trim()) || !departTime || !arriveTime) {
        return null;
    }
    return {
        flightNum: flightNum.trim(),
        departAirport: departAirport.trim(),
        departTime,
        arriveAirport: arriveAirport.trim(),
        arriveTime,
    };
}

async function migrateFlights(apply) {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await mongoose.connect(process.env.MONGO_URI);
    try {
        // Use the raw collection so the removed nextFlightId path is still visible.
        const flights = await Reservation.collection.find(
            { type: "flights" },
            { projection: { _id: 1, flights: 1, startTime: 1, endTime: 1 } },
        ).toArray();
        const operations = [];
        const invalidIds = [];
        let converted = 0;
        let alreadyCurrent = 0;
        let oldLinks = 0;

        for (const flight of flights) {
            const segments = flight.flights?.segments;
            const hasSegments = Array.isArray(segments) && segments.length > 0;
            const hasOldLink = Object.hasOwn(flight.flights || {}, "nextFlightId");
            if (hasOldLink) oldLinks += 1;
            if (hasSegments) {
                alreadyCurrent += 1;
                if (hasOldLink) operations.push({
                    updateOne: {
                        filter: { _id: flight._id, "flights.nextFlightId": { $exists: true } },
                        update: { $unset: { "flights.nextFlightId": "" } },
                    },
                });
                continue;
            }

            const segment = legacySegment(flight);
            if (!segment) {
                invalidIds.push(String(flight._id));
                continue;
            }
            converted += 1;
            operations.push({
                updateOne: {
                    filter: {
                        _id: flight._id,
                        $or: [
                            { "flights.segments": { $exists: false } },
                            { "flights.segments": { $size: 0 } },
                        ],
                    },
                    update: {
                        $set: { "flights.segments": [segment] },
                        $unset: { "flights.nextFlightId": "" },
                    },
                },
            });
        }

        console.log(JSON.stringify({ total: flights.length, toConvert: converted, alreadyCurrent, oldLinks, invalidIds }, null, 2));
        if (invalidIds.length) throw new Error("Some flights lack required data; no writes were made");
        if (!apply) {
            console.log("Dry run only. Re-run with --apply to write the migration.");
            return;
        }
        if (!operations.length) {
            console.log("All flights are already migrated.");
            return;
        }
        const result = await Reservation.collection.bulkWrite(operations, { ordered: true });
        console.log(`Updated ${result.modifiedCount} flight reservations.`);
        if (result.matchedCount !== operations.length) {
            throw new Error("Some flights changed during migration; run the dry run again");
        }
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== "--apply" && arg !== "--help") || args.length > 1) {
        console.error("Usage: node scripts/migrateFlightsToSegments.js [--apply]");
        process.exitCode = 2;
    } else if (args.includes("--help")) {
        console.log("Dry-run by default. Pass --apply to write one segment per legacy flight and remove old nextFlightId fields.");
    } else {
        migrateFlights(args.includes("--apply")).catch(error => {
            console.error(`Flight migration failed: ${error.message}`);
            process.exitCode = 1;
        });
    }
}

module.exports = { legacySegment, toLocalClock };
