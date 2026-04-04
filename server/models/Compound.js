import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: ["facility", "office", "room", "service"],
    required: true,
  },

  description: String,

  directions: {
    type: String,
    required: true,
  },

  keywords: [
    {
      type: String,
      lowercase: true,
    },
  ],

  mapCoordinates: {
    x: Number,
    y: Number,
  },
});

const floorSchema = new mongoose.Schema({
  floorNumber: {
    type: Number,
    required: true,
  },

  /** Optional floor plan image URL (FR10). */
  floorMapUrl: String,

  locations: [locationSchema],
});

const buildingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  latitude: {
    type: Number,
    required: true,
  },

  longitude: {
    type: Number,
    required: true,
  },

  floors: [floorSchema],
});

const compoundSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    /** Branch admin who manages this compound (set by superadmin). */
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    buildings: [buildingSchema],
  },
  { timestamps: true }
);

compoundSchema.index({
  "buildings.floors.locations.name": "text",
  "buildings.floors.locations.keywords": "text",
});

export default mongoose.model("Compound", compoundSchema);