const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const Trip = require("../models/trip");
const Reservation = require("../models/Reservation");
const reservationRoutes = require("../routes/reservationRoutes");
const tripRoutes = require("../routes/tripRoutes");

test("reservation routes scope reads and writes to trip editors", async (t) => {
    const original = {
        findByIdTrip: Trip.findById,
        findTrips: Trip.find,
        updateOne: Trip.updateOne,
        find: Reservation.find,
        findById: Reservation.findById,
        create: Reservation.create,
        saveTrip: Trip.prototype.save,
    };
    t.after(() => {
        Trip.findById = original.findByIdTrip;
        Trip.find = original.findTrips;
        Trip.updateOne = original.updateOne;
        Reservation.find = original.find;
        Reservation.findById = original.findById;
        Reservation.create = original.create;
        Trip.prototype.save = original.saveTrip;
    });
    const tripId = "507f1f77bcf86cd799439011";
    const reservationId = "507f1f77bcf86cd799439012";
    const userId = "507f1f77bcf86cd799439013";
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";
    t.after(() => {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    });
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);
    app.use("/trip", tripRoutes);
    const server = app.listen(0);
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const authorization = `Bearer ${jwt.sign(
        { id: userId },
        process.env.JWT_SECRET
    )}`;
    const request = (path, options = {}) =>
        fetch(`${base}${path}`, {
            ...options,
            headers: {
                Authorization: authorization,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

    Trip.findById = async id => {
        assert.equal(String(id), tripId);

        return {
            _id: tripId,
            ownerId: userId,
            users: [userId]
        };
    };
    const mockFlights = [
        {
            _id: reservationId,
            type: "flights",
            trip: tripId,
            name: "Flight",
            startTime: new Date("2027-04-02T08:00:00Z"),
            endTime: new Date("2027-04-02T10:00:00Z"),
            flights: {
                flightNum: "AB123",
                departAirport: "SIN",
                arriveAirport: "KIX",
                nextFlightId: null
            },
            async save() {
                return this;
            }
        }
    ];
    mockFlights.sort = async function () {
        return this;
    };
    Reservation.find = () => mockFlights;
    let response = await request(
        `/logistics/flights?tripId=${tripId}`
    );
    assert.equal(response.status, 200);
    let data = await response.json();
    assert.equal(data.reservations[0].name, "Flight");
    Trip.prototype.save = async function () {
        return this;
    };
    response = await request("/trip", {
        method: "POST",
        body: JSON.stringify({
            name: "New trip",
            startDate: "2027-04-01",
            endDate: "2027-04-10"
        })
    });
    assert.equal(response.status, 201);
    data = await response.json();
    assert.equal(data.savedTrip.users[0], userId);
    Trip.find = query => {
        assert.deepEqual(
            query.$or,
            [
                { ownerId: userId },
                { users: userId }
            ]
        );

        return {
            sort: async () => [
                {
                    _id: tripId,
                    ownerId: userId,
                    users: [userId]
                }
            ]
        };
    };
    response = await request("/trip");
    assert.equal(response.status, 200);
    data = await response.json();
    assert.equal(data[0]._id, tripId);
    Trip.findById = async () => null;
    response = await request(
        `/logistics/flights?tripId=${tripId}`
    );
    assert.equal(response.status, 404);
    Trip.findById = async () => ({
        _id: tripId,
        ownerId: userId,
        users: [userId]
    });
    const payload = {
        tripId,
        name: "Flight",
        startTime: "2027-04-02T08:00:00Z",
        endTime: "2027-04-02T10:00:00Z",
        flights: {
            airline: "Airline",
            flightNum: "AB123",
            departAirport: "SIN",
            arriveAirport: "KIX"
        }
    };
    Reservation.create = async values => ({
        ...values,
        _id: reservationId
    });
    let linked = false;
    Trip.updateOne = async () => {
        linked = true;
    };
    response = await request("/logistics/flights", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    assert.equal(response.status, 201);
    data = await response.json();
    assert.equal(data.reservation.flights.flightNum, "AB123");
    assert.equal(linked, true);
    Reservation.findById = async () => ({
        _id: reservationId,
        trip: tripId,
        type: "flights"
    });
    Trip.findById = async () => null;
    response = await request(
        `/logistics/flights/${reservationId}`,
        {
            method: "DELETE"
        }
    );
    assert.equal(response.status, 404);
    const stored = {
        _id: reservationId,
        trip: tripId,
        type: "flights",
        name: "Flight",
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        flights: {
            ...payload.flights
        },
        set(field, value) {
            if (field.includes(".")) {
                this.flights[field.split(".")[1]] = value;
            } else {
                this[field] = value;
            }
        },
        async save() {
            return this;
        },

        async deleteOne() {
            this.deleted = true;
        }
    };
    Reservation.findById = async () => stored;
    Trip.findById = async () => ({
        _id: tripId,
        ownerId: userId,
        users: [userId]
    });

    response = await request(
        `/logistics/flights/${reservationId}`,
        {
            method: "PATCH",
            body: JSON.stringify({
                name: "Updated flight",
                flights: {
                    flightNum: "AB456"
                }
            })
        }
    );
    assert.equal(response.status, 200);
    data = await response.json();
    assert.equal(
        data.reservation.flights.flightNum,
        "AB456"
    );
    let unlinked = false;
    Trip.updateOne = async (_query, update) => {
        unlinked = Boolean(update.$pull);
    };
    response = await request(
        `/logistics/flights/${reservationId}`,
        {
            method: "DELETE"
        }
    );
    assert.equal(response.status, 200);
    assert.equal(stored.deleted, true);
    assert.equal(unlinked, true);
});
test("GET /logistics/flights rejects missing trip ID", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/flights`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.message, "Trip ID is required");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("GET /logistics/flights rejects an invalid trip ID", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(
        `${base}/logistics/flights?tripId=invalid`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.message, "Trip not found");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("POST /logistics/flights rejects missing required fields", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/flights`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: "507f1f77bcf86cd799439011",
            name: "Flight",
            startTime: "2027-04-02T08:00:00Z",
            endTime: "2027-04-02T10:00:00Z",
            flights: {}
        })
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(
        data.message,
        "Name, start time, end time, and flight information are required"
    );

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("POST /logistics/flights rejects an end time before start time", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/flights`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: "507f1f77bcf86cd799439011",
            name: "Flight",
            startTime: "2027-04-02T10:00:00Z",
            endTime: "2027-04-02T08:00:00Z",
            flights: {
                flightNum: "AB123",
                departAirport: "LAX",
                arriveAirport: "JFK"
            }
        })
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.message, "End time cannot be before start time");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("POST /logistics/flights rejects a negative cost", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/flights`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: "507f1f77bcf86cd799439011",
            name: "Flight",
            startTime: "2027-04-02T08:00:00Z",
            endTime: "2027-04-02T10:00:00Z",
            cost: -10,
            flights: {
                flightNum: "AB123",
                departAirport: "LAX",
                arriveAirport: "JFK"
            }
        })
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.message, "Cost must be zero or more");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("POST /logistics/rental_cars rejects missing rental company", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/rental_cars`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: "507f1f77bcf86cd799439011",
            name: "Enterprise",
            startTime: "2027-04-02T08:00:00Z",
            endTime: "2027-04-04T10:00:00Z",
            rentals: {}
        })
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(
        data.message,
        "Name, start time, end time, and rental company are required"
    );

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("POST /logistics/hotels rejects missing hotel address", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(`${base}/logistics/hotels`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: "507f1f77bcf86cd799439011",
            name: "Hotel",
            startTime: "2027-04-02T08:00:00Z",
            endTime: "2027-04-04T10:00:00Z",
            accommodations: {}
        })
    });

    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(
        data.message,
        "Name, start time, end time, and hotel address are required"
    );

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("PATCH /logistics/flights/:id rejects an invalid reservation ID", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(
        `${base}/logistics/flights/not-a-reservation`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "Updated"
            })
        }
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.message, "Reservation not found");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("DELETE /logistics/flights/:id rejects an invalid reservation ID", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const token = jwt.sign(
        { id: "507f1f77bcf86cd799439013" },
        process.env.JWT_SECRET
    );

    const response = await fetch(
        `${base}/logistics/flights/not-a-reservation`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.message, "Reservation not found");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});


test("GET /logistics/flights requires authentication", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const response = await fetch(
        `${base}/logistics/flights?tripId=507f1f77bcf86cd799439011`
    );

    const data = await response.json();

    assert.equal(response.status, 401);
    assert.equal(data.message, "Authentication required");

    await new Promise(resolve => server.close(resolve));
});


test("GET /logistics/flights rejects an invalid authentication token", async () => {
    const app = express();
    app.use(express.json());
    app.use("/logistics", reservationRoutes);

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;

    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "reservation-test-secret";

    const response = await fetch(
        `${base}/logistics/flights?tripId=507f1f77bcf86cd799439011`,
        {
            headers: {
                Authorization: "Bearer invalid-token"
            }
        }
    );

    const data = await response.json();

    assert.equal(response.status, 401);
    assert.equal(data.message, "Invalid or expired token");

    await new Promise(resolve => server.close(resolve));

    if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = previousSecret;
    }
});