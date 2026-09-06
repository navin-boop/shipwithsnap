/**
 * Transactional email behind one function. Resend when a key is set; otherwise the message is
 * logged so local development never sends anything.
 *
 * The key is read from RESEND_API_KEY or EMAIL_API_KEY — both names are in use, and a mismatch
 * between them silently turns every customer email into a console line, which is very hard to
 * notice from the outside.
 */
export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string | null };

export async function sendEmail(msg: Email): Promise<{ sent: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Ship with Snap <labels@shipwithsnap.com>";
  if (!key) {
    console.info(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, reply_to: msg.replyTo ?? undefined }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { id?: string };
  return { sent: true, id: data.id };
}

/** Sunny email shell — cream background, white card with an ink outline, coral button. */
export function emailShell(opts: { heading: string; eyebrow?: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; footer?: string; logoUrl?: string | null; logoAlt?: string }): string {
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<p style="margin:28px 0 0"><a href="${opts.ctaUrl}" style="display:inline-block;background:#ff5c39;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:16px 26px;border-radius:999px;border:2px solid #2b2320">${opts.ctaLabel}</a></p>`
    : "";
  const brand = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${opts.logoAlt ?? ""}" style="max-height:44px;max-width:220px;display:block">`
    : `<div style="font-weight:800;font-size:22px;color:#2b2320">${opts.logoAlt ?? "snap"}<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#ff5c39;margin-left:4px"></span></div>`;
  return `<!doctype html><html><body style="margin:0;background:#fff8ee;font-family:Nunito,Helvetica,Arial,sans-serif;color:#2b2320">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  ${brand}
  <div style="margin-top:24px;background:#fff;border:2px solid #2b2320;border-radius:22px;padding:28px 28px 32px">
    ${opts.eyebrow ? `<div style="font-size:13px;font-weight:800;color:#7a6f68">${opts.eyebrow}</div>` : ""}
    <h1 style="margin:8px 0 0;font-size:32px;line-height:1.05;font-weight:800;letter-spacing:-0.5px">${opts.heading}</h1>
    <div style="margin-top:18px;font-size:16px;line-height:1.55;font-weight:600;color:#5c524b">${opts.bodyHtml}</div>
    ${cta}
  </div>
  <div style="margin-top:20px;font-size:12px;font-weight:700;color:#7a6f68">${opts.footer ?? "Sent by Ship with Snap on behalf of the sender."}</div>
</div></body></html>`;
}
