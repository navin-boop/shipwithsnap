/**
 * Transactional email behind one function. Resend when RESEND_API_KEY is set; otherwise the
 * message is logged so local development never sends anything.
 */
export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string | null };

export async function sendEmail(msg: Email): Promise<{ sent: boolean; id?: string }> {
  const key = process.env.RESEND_API_KEY;
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

/** Minimal ink-and-paper email shell that matches the brand without images. */
export function emailShell(opts: { heading: string; eyebrow?: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; footer?: string }): string {
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<p style="margin:28px 0 0"><a href="${opts.ctaUrl}" style="display:inline-block;background:#2d5bff;color:#fff;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:16px 26px">${opts.ctaLabel}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f2efe6;font-family:Archivo,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="font-weight:800;font-size:20px;letter-spacing:-0.5px;text-transform:uppercase">Snap<span style="color:#2d5bff">.</span></div>
  ${opts.eyebrow ? `<div style="margin-top:32px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#6b6860">${opts.eyebrow}</div>` : ""}
  <h1 style="margin:8px 0 0;font-size:34px;line-height:1;font-weight:800;letter-spacing:-0.5px">${opts.heading}</h1>
  <div style="margin-top:20px;font-size:15px;line-height:1.55;color:#3d3b36">${opts.bodyHtml}</div>
  ${cta}
  <div style="margin-top:40px;padding-top:16px;border-top:2px solid #111;font-size:12px;color:#6b6860">${opts.footer ?? "Sent by Ship with Snap on behalf of the sender."}</div>
</div></body></html>`;
}
