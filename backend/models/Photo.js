const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
    {
        photoString: {
            type: String,
            required: true,
            unique: false
        },

        linkEvent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'event',
            required: false,
            unique: false
        },

        metadata: {
            location: {
                latitude: {
                    type: Number,
                    default: null,
                    min: -90,
                    max: 90
                },
                longitude: {
                    type: Number,
                    default: null,
                    min: -180,
                    max: 180
                },
                altitude: {
                    type: Number,
                    default: null
                },
                locationName: {
                    type: String,
                    default: null
                }
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

module.exports = mongoose.model("Photo", photoSchema);