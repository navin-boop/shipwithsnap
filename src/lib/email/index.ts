/**
 * Transactional email: one send function, and every template behind it.
 *
 * Resend when a key is set; otherwise the message is logged so local development never sends
 * anything. The key is read from RESEND_API_KEY or EMAIL_API_KEY — both names are in use, and a
 * mismatch between them silently turns every customer email into a console line, which is very
 * hard to notice from the outside.
 */
export * from "./layout";
export * from "./templates";

import type { RenderedEmail } from "./templates";

export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string | null };

/**
 * Subjects are a mail header, not HTML: markup in one is inert, but a newline is not. Store names
 * and recipient names reach subjects from outside, so fold all whitespace before sending.
 */
export function safeSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 200);
}

export async function sendEmail(msg: Email): Promise<{ sent: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ship with Snap <labels@shipwithsnap.com>";
  const subject = safeSubject(msg.subject);
  if (!key) {
    console.info(`[email:dev] to=${msg.to} subject="${subject}"\n${msg.text}`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject, html: msg.html, text: msg.text, reply_to: msg.replyTo ?? undefined }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id?: string };
  return { sent: true, id: data.id };
}

/**
 * Send a rendered template. Transactional mail must never take a request down with it — a Resend
 * outage should not fail a label purchase that already succeeded — so failures are logged, not
 * thrown. Callers that genuinely need to know use sendEmail directly.
 */
export async function deliver(to: string, email: RenderedEmail, opts?: { replyTo?: string | null }): Promise<{ sent: boolean; id?: string }> {
  try {
    return await sendEmail({ to, subject: email.subject, html: email.html, text: email.text, replyTo: opts?.replyTo ?? null });
  } catch (err) {
    console.error(`email "${email.subject}" to ${to} failed:`, err);
    return { sent: false };
  }
}
