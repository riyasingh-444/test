"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { UPLOAD_LIMITS, type UploadFolder } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type UploadedImage = { url: string; publicId: string; width?: number; height?: number };

type Signature = { uploadUrl: string; apiKey: string; params: Record<string, string | number>; signature: string; maxBytes: number };

/** Upload one file straight to Cloudinary using a server-minted signature. */
export async function uploadToCloudinary(file: File, folder: UploadFolder): Promise<UploadedImage> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed: readonly string[] = folder === "verification" ? UPLOAD_LIMITS.documentFormats : UPLOAD_LIMITS.allowedFormats;
  if (!allowed.includes(ext)) throw new Error(`Unsupported file type. Use ${allowed.join(", ").toUpperCase()}.`);
  if (file.size > UPLOAD_LIMITS.maxBytes) throw new Error(`File is too large (max ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB).`);

  const { data: sig } = await api.post<Signature>("/uploads/sign", { folder });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("signature", sig.signature);
  for (const [k, v] of Object.entries(sig.params)) form.append(k, String(v));
  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  const json = (await res.json()) as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message: string } };
  if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? "Upload failed");
  return { url: json.secure_url, publicId: json.public_id!, width: json.width, height: json.height };
}

export function ImageUploader({
  folder,
  value,
  onChange,
  max = 6,
  className,
}: {
  folder: UploadFolder;
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  className?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = max - value.length;
    const list = Array.from(files).slice(0, room);
    setBusy(list.length);
    const uploaded: UploadedImage[] = [];
    for (const f of list) {
      try {
        uploaded.push(await uploadToCloudinary(f, folder));
      } catch (e) {
        setError(e instanceof ApiError || e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy((b) => b - 1);
      }
    }
    onChange([...value, ...uploaded]);
    if (input.current) input.current.value = "";
  };

  return (
    <div className={className}>
      <ul className="flex flex-wrap gap-3">
        {value.map((img) => (
          <li key={img.publicId} className="relative size-20 overflow-hidden rounded-xl bg-surface-sunken">
            <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v.publicId !== img.publicId))}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <li key={`busy-${i}`} className="grid size-20 place-items-center rounded-xl bg-surface-sunken">
            <Loader2 className="size-5 animate-spin text-primary" aria-label="Uploading" />
          </li>
        ))}
        {value.length + busy < max && (
          <li>
            <label
              htmlFor={id}
              className={cn(
                "grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-strong text-muted transition hover:border-primary hover:text-primary",
                "has-focus-visible:outline-2 has-focus-visible:outline-primary",
              )}
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              <span className="sr-only">Add images</span>
              <input
                ref={input}
                id={id}
                type="file"
                accept={folder === "verification" ? "image/*,application/pdf" : "image/*"}
                multiple
                className="sr-only"
                onChange={(e) => void onFiles(e.target.files)}
              />
            </label>
          </li>
        )}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
