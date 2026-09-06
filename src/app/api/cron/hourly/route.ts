import { lt, and, eq, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { claimErrorMessage, refreshClaimFor } from "@/lib/claims/service";
import { manifestErrorMessage, refreshManifestFor } from "@/lib/manifests/service";
import { pollStaleTrackers } from "@/lib/tracking/service";
import { retryPendingWebhooks } from "@/lib/webhooks/outbound";

export const maxDuration = 60;

/**
 * Scheduled by vercel.json (daily on the Hobby plan — Vercel rejects deployments with more
 * frequent schedules there; raise it to hourly on Pro). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Polls quiet trackers, refreshes pending manifests and open claims, retries webhook deliveries,
 * and sweeps abandoned draft shipments.
 */
export async function GET(req: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET`. Without the secret set there is nothing to
  // check, so this route would be open to anyone — refuse in production rather than run unguarded.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      console.error("CRON_SECRET is not set — refusing to run the cron job unauthenticated. Add it in the Vercel project settings.");
      return new NextResponse("CRON_SECRET is not configured", { status: 503 });
    }
  } else if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tracking = await pollStaleTrackers();
  const webhooks = await retryPendingWebhooks();

  // Scan forms are built asynchronously at the carrier; finish the ones still in flight.
  const pendingManifests = await db().query.scanForms.findMany({ where: eq(schema.scanForms.status, "creating"), limit: 25 });
  let manifests = 0;
  for (const m of pendingManifests) {
    try {
      await refreshManifestFor(m.accountId, m.id);
      manifests++;
    } catch (err) {
      console.error(`manifest refresh failed for ${m.id}:`, manifestErrorMessage(err));
    }
  }

  // Claims move slowly; a daily poll keeps their status honest even if a webhook is missed.
  const openClaims = await db().query.claims.findMany({ where: inArray(schema.claims.status, ["submitted", "in_review", "pending", "under_review"]), limit: 50 });
  let claims = 0;
  for (const c of openClaims) {
    try {
      await refreshClaimFor(c.accountId, c.id);
      claims++;
    } catch (err) {
      console.error(`claim refresh failed for ${c.id}:`, claimErrorMessage(err));
    }
  }

  // A pickup window that has passed is done with, whatever the carrier says.
  const stalePickups = await db()
    .update(schema.pickups)
    .set({ status: "canceled" })
    .where(and(eq(schema.pickups.status, "quoted"), lt(schema.pickups.maxDatetime, new Date())))
    .returning({ id: schema.pickups.id });

  const staleDrafts = await db()
    .delete(schema.shipments)
    .where(and(eq(schema.shipments.status, "draft"), lt(schema.shipments.createdAt, new Date(Date.now() - 24 * 3600 * 1000)), or(isNull(schema.shipments.groupId), isNull(schema.shipments.providerOrderId))))
    .returning({ id: schema.shipments.id });

  return NextResponse.json({ ok: true, tracking, webhooksRetried: webhooks, manifestsRefreshed: manifests, claimsRefreshed: claims, pickupsExpired: stalePickups.length, draftsDeleted: staleDrafts.length });
}
