import mongoose, { type Model, type Schema } from "mongoose";

/** Register a model once — safe across Next.js hot reloads. */
export function defineModel<TSchema extends Schema>(name: string, schema: TSchema, collection?: string) {
  type Doc = mongoose.InferSchemaType<TSchema>;
  return (mongoose.models[name] as Model<Doc> | undefined) ?? mongoose.model<Doc>(name, schema, collection);
}
