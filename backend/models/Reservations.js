const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["flights", "accomodations", "rentals"],
            unique: false,

        },
        name: {
            type: String,
            required: true,
            unique: false,
        },

        startTime: {
            type: Date,
            required: [true, "Start date is required"]
        },
        endTime: {
            type: Date,
            required: [true, "End date is required"]
        },
        confrimationNumber: {
            type: String,
            required: false,
            unique: false,
        },
        cost:
        {
            type: Double,
            required: false,
            unique: false
        },
        notes: {
            type: String,
            required: false,
            unique: false
        },
        flights: {
            airline: {
                type: String,
                required: true,
                unique: false
            },
            flightNum: {
                type: String,
                required: true,
                unique: false
            },
            departAirport: {
                type: String,
                required: true,
                unique: false
            },
            arriveAirport: {
                type: String,
                required: true,
                unique: false
            }
        },
        accommodations: {
            address: {
                type: String,
                required: true,
                unique: false
            }
        },
        rentals: {
            company: {
                type: String,
                required: true,
                unique: false
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Reservation", reservationSchema);