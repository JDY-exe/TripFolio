const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["flights", "accommodations", "rentals"],
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
        confirmationNumber: {
            type: String,
            required: false,
            unique: false,
        },
        cost:
        {
            type: Number,
            required: false,
            unique: false
        },
        notes: {
            type: String,
            required: false,
            unique: false
        },
        flights: {
            flightNum: {
                type: String,
                required: function () { return this.type === "flights"; },
                unique: false
            },
            departAirport: {
                type: String,
                required: function () { return this.type === "flights"; },
                unique: false
            },
            arriveAirport: {
                type: String,
                required: function () { return this.type === "flights"; },
                unique: false
            }
        },
        accommodations: {
            address: {
                type: String,
                required: function () { return this.type === "accommodations"; },
                unique: false
            }
        },
        rentals: {
            company: {
                type: String,
                required: function () { return this.type === "rentals"; },
                unique: false
            }
        },
        trip:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "trip"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Reservation", reservationSchema);
