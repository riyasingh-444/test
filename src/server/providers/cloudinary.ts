import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env, integrations } from "@/lib/config/env";
import { UPLOAD_LIMITS, type UploadFolder } from "@/lib/constants";
import { errors } from "@/server/http/errors";

/**
 * Cloudinary storage. Browsers upload directly to Cloudinary with a short-lived
 * signature minted here (our servers never proxy file bytes), constrained to a
 * per-user folder and an allow-list of formats. Verification documents use the
 * `authenticated` delivery type so they are never publicly reachable.
 */
function configured() {
  if (!integrations.cloudinary()) {
    throw errors.notConfigured("Image uploads", ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
  }
  const e = env();
  cloudinary.config({ cloud_name: e.CLOUDINARY_CLOUD_NAME, api_key: e.CLOUDINARY_API_KEY, api_secret: e.CLOUDINARY_API_SECRET, secure: true });
  return e;
}

export function folderPath(folder: UploadFolder, userId: string) {
  return `rivya/${folder}/${userId}`;
}

export function signUpload(folder: UploadFolder, userId: string) {
  const e = configured();
  const timestamp = Math.round(Date.now() / 1000);
  const isDoc = folder === "verification";
  const params: Record<string, string | number> = {
    timestamp,
    folder: folderPath(folder, userId),
    allowed_formats: (isDoc ? UPLOAD_LIMITS.documentFormats : UPLOAD_LIMITS.allowedFormats).join(","),
    ...(isDoc ? { type: "authenticated" } : {}),
  };
  const signature = cloudinary.utils.api_sign_request(params, e.CLOUDINARY_API_SECRET!);
  return {
    cloudName: e.CLOUDINARY_CLOUD_NAME!,
    apiKey: e.CLOUDINARY_API_KEY!,
    uploadUrl: `https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/${isDoc ? "auto" : "image"}/upload`,
    params,
    signature,
    maxBytes: UPLOAD_LIMITS.maxBytes,
  };
}

/** True if `url` is an asset in our Cloudinary account under the user's folder. */
export function isOwnedAssetUrl(url: string, folder: UploadFolder, userId: string) {
  if (!integrations.cloudinary()) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      u.pathname.startsWith(`/${env().CLOUDINARY_CLOUD_NAME}/image/upload/`) &&
      u.pathname.includes(`/${folderPath(folder, userId)}/`)
    );
  } catch {
    return false;
  }
}

/** Signed, expiring URL for private documents (admin verification review). */
export function privateDocumentUrl(publicId: string, format?: string) {
  configured();
  return cloudinary.utils.private_download_url(publicId, format ?? "jpg", { type: "authenticated", expires_at: Math.round(Date.now() / 1000) + 600 });
}

export async function deleteAsset(publicId: string) {
  configured();
  await cloudinary.uploader.destroy(publicId);
}
