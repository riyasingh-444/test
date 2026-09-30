import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./define";
import { imageSchema } from "./shared";

/**
 * Categories are data, not code: new services are added by inserting documents.
 * `group` powers the high-level homepage tiles (Bridal, Makeup, Hair…).
 */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 400 },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    image: imageSchema,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.index({ isActive: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };
export const Category = defineModel("Category", categorySchema, "categories");
