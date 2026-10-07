const express = require("express");
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Trip = require("../models/trip");
const authenticateToken = require("../middleware/authenticateToken");
const { canEditTrip, canReadTrip, getTripRole } = require("../utils/tripAccess");

const router = express.Router();
router.use(authenticateToken);

const categories = {
    flights: {
        type: "flights",
        fields: ["flightNum", "departAirport", "arriveAirport"],
        requiredFields: ["flightNum", "departAirport", "arriveAirport"],
        label: "Flight",
        missingMessage: "Name, start time, end time, and flight information are required",
    },
    rental_cars: {
        type: "rentals",
        fields: ["company"],
        label: "Rental",
        missingMessage: "Name, start time, end time, and rental company are required",
    },
    hotels: {
        type: "accommodations",
        fields: ["address"],
        label: "Hotel",
        missingMessage: "Name, start time, end time, and hotel address are required",
    },
};

const hasValidDates = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
};

// Flight times are wall-clock values at their airports. UTC is only a stable
// encoding for the reservation's sortable summary fields.
const isLocalDateTime = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    const date = new Date(`${value}:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 16) === value;
};

const validateFlightSegments = segments => {
    if (!Array.isArray(segments) || segments.length === 0) return "Add at least one flight leg";
    for (const [index, segment] of segments.entries()) {
        if (!["flightNum", "departAirport", "arriveAirport"].every(field =>
            typeof segment?.[field] === "string" && segment[field].trim())) {
            return `Complete the flight number and airports for leg ${index + 1}`;
        }
        if (![segment.departAirport, segment.arriveAirport].every(code => /^[A-Za-z]{3}$/.test(code))) {
            return `Use three-letter airport codes for leg ${index + 1}`;
        }
        if (!isLocalDateTime(segment.departTime) || !isLocalDateTime(segment.arriveTime)) {
            return `Enter valid local dates and times for leg ${index + 1}`;
        }
        if (segment.departAirport.toUpperCase() === segment.arriveAirport.toUpperCase()) {
            return `Choose different airports for leg ${index + 1}`;
        }
        if (index > 0) {
            const previous = segments[index - 1];
            if (previous.arriveAirport.toUpperCase() !== segment.departAirport.toUpperCase()) {
                return `Leg ${index + 1} must depart from the previous arrival airport`;
            }
            if (segment.departTime <= previous.arriveTime) {
                return `Leg ${index + 1} must depart after the previous leg arrives`;
            }
        }
    }
    return null;
};

const flightJourneyFields = segments => ({
    startTime: `${segments[0].departTime}:00.000Z`,
    endTime: `${segments.at(-1).arriveTime}:00.000Z`,
    flights: {
        flightNum: segments[0].flightNum.trim(),
        departAirport: segments[0].departAirport.toUpperCase(),
        arriveAirport: segments.at(-1).arriveAirport.toUpperCase(),
        segments: segments.map(segment => ({
            flightNum: segment.flightNum.trim(),
            departAirport: segment.departAirport.toUpperCase(),
            departTime: segment.departTime,
            arriveAirport: segment.arriveAirport.toUpperCase(),
            arriveTime: segment.arriveTime,
        })),
    },
});

const findTripWithAccess = async (req, res, tripId, needsWriteAccess = false) => {
    if (!mongoose.isValidObjectId(tripId)) {
        res.status(404).json({ message: "Trip not found" });
        return null;
    }
    const trip = await Trip.findById(tripId);
    const role = getTripRole(trip, req.user.id);
    if (!trip || !canReadTrip(trip, req.user.id)) {
        res.status(404).json({ message: "Trip not found" });
        return null;
    }
    if (needsWriteAccess && !canEditTrip(trip, req.user.id)) {
        res.status(role ? 403 : 404).json({
            message: role ? "You do not have permission to edit this trip" : "Trip not found",
        });
        return null;
    }
    return trip;
};

const sendServerError = (res, error) => {
    if (error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Server error" });
};

for (const [path, { type, fields, requiredFields = fields, label, missingMessage }] of Object.entries(categories)) {
    router.get(`/${path}`, async (req, res) => {
        try {
            const { tripId } = req.query;
            if (!tripId) return res.status(400).json({ message: "Trip ID is required" });
            const trip = await findTripWithAccess(req, res, tripId);
            if (!trip) return;
            const reservations = await Reservation.find({ trip: tripId, type }).sort({ startTime: 1 });
            return res.json({ reservations });
        } catch (error) {
            return sendServerError(res, error);
        }
    });

    router.post(`/${path}`, async (req, res) => {
        try {
            const { tripId, name, startTime, endTime, confirmationNumber, cost, notes } = req.body;
            const details = req.body[type];
            const isFlight = type === "flights";
            if (isFlight) {
                const message = validateFlightSegments(details?.segments);
                if (message) return res.status(400).json({ message });
            }
            if (!tripId || typeof name !== "string" || !name.trim() || (!isFlight && (!startTime || !endTime ||
                !requiredFields.every(field => typeof details?.[field] === "string" && details[field].trim())))) {
                return res.status(400).json({ message: missingMessage });
            }
            if (cost !== undefined && cost !== null && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
                return res.status(400).json({ message: "Cost must be zero or more" });
            }
            if (!isFlight && !hasValidDates(startTime, endTime)) {
                return res.status(400).json({ message: "End time cannot be before start time" });
            }
            const trip = await findTripWithAccess(req, res, tripId, true);
            if (!trip) return;
            const journey = isFlight ? flightJourneyFields(details.segments) : null;
            const reservation = await Reservation.create({ type, trip: tripId, name: name.trim(), startTime, endTime, confirmationNumber, cost, notes, [type]: details, ...journey });
            await Trip.updateOne({ _id: tripId }, { $addToSet: { reservations: reservation._id } });
            return res.status(201).json({
                message: `${label} reservation created successfully`,
                reservation,
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    });

    router.patch(`/${path}/:id`, async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Reservation not found" });
            const reservation = await Reservation.findById(req.params.id);
            if (!reservation || reservation.type !== type) return res.status(404).json({ message: "Reservation not found" });
            const trip = await findTripWithAccess(req, res, reservation.trip, true);
            if (!trip) return;
            const isJourneyUpdate = type === "flights" && req.body.flights?.segments !== undefined;
            if (type === "flights" && !isJourneyUpdate &&
                (req.body.flights || req.body.startTime !== undefined || req.body.endTime !== undefined)) {
                return res.status(400).json({ message: "Flight segments are required when changing flight information" });
            }
            if (isJourneyUpdate) {
                const message = validateFlightSegments(req.body.flights.segments);
                if (message) return res.status(400).json({ message });
            }
            for (const field of ["name", "startTime", "endTime", "confirmationNumber", "cost", "notes"]) {
                if (req.body[field] !== undefined) reservation.set(field, req.body[field]);
            }
            for (const field of fields) {
                if (req.body[type]?.[field] !== undefined) reservation.set(`${type}.${field}`, req.body[type][field]);
            }
            if (isJourneyUpdate) {
                const journey = flightJourneyFields(req.body.flights.segments);
                reservation.set("startTime", journey.startTime);
                reservation.set("endTime", journey.endTime);
                reservation.set("flights.flightNum", journey.flights.flightNum);
                reservation.set("flights.departAirport", journey.flights.departAirport);
                reservation.set("flights.arriveAirport", journey.flights.arriveAirport);
                reservation.set("flights.segments", journey.flights.segments);
            }
            if (reservation.cost !== null && reservation.cost !== undefined &&
                (!Number.isFinite(Number(reservation.cost)) || Number(reservation.cost) < 0)) {
                return res.status(400).json({ message: "Cost must be zero or more" });
            }
            const hasJourneySegments = type !== "flights" || Boolean(reservation.flights?.segments?.length);
            if (!reservation.name?.trim() || !requiredFields.every(field => reservation[type]?.[field]?.trim()) ||
                !hasJourneySegments || (type !== "flights" && !hasValidDates(reservation.startTime, reservation.endTime))) {
                return res.status(400).json({ message: "Complete all required fields and enter valid dates" });
            }
            await reservation.save();
            return res.json({
                message: `${label} reservation updated successfully`,
                reservation,
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    });

    router.delete(`/${path}/:id`, async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Reservation not found" });
            const reservation = await Reservation.findById(req.params.id);
            if (!reservation || reservation.type !== type) return res.status(404).json({ message: "Reservation not found" });
            const trip = await findTripWithAccess(req, res, reservation.trip, true);
            if (!trip) return;
            await reservation.deleteOne();
            await Trip.updateOne({ _id: trip._id }, { $pull: { reservations: reservation._id } });
            return res.json({ message: "Reservation deleted" });
        } catch (error) {
            return sendServerError(res, error);
        }
    });
}

module.exports = router;
