"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import type { CustomerEmailPrefs } from "@/lib/db/schema";
import { WEBHOOK_EVENTS, sign, type WebhookEvent } from "@/lib/webhooks/outbound";
import { assertSafeWebhookTarget } from "@/lib/webhooks/ssrf";

export type Result<T = undefined> = ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T })) | { ok: false; error: string };

async function requireUser(roles: Array<"owner" | "shipper" | "viewer"> = ["owner"]) {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  if (!roles.includes(session.user.role as "owner")) throw new Error("Only an owner can change this");
  return session.user;
}

export async function updateStore(input: { name: string; replyTo: string }): Promise<Result> {
  const user = await requireUser();
  const p = z.object({ name: z.string().trim().min(1, "Store name is required.").max(80), replyTo: z.string().trim().email("Enter a valid email.").or(z.literal("")) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await db().update(schema.accounts).set({ name: p.data.name, replyTo: p.data.replyTo || null }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings", "layout");
  return { ok: true };
}

/** Accepts a data URL (PNG/JPEG/WebP, ≤ 300 KB) produced by the client-side resize, or null to remove. */
export async function updateLogo(dataUrl: string | null): Promise<Result> {
  const user = await requireUser();
  if (dataUrl === null) {
    await db().update(schema.accounts).set({ logoData: null, logoMime: null }).where(eq(schema.accounts.id, user.accountId));
  } else {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return { ok: false, error: "Use a PNG, JPEG or WebP image." };
    if (m[2].length > 400_000) return { ok: false, error: "That image is too large — try a smaller one." };
    await db().update(schema.accounts).set({ logoData: m[2], logoMime: m[1] }).where(eq(schema.accounts.id, user.accountId));
  }
  revalidatePath("/settings", "layout");
  return { ok: true };
}

export async function updatePrinting(input: { labelFormat: "pdf_4x6" | "pdf_letter" | "zpl"; afterBuy: "print" | "download" | "nothing"; packingSlip: boolean }): Promise<Result> {
  const user = await requireUser(["owner", "shipper"]);
  await db().update(schema.accounts).set({ labelFormat: input.labelFormat, afterBuy: input.afterBuy, packingSlip: input.packingSlip }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings/printing");
  return { ok: true };
}

export async function updateCustomerEmails(prefs: CustomerEmailPrefs): Promise<Result> {
  const user = await requireUser(["owner", "shipper"]);
  await db().update(schema.accounts).set({ customerEmails: prefs }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings/customer-emails");
  return { ok: true };
}

export async function setDefaultShipFrom(addressId: string): Promise<Result> {
  const user = await requireUser(["owner", "shipper"]);
  const a = await db().query.addresses.findFirst({ where: and(eq(schema.addresses.id, addressId), eq(schema.addresses.accountId, user.accountId), eq(schema.addresses.kind, "ship_from")) });
  if (!a) return { ok: false, error: "Address not found." };
  await db().update(schema.accounts).set({ defaultShipFromId: a.id }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath("/settings/ship-from");
  return { ok: true };
}

// Team
export async function inviteMember(input: { email: string; role: "owner" | "shipper" | "viewer" }): Promise<Result<{ link: string }>> {
  const user = await requireUser();
  const p = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email."), role: z.enum(["owner", "shipper", "viewer"]) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, p.data.email) });
  if (existing) return { ok: false, error: existing.accountId === user.accountId ? "They're already on the team." : "That email already has a Snap account." };
  const token = randomBytes(24).toString("hex");
  await db().insert(schema.invites).values({ accountId: user.accountId, email: p.data.email, role: p.data.role, token, invitedBy: user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) });
  revalidatePath("/settings/team");
  return { ok: true, data: { link: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${token}` } };
}

export async function revokeInvite(id: string): Promise<Result> {
  const user = await requireUser();
  await db().delete(schema.invites).where(and(eq(schema.invites.id, id), eq(schema.invites.accountId, user.accountId)));
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Result> {
  const user = await requireUser();
  if (userId === user.id) return { ok: false, error: "You can't remove yourself." };
  await db().delete(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.accountId, user.accountId), ne(schema.users.id, user.id)));
  revalidatePath("/settings/team");
  return { ok: true };
}

export async function changeRole(userId: string, role: "owner" | "shipper" | "viewer"): Promise<Result> {
  const user = await requireUser();
  if (userId === user.id) return { ok: false, error: "Ask another owner to change your role." };
  await db().update(schema.users).set({ role }).where(and(eq(schema.users.id, userId), eq(schema.users.accountId, user.accountId)));
  revalidatePath("/settings/team");
  return { ok: true };
}

// API keys & webhooks
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(input: { name: string; mode: "live" | "test" }): Promise<Result<{ key: string }>> {
  const user = await requireUser();
  const p = z.object({ name: z.string().trim().min(1, "Give the key a name.").max(60), mode: z.enum(["live", "test"]) }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const key = `sk_${p.data.mode}_${randomBytes(24).toString("base64url")}`;
  await db().insert(schema.apiKeys).values({ accountId: user.accountId, name: p.data.name, mode: p.data.mode, keyHash: hashApiKey(key), prefix: key.slice(0, 12) });
  revalidatePath("/settings/api");
  return { ok: true, data: { key } };
}

export async function revokeApiKey(id: string): Promise<Result> {
  const user = await requireUser();
  await db().update(schema.apiKeys).set({ revokedAt: new Date() }).where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.accountId, user.accountId)));
  revalidatePath("/settings/api");
  return { ok: true };
}

export async function addWebhookEndpoint(input: { url: string; events: string[] }): Promise<Result<{ secret: string }>> {
  const user = await requireUser();
  const p = z.object({ url: z.string().trim().url("Enter a full https:// URL."), events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Pick at least one event.") }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  // Refuse targets our server should never be made to reach (see webhooks/ssrf.ts).
  const target = await assertSafeWebhookTarget(p.data.url);
  if (!target.ok) return { ok: false, error: target.reason };
  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  await db().insert(schema.webhookEndpoints).values({ accountId: user.accountId, url: p.data.url, secret, events: p.data.events as WebhookEvent[] });
  revalidatePath("/settings/api");
  return { ok: true, data: { secret } };
}

export async function deleteWebhookEndpoint(id: string): Promise<Result> {
  const user = await requireUser();
  await db().delete(schema.webhookEndpoints).where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.accountId, user.accountId)));
  revalidatePath("/settings/api");
  return { ok: true };
}

/** Sends a signed ping so the customer can confirm their receiver. */
export async function testWebhookEndpoint(id: string): Promise<Result<{ status: number }>> {
  const user = await requireUser();
  const e = await db().query.webhookEndpoints.findFirst({ where: and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.accountId, user.accountId)) });
  if (!e) return { ok: false, error: "Endpoint not found." };
  const body = JSON.stringify({ id: "evt_test", type: "ping", created_at: new Date().toISOString(), data: {} });
  try {
    const res = await fetch(e.url, { method: "POST", headers: { "content-type": "application/json", "x-snap-signature": `sha256=${sign(e.secret, body)}`, "x-snap-event": "ping" }, body, signal: AbortSignal.timeout(8000) });
    return { ok: true, data: { status: res.status } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed." };
  }
}
