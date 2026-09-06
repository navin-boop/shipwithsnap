import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db, schema } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import { deliverWebhooks } from "@/lib/webhooks/outbound";

// Spec: design/Ledger.dc.html — payment_intent.*, charge.refunded, charge.dispute.created.
// Stripe signs the raw body; we verify, dedupe on the event id, then update our own records.

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new NextResponse("Billing is not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("stripe webhook signature check failed:", err instanceof Error ? err.message : err);
    return new NextResponse("Bad signature", { status: 400 });
  }

  // Idempotency: Stripe retries, and a replay must not double-apply.
  const seen = await db().insert(schema.inboundEvents).values({ id: event.id, provider: "stripe", type: event.type }).onConflictDoNothing().returning({ id: schema.inboundEvents.id });
  if (!seen.length) return NextResponse.json({ ok: true, duplicate: true });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        await db()
          .update(schema.charges)
          .set({ status: "captured", amountCapturedCents: pi.amount_received, updatedAt: new Date() })
          .where(eq(schema.charges.stripePaymentIntentId, pi.id));
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        await db().update(schema.charges).set({ status: "canceled", amountCapturedCents: 0, updatedAt: new Date() }).where(eq(schema.charges.stripePaymentIntentId, pi.id));
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const [charge] = await db()
          .update(schema.charges)
          .set({ status: "failed", failureCode: pi.last_payment_error?.decline_code ?? pi.last_payment_error?.code ?? null, failureMessage: pi.last_payment_error?.message ?? "The card was declined.", updatedAt: new Date() })
          .where(eq(schema.charges.stripePaymentIntentId, pi.id))
          .returning();
        if (charge) {
          // A failed adjustment blocks buying until it is settled; a failed label charge does not,
          // because nothing was bought.
          if (charge.kind === "adjustment") {
            await db().update(schema.accounts).set({ billingLockedReason: "unpaid_adjustment" }).where(eq(schema.accounts.id, charge.accountId));
          }
          await deliverWebhooks(charge.accountId, "payment.failed", { charge_id: charge.id, amount_cents: charge.amountAuthorizedCents, reason: charge.failureMessage });
        }
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object;
        const piId = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
        if (piId) {
          const charge = await db().query.charges.findFirst({ where: eq(schema.charges.stripePaymentIntentId, piId) });
          if (charge) {
            const refunded = ch.amount_refunded;
            await db()
              .update(schema.charges)
              .set({ amountRefundedCents: refunded, status: refunded >= charge.amountCapturedCents ? "refunded" : "partially_refunded", updatedAt: new Date() })
              .where(eq(schema.charges.id, charge.id));
          }
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object;
        const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
        if (piId) {
          const charge = await db().query.charges.findFirst({ where: eq(schema.charges.stripePaymentIntentId, piId) });
          if (charge) {
            // A dispute locks the account for new purchases until it is resolved.
            await db().update(schema.accounts).set({ billingLockedReason: "dispute" }).where(eq(schema.accounts.id, charge.accountId));
            console.error(`dispute opened on charge ${charge.id} for account ${charge.accountId}`);
          }
        }
        break;
      }
      case "payment_method.detached": {
        const pm = event.data.object;
        await db().delete(schema.paymentMethods).where(eq(schema.paymentMethods.stripePaymentMethodId, pm.id));
        break;
      }
      default:
        break; // recorded in inbound_events for audit
    }
  } catch (err) {
    console.error(`stripe webhook ${event.type} failed:`, err);
    return new NextResponse("Processing failed", { status: 500 }); // Stripe retries
  }

  await db().update(schema.inboundEvents).set({ processedAt: new Date() }).where(eq(schema.inboundEvents.id, event.id));
  return NextResponse.json({ ok: true });
}
