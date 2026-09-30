import "server-only";
import { Resend } from "resend";
import { env, integrations } from "@/lib/config/env";
import { childLogger } from "@/lib/logger";

const log = childLogger("email");

export type EmailMessage = { to: string; subject: string; html: string };

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>;
}

class ResendSender implements EmailSender {
  private client = new Resend(env().EMAIL_API_KEY);
  async send(msg: EmailMessage) {
    const { error } = await this.client.emails.send({ from: env().EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html });
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}

/** Used when EMAIL_API_KEY is unset: logs instead of sending (clearly marked). */
class LogOnlySender implements EmailSender {
  async send(msg: EmailMessage) {
    log.info({ to: msg.to, subject: msg.subject }, "EMAIL NOT SENT (EMAIL_API_KEY not configured)");
  }
}

let sender: EmailSender | undefined;
export function getEmailSender(): EmailSender {
  return (sender ??= integrations.email() ? new ResendSender() : new LogOnlySender());
}

/** Minimal branded email layout. */
export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><html><body style="margin:0;background:#FFF7F9;font-family:Helvetica,Arial,sans-serif;color:#2C2C2C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:26px;letter-spacing:4px;color:#5B0E2D">RIVYA</td></tr>
<tr><td style="padding-top:24px;font-family:Georgia,serif;font-size:22px;color:#5B0E2D">${esc(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${esc(cta.url)}" style="background:#5B0E2D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-size:14px">${esc(cta.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
