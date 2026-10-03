const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });

const User = require("../models/User");
const Trip = require("../models/trip");
const Reservation = require("../models/Reservation");

const BASE_URL = "http://localhost:5000";

let userId;
let token;
let tripId;
let hotelId;
let rentalId;
let flightId;

const testUsername = `reservationuser_${Date.now()}`;
const testEmail = `reservation_${Date.now()}@example.com`;
const testPassword = "password123";


// --------------------------------------------------
// SETUP
// --------------------------------------------------

test.before(async () => {
  // Connect this test process to the test database.
  await mongoose.connect(process.env.MONGO_URI);

  // Create test user through the API.
  const registerResponse = await fetch(`${BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: testPassword
    })
  });

  const registerData = await registerResponse.json();

  assert.equal(registerResponse.status, 201);

  userId = registerData.user.id;

  // Log in to get JWT.
  const loginResponse = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  const loginData = await loginResponse.json();

  assert.equal(loginResponse.status, 200);

  token = loginData.token;

  // Create a trip directly in the test database.
  const trip = await Trip.create({
    name: `Reservation Test Trip ${Date.now()}`,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-10"),
    users: [userId],
    reservations: []
  });

  tripId = trip._id.toString();
});


// --------------------------------------------------
// POST /logistics/hotels
// --------------------------------------------------

test("POST /logistics/hotels creates a hotel reservation", async () => {
  const response = await fetch(`${BASE_URL}/logistics/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Hilton Hotel",
      startTime: "2026-10-02T15:00:00.000Z",
      endTime: "2026-10-05T11:00:00.000Z",
      confirmationNumber: "HOTEL123",
      cost: 500,
      notes: "Test hotel",
      accommodations: {
        address: "123 Main Street"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(
    data.message,
    "Hotel reservation created successfully"
  );

  assert.equal(data.reservation.name, "Hilton Hotel");
  assert.equal(data.reservation.type, "accommodations");
  assert.equal(
    data.reservation.accommodations.address,
    "123 Main Street"
  );

  hotelId = data.reservation._id;
});

test("POST /logistics/hotels rejects missing required fields", async () => {
  const response = await fetch(`${BASE_URL}/logistics/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Hilton Hotel"
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Name, start time, end time, and hotel address are required"
  );
});

test("POST /logistics/hotels rejects invalid time range", async () => {
  const response = await fetch(`${BASE_URL}/logistics/hotels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Bad Hotel",
      startTime: "2026-10-05T15:00:00.000Z",
      endTime: "2026-10-02T11:00:00.000Z",
      accommodations: {
        address: "123 Main Street"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// POST /logistics/rental_cars
// --------------------------------------------------

test("POST /logistics/rental_cars creates a rental reservation", async () => {
  const response = await fetch(`${BASE_URL}/logistics/rental_cars`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Enterprise Rental",
      startTime: "2026-10-02T10:00:00.000Z",
      endTime: "2026-10-05T10:00:00.000Z",
      confirmationNumber: "RENT123",
      cost: 300,
      notes: "Test rental",
      rentals: {
        company: "Enterprise"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(
    data.message,
    "Rental reservation created successfully"
  );

  assert.equal(data.reservation.name, "Enterprise Rental");
  assert.equal(data.reservation.type, "rentals");
  assert.equal(
    data.reservation.rentals.company,
    "Enterprise"
  );

  rentalId = data.reservation._id;
});

test("POST /logistics/rental_cars rejects missing required fields", async () => {
  const response = await fetch(`${BASE_URL}/logistics/rental_cars`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Enterprise Rental"
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Name, start time, end time, and rental comapny are required"
  );
});

test("POST /logistics/rental_cars rejects invalid time range", async () => {
  const response = await fetch(`${BASE_URL}/logistics/rental_cars`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Bad Rental",
      startTime: "2026-10-05T10:00:00.000Z",
      endTime: "2026-10-02T10:00:00.000Z",
      rentals: {
        company: "Enterprise"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// POST /logistics/flights
// --------------------------------------------------

test("POST /logistics/flights creates a flight reservation", async () => {
  const response = await fetch(`${BASE_URL}/logistics/flights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Delta Flight",
      startTime: "2026-10-02T08:00:00.000Z",
      endTime: "2026-10-02T12:00:00.000Z",
      confirmationNumber: "FLIGHT123",
      cost: 400,
      notes: "Test flight",
      flights: {
        airline: "Delta",
        flightNum: "DL123",
        departAirport: "ORD",
        arriveAirport: "LAX"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(
    data.message,
    "Flight reservation created successfully"
  );

  assert.equal(data.reservation.name, "Delta Flight");
  assert.equal(data.reservation.type, "flights");
  assert.equal(data.reservation.flights.airline, "Delta");
  assert.equal(data.reservation.flights.flightNum, "DL123");
  assert.equal(data.reservation.flights.departAirport, "ORD");
  assert.equal(data.reservation.flights.arriveAirport, "LAX");

  flightId = data.reservation._id;
});

test("POST /logistics/flights rejects missing required fields", async () => {
  const response = await fetch(`${BASE_URL}/logistics/flights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Delta Flight",
      startTime: "2026-10-02T08:00:00.000Z",
      endTime: "2026-10-02T12:00:00.000Z",
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "Name, start time, end time, and flight information are required"
  );
});

test("POST /logistics/flights rejects invalid time range", async () => {
  const response = await fetch(`${BASE_URL}/logistics/flights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Bad Flight",
      startTime: "2026-10-05T12:00:00.000Z",
      endTime: "2026-10-02T08:00:00.000Z",
      flights: {
        airline: "Delta",
        flightNum: "DL999",
        departAirport: "ORD",
        arriveAirport: "LAX"
      },
      tripId
    })
  });

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// PATCH /logistics/hotels/:id
// --------------------------------------------------

test("PATCH /logistics/hotels/:id updates hotel reservation", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/hotels/${hotelId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Updated Hilton",
        cost: 600,
        notes: "Updated hotel",
        accommodations: {
          address: "456 Updated Street"
        }
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    data.message,
    "Hotel reservation updated successfully"
  );

  assert.equal(data.reservation.name, "Updated Hilton");
  assert.equal(data.reservation.cost, 600);
  assert.equal(data.reservation.notes, "Updated hotel");
  assert.equal(
    data.reservation.accommodations.address,
    "456 Updated Street"
  );
});

test("PATCH /logistics/hotels/:id rejects invalid time range", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/hotels/${hotelId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-10-05T15:00:00.000Z",
        endTime: "2026-10-02T11:00:00.000Z"
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// PATCH /logistics/rental_cars/:id
// --------------------------------------------------

test("PATCH /logistics/rental_cars/:id updates rental reservation", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/rental_cars/${rentalId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Updated Rental",
        cost: 350,
        notes: "Updated rental",
        rentals: {
          company: "Hertz"
        }
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    data.message,
    "Rental reservation updated successfully"
  );

  assert.equal(data.reservation.name, "Updated Rental");
  assert.equal(data.reservation.cost, 350);
  assert.equal(data.reservation.notes, "Updated rental");
  assert.equal(
    data.reservation.rentals.company,
    "Hertz"
  );
});

test("PATCH /logistics/rental_cars/:id rejects invalid time range", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/rental_cars/${rentalId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-10-05T10:00:00.000Z",
        endTime: "2026-10-02T10:00:00.000Z"
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// PATCH /logistics/flights/:id
// --------------------------------------------------

test("PATCH /logistics/flights/:id updates flight reservation", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/flights/${flightId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Updated Delta Flight",
        cost: 450,
        notes: "Updated flight",
        flights: {
          airline: "United",
          flightNum: "UA456",
          departAirport: "LAX",
          arriveAirport: "JFK"
        }
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);

  // Your current route has this message as "Hotel reservation updated successfully".
  assert.equal(
    data.message,
    "Hotel reservation updated successfully"
  );

  assert.equal(data.reservation.name, "Updated Delta Flight");
  assert.equal(data.reservation.cost, 450);
  assert.equal(data.reservation.notes, "Updated flight");
  assert.equal(data.reservation.flights.airline, "United");
  assert.equal(data.reservation.flights.flightNum, "UA456");
  assert.equal(
    data.reservation.flights.departAirport,
    "LAX"
  );
  assert.equal(
    data.reservation.flights.arriveAirport,
    "JFK"
  );
});

test("PATCH /logistics/flights/:id rejects invalid time range", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/flights/${flightId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-10-05T12:00:00.000Z",
        endTime: "2026-10-02T08:00:00.000Z"
      })
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    data.message,
    "End time cannot be before start time"
  );
});


// --------------------------------------------------
// GET /logistics/hotels
// --------------------------------------------------

test("GET /logistics/hotels requires JWT", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/hotels?tripId=${tripId}`
  );

  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.message, "Authentication required");
});

test("GET /logistics/hotels requires trip ID", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/hotels`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.message, "Trip ID is required");
});

test("GET /logistics/hotels returns hotel reservations", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/hotels?tripId=${tripId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.reservations));

  assert.ok(
    data.reservations.some(
      reservation => reservation._id === hotelId
    )
  );
});


// --------------------------------------------------
// GET /logistics/rental_cars
// --------------------------------------------------

test("GET /logistics/rental_cars returns rental reservations", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/rental_cars?tripId=${tripId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.reservations));

  assert.ok(
    data.reservations.some(
      reservation => reservation._id === rentalId
    )
  );
});


// --------------------------------------------------
// GET /logistics/flights
// --------------------------------------------------

test("GET /logistics/flights returns flight reservations", async () => {
  const response = await fetch(
    `${BASE_URL}/logistics/flights?tripId=${tripId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(data.reservations));

  assert.ok(
    data.reservations.some(
      reservation => reservation._id === flightId
    )
  );
});


// --------------------------------------------------
// GET authorization - non-member
// --------------------------------------------------

test("GET /logistics/hotels rejects user who is not on trip", async () => {
  const otherUser = await User.create({
    username: `otheruser_${Date.now()}`,
    email: `other_${Date.now()}@example.com`,
    password: "password123",
    friends: []
  });

  const otherTrip = await Trip.create({
    name: `Other Test Trip ${Date.now()}`,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-10"),
    users: [otherUser._id],
    reservations: []
  });

  const response = await fetch(
    `${BASE_URL}/logistics/hotels?tripId=${otherTrip._id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  assert.equal(response.status, 403);
  assert.equal(
    data.message,
    "You are not a member of this trip"
  );

  await Trip.deleteOne({ _id: otherTrip._id });
  await User.deleteOne({ _id: otherUser._id });
});


// --------------------------------------------------
// CLEANUP
// --------------------------------------------------

test.after(async () => {
  if (tripId) {
    await Reservation.deleteMany({
      trip: tripId
    });

    await Trip.deleteOne({
      _id: tripId
    });
  }

  if (userId) {
    await User.deleteOne({
      _id: userId
    });
  }

  await mongoose.connection.close();
});