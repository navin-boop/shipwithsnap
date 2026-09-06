import type { ClaimView } from "@/lib/claims/service";
import type { ManifestView } from "@/lib/manifests/service";
import type { PickupView } from "@/lib/pickups/service";
import type { TrackerView } from "@/lib/trackers/service";

// snake_case wire shapes for /api/v1 (design/API.dc.html).

export function trackerJson(t: TrackerView) {
  return {
    id: t.id, tracking_number: t.trackingNumber, carrier: t.carrier, status: t.status, status_detail: t.statusDetail,
    est_delivery_date: t.estDeliveryDate, signed_by: t.signedBy, nickname: t.nickname, last_tracked_at: t.lastTrackedAt, created_at: t.createdAt,
    events: t.events.map((e) => ({ status: e.status, status_detail: e.statusDetail, description: e.description, city: e.city, state: e.state, occurred_at: e.occurredAt })),
  };
}

export function pickupJson(p: PickupView) {
  return {
    id: p.id, status: p.status, carrier: p.carrier, service: p.serviceCode, price_cents: p.priceCents, confirmation: p.confirmation,
    min_datetime: p.minDatetime, max_datetime: p.maxDatetime, instructions: p.instructions, address: p.address, tracking_number: p.labelTracking,
    rates: p.rates.map((r) => ({ carrier: r.carrier, service: r.serviceCode, price_cents: r.priceCents })), messages: p.messages, created_at: p.createdAt,
  };
}

export function manifestJson(m: ManifestView, base: string) {
  return { id: m.id, carrier: m.carrier, status: m.status, label_count: m.labelCount, form_url: m.formUrl ? `${base}${m.formUrl}` : null, message: m.message, created_at: m.createdAt };
}

export function claimJson(c: ClaimView) {
  return {
    id: c.id, label_id: c.labelId, tracking_number: c.trackingNumber, type: c.type, status: c.status, status_detail: c.statusDetail,
    requested_cents: c.requestedCents, approved_cents: c.approvedCents, description: c.description, contact_email: c.contactEmail,
    history: c.history.map((h) => ({ status: h.status, status_detail: h.statusDetail ?? null, at: h.at })), created_at: c.createdAt,
  };
}
