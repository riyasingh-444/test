import "server-only";
import { childLogger } from "@/lib/logger";

/**
 * SMS delivery abstraction for phone OTP. Plug in MSG91 / Twilio / Firebase by implementing
 * `OtpSender` and registering it in `getOtpSender`. Until then, development logs the code
 * and production refuses to send (phone login is hidden in the UI).
 */
export interface OtpSender {
  readonly name: string;
  send(phone: string, code: string): Promise<void>;
}

class DevConsoleSender implements OtpSender {
  readonly name = "dev-console";
  private log = childLogger("otp");
  async send(phone: string, code: string) {
    this.log.info({ phone }, `DEV OTP for ${phone}: ${code}`);
  }
}

export function getOtpSender(): OtpSender | null {
  if (process.env.NODE_ENV !== "production") return new DevConsoleSender();
  return null; // No SMS provider configured yet.
}

export function generateOtpCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0]! % 1_000_000).padStart(6, "0");
}
