const mongoose = require("mongoose");

const tripInvitationSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      required: true
    }
  },
  { timestamps: true }
);

tripInvitationSchema.index(
  { trip: 1, recipient: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);
tripInvitationSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model("TripInvitation", tripInvitationSchema);
