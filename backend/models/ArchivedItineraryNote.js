const mongoose = require("mongoose");

const archivedItineraryNoteSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Itinerary",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

archivedItineraryNoteSchema.index(
  { itineraryId: 1, authorId: 1 },
  { unique: true },
);

archivedItineraryNoteSchema.plugin(require('../utils/recordVersion'));
module.exports = mongoose.model(
  "ArchivedItineraryNote",
  archivedItineraryNoteSchema,
);
