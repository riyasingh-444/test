import { z } from "zod";
import { UPLOAD_FOLDERS } from "@/lib/constants";
import { api } from "@/server/http/handler";
import { errors } from "@/server/http/errors";
import { signUpload } from "@/server/providers/cloudinary";

const body = z.object({ folder: z.enum(UPLOAD_FOLDERS) });

/** Folders partners-only may write to. */
const PARTNER_FOLDERS = new Set(["portfolio", "salons", "covers", "verification"]);

export const POST = api({ auth: "required", body, rateLimit: "write" }, async ({ body, user }) => {
  if (PARTNER_FOLDERS.has(body.folder) && !["ARTIST", "SALON", "ADMIN"].includes(user.role)) throw errors.forbidden();
  return signUpload(body.folder, user.id);
});
