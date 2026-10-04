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
            if (!tripId || typeof name !== "string" || !name.trim() || !startTime || !endTime ||
                !requiredFields.every(field => typeof details?.[field] === "string" && details[field].trim())) {
                return res.status(400).json({ message: missingMessage });
            }
            if (cost !== undefined && cost !== null && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
                return res.status(400).json({ message: "Cost must be zero or more" });
            }
            if (!hasValidDates(startTime, endTime)) {
                return res.status(400).json({ message: "End time cannot be before start time" });
            }
            const trip = await findTripWithAccess(req, res, tripId, true);
            if (!trip) return;
            const reservation = await Reservation.create({ type, trip: tripId, name: name.trim(), startTime, endTime, confirmationNumber, cost, notes, [type]: details });
            await Trip.updateOne({ _id: tripId }, { $addToSet: { reservations: reservation._id } });
            if (type === "flights") {
                await updateFlightLinks(tripId);
            }
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
            for (const field of ["name", "startTime", "endTime", "confirmationNumber", "cost", "notes"]) {
                if (req.body[field] !== undefined) reservation.set(field, req.body[field]);
            }
            for (const field of fields) {
                if (req.body[type]?.[field] !== undefined) reservation.set(`${type}.${field}`, req.body[type][field]);
            }
            if (reservation.cost !== null && reservation.cost !== undefined &&
                (!Number.isFinite(Number(reservation.cost)) || Number(reservation.cost) < 0)) {
                return res.status(400).json({ message: "Cost must be zero or more" });
            }
            if (!reservation.name?.trim() || !requiredFields.every(field => reservation[type]?.[field]?.trim()) ||
                !hasValidDates(reservation.startTime, reservation.endTime)) {
                return res.status(400).json({ message: "Complete all required fields and enter valid dates" });
            }
            await reservation.save();
            if (type === "flights") {
                await updateFlightLinks(reservation.trip);
            }
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

async function updateFlightLinks(tripId) {
    const flights = await Reservation.find({
        trip: tripId,
        type: "flights"
    });
    for (const flight of flights) {
        flight.flights.nextFlightId = null;
    }
    for (const flight of flights) {
        const arrivalDate = new Date(flight.endTime);

        const nextFlight = flights.find(other => {
            const departureDate = new Date(other.startTime);

            return (
                other._id.toString() !== flight._id.toString() &&
                flight.flights.arriveAirport === other.flights.departAirport &&
                arrivalDate.toDateString() === departureDate.toDateString()
            );
        });

        if (nextFlight) {
            flight.flights.nextFlightId = nextFlight._id;
        }
    }
    await Promise.all(flights.map(flight => flight.save()));
}