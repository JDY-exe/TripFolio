const express = require("express");
const Reservation = require("../models/Reservation");
const router = require("./userRoutes");
const Trip = require("../models/trip");
const authenticateToken = require("../middleware/authenticateToken");

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
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(400).json({
                message: "Couldn't find trip"
            });
        }
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
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(400).json({
                message: "Couldn't find trip"
            });
        }
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
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(400).json({
                message: "Couldn't find trip"
            });
        }
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


        const reservation = await Reservation.findById(id);
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
        const reservation = await Reservation.findById(id);
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
        const reservation = await Reservation.findById(id);
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
router.get("/flights", authenticateToken, async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({
                message: "Couldn't find trip"
            });
        }
        const isUserOnTrip = trip.users.some(
            userId => userId.toString() === req.user.id.toString()
        );
        if (!isUserOnTrip) {
            return res.status(403).json({
                message: "You are not a member of this trip"
            });
        }
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
router.get("/rental_cars", authenticateToken, async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({
                message: "Couldn't find trip"
            });
        }
        const isUserOnTrip = trip.users.some(
            userId => userId.toString() === req.user.id.toString()
        );
        if (!isUserOnTrip) {
            return res.status(403).json({
                message: "You are not a member of this trip"
            });
        }
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
router.get("/hotels", authenticateToken, async (req, res) => {
    try {
        const { tripId } = req.query;

        if (!tripId) {
            return res.status(400).json({
                message: "Trip ID is required"
            });
        }
        const trip = await Trip.findById(tripId);
        if (!trip) {
            return res.status(404).json({
                message: "Couldn't find trip"
            });
        }
        const isUserOnTrip = trip.users.some(
            userId => userId.toString() === req.user.id.toString()
        );
        if (!isUserOnTrip) {
            return res.status(403).json({
                message: "You are not a member of this trip"
            });
        }
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