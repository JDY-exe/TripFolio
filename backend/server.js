const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const tripRoutes = require("./routes/tripRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const eventRoutes = require("./routes/eventRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const publicItineraryRoutes = require("./routes/publicItineraryRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.use(express.json());


// Database
connectDB();

// Routes
app.use("/trip", tripRoutes);
app.use("/users", userRoutes);
app.use("/logistics", reservationRoutes);
app.use("/itinerary", itineraryRoutes);
app.use("/api/itineraries", publicItineraryRoutes);
app.use("/event", eventRoutes);
app.use("/destination", destinationRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});