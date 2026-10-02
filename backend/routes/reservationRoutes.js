const express = require("express");
const Reservation = require("../models/Reservation");
const router = express.Router();
const Trip = require("../models/trip");
const authenticateToken = require("../middleware/authenticateToken");
const { canEditTrip, canReadTrip, getTripRole } = require("../utils/tripAccess");

router.use(authenticateToken);

const findTripWithAccess = async (req, res, tripId, needsWriteAccess = false) => {
    const trip = await Trip.findById(tripId);
    const role = getTripRole(trip, req.user.id);

    if (!trip || !canReadTrip(trip, req.user.id)) {
        res.status(404).json({ message: "Trip not found" });
        return null;
    }
    if (needsWriteAccess && !canEditTrip(trip, req.user.id)) {
        res.status(role ? 403 : 404).json({
            message: role ? "You do not have permission to edit this trip" : "Trip not found"
        });
        return null;
    }
    return trip;
};

const findEditableReservation = async (req, res, reservationId) => {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
        res.status(404).json({ message: "Reservation not found" });
        return null;
    }

    const trip = await findTripWithAccess(req, res, reservation.trip, true);
    return trip ? reservation : null;
};

router.post("/hotels", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, accommodations, tripId } = req.body;
        console.log(req.body);
        if (!name || !startTime || !endTime || !accommodations?.address || !tripId) {
            return res.status(400).json({
                message: "Name, start time, end time, and hotel address are required"
            });
        }

        if (new Date(endTime) < new Date(startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId, true);
        if (!trip) return;
        const reservation = new Reservation({
            type: "accommodations",
            name,
            startTime,
            endTime,
            confirmationNumber,
            cost,
            notes,
            trip: tripId,
            accommodations: {
                address: accommodations.address
            }
        });
        const savedReservation = await reservation.save();
        trip.reservations.push(savedReservation._id);
        await trip.save();
        return res.status(201).json({
            message: "Hotel reservation created successfully",
            reservation: savedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

router.post("/rental_cars", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, rentals, tripId } = req.body;
        if (!name || !startTime || !endTime || !rentals?.company || !tripId) {
            return res.status(400).json({
                message: "Name, start time, end time, and rental comapny are required"
            });
        }

        if (new Date(endTime) < new Date(startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId, true);
        if (!trip) return;
        const reservation = new Reservation({
            type: "rentals",
            name,
            startTime,
            endTime,
            confirmationNumber,
            cost,
            notes,
            trip: tripId,
            rentals: {
                company: rentals.company
            }
        });
        const savedReservation = await reservation.save();
        trip.reservations.push(savedReservation._id);
        await trip.save();
        return res.status(201).json({
            message: "Rental reservation created successfully",
            reservation: savedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

router.post("/flights", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, flights, tripId } = req.body;
        if (!name || !startTime || !endTime || !flights?.airline || !flights?.flightNum || !flights?.departAirport || !flights?.arriveAirport || !tripId) {
            return res.status(400).json({
                message: "Name, start time, end time, and flight information are required"
            });
        }

        if (new Date(endTime) < new Date(startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId, true);
        if (!trip) return;
        const reservation = new Reservation({
            type: "flights",
            name,
            startTime,
            endTime,
            confirmationNumber,
            cost,
            notes,
            trip: tripId,
            flights: {
                airline: flights.airline,
                flightNum: flights.flightNum,
                departAirport: flights.departAirport,
                arriveAirport: flights.arriveAirport
            }
        });
        const savedReservation = await reservation.save();
        trip.reservations.push(savedReservation._id);
        await trip.save();
        return res.status(201).json({
            message: "Flight reservation created successfully",
            reservation: savedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

router.patch("/hotels/:id", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, accommodations } = req.body;
        const { id } = req.params;


        const reservation = await findEditableReservation(req, res, id);
        if (!reservation) return;
        if (reservation.type !== "accommodations") {
            return res.status(400).json({ message: "Reservation is not a hotel reservation" });
        }
        if (name !== undefined) {
            reservation.name = name;
        }
        if (startTime !== undefined) {
            reservation.startTime = startTime;
        }
        if (endTime !== undefined) {
            reservation.endTime = endTime;
        }
        if (confirmationNumber !== undefined) {
            reservation.confirmationNumber = confirmationNumber;
        }
        if (cost !== undefined) {
            reservation.cost = cost;
        }
        if (notes !== undefined) {
            reservation.notes = notes;
        }
        if (accommodations?.address !== undefined) {
            reservation.accommodations.address = accommodations.address;
        }

        if (new Date(reservation.endTime) < new Date(reservation.startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const updatedReservation = await reservation.save();
        return res.status(200).json({
            message: "Hotel reservation updated successfully",
            reservation: updatedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
})

router.patch("/rental_cars/:id", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, rentals } = req.body;
        const { id } = req.params;
        const reservation = await findEditableReservation(req, res, id);
        if (!reservation) return;
        if (reservation.type !== "rentals") {
            return res.status(400).json({ message: "Reservation is not a rental reservation" });
        }
        if (name !== undefined) {
            reservation.name = name;
        }
        if (startTime !== undefined) {
            reservation.startTime = startTime;
        }
        if (endTime !== undefined) {
            reservation.endTime = endTime;
        }
        if (confirmationNumber !== undefined) {
            reservation.confirmationNumber = confirmationNumber;
        }
        if (cost !== undefined) {
            reservation.cost = cost;
        }
        if (notes !== undefined) {
            reservation.notes = notes;
        }
        if (rentals?.company !== undefined) {
            reservation.rentals.company = rentals.company;
        }
        if (new Date(reservation.endTime) < new Date(reservation.startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const updatedReservation = await reservation.save();
        return res.status(200).json({
            message: "Rental reservation updated successfully",
            reservation: updatedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
})

router.patch("/flights/:id", async (req, res) => {
    try {
        const { name, startTime, endTime, confirmationNumber, cost, notes, flights } = req.body;
        const { id } = req.params;
        const reservation = await findEditableReservation(req, res, id);
        if (!reservation) return;
        if (reservation.type !== "flights") {
            return res.status(400).json({ message: "Reservation is not a flight reservation" });
        }
        if (name !== undefined) {
            reservation.name = name;
        }
        if (startTime !== undefined) {
            reservation.startTime = startTime;
        }
        if (endTime !== undefined) {
            reservation.endTime = endTime;
        }
        if (confirmationNumber !== undefined) {
            reservation.confirmationNumber = confirmationNumber;
        }
        if (cost !== undefined) {
            reservation.cost = cost;
        }
        if (notes !== undefined) {
            reservation.notes = notes;
        }
        if (flights?.airline !== undefined) {
            reservation.flights.airline = flights.airline;
        }
        if (flights?.flightNum !== undefined) {
            reservation.flights.flightNum = flights.flightNum;
        }
        if (flights?.departAirport !== undefined) {
            reservation.flights.departAirport = flights.departAirport;
        }
        if (flights?.arriveAirport !== undefined) {
            reservation.flights.arriveAirport = flights.arriveAirport;
        }
        if (new Date(reservation.endTime) < new Date(reservation.startTime)) {
            return res.status(400).json({
                message: "End time cannot be before start time"
            });
        }
        const updatedReservation = await reservation.save();
        return res.status(200).json({
            message: "Hotel reservation updated successfully",
            reservation: updatedReservation
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
})
router.get("/flights", async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId);
        if (!trip) return;
        const reservations = await Reservation.find({
            trip: tripId,
            type: "flights"
        });
        return res.status(200).json({
            reservations
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});
router.get("/rental_cars", async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId);
        if (!trip) return;
        const reservations = await Reservation.find({
            trip: tripId,
            type: "rentals"
        });
        return res.status(200).json({
            reservations
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});
router.get("/hotels", async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await findTripWithAccess(req, res, tripId);
        if (!trip) return;
        const reservations = await Reservation.find({
            trip: tripId,
            type: "accommodations"
        });
        return res.status(200).json({
            reservations
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});


module.exports = router;
