import { Schema } from "mongoose";

/** GeoJSON Point — coordinates are [longitude, latitude]. */
export const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 2 && v[0]! >= -180 && v[0]! <= 180 && v[1]! >= -90 && v[1]! <= 90,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

/** A location as shown to users plus its geo point. */
export const placeSchema = new Schema(
  {
    city: { type: String, required: true, trim: true, index: true },
    area: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    pincode: { type: String, trim: true },
    point: { type: pointSchema, required: true },
  },
  { _id: false },
);

/** Cloudinary-backed image reference. Never store binary data in MongoDB. */
export const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    width: Number,
    height: Number,
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

export const socialLinksSchema = new Schema(
  {
    instagram: String,
    youtube: String,
    facebook: String,
    website: String,
  },
  { _id: false },
);

/** Weekly opening/working hours. `day` 0 = Sunday. Times are "HH:mm" in the provider's timezone. */
export const weeklyHoursSchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    isOpen: { type: Boolean, default: true },
    open: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "10:00" },
    close: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "19:00" },
  },
  { _id: false },
);

/** Demo marker so seed data is always distinguishable from real records. */
export const demoField = { isDemo: { type: Boolean, default: false, index: true } } as const;
