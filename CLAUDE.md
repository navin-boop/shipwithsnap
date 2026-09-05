# Ship with Snap

A Pirate Ship-style shipping platform for small sellers: compare USPS/UPS rates, buy labels, batch-ship store orders, track, and pay as you go. No monthly fee — the customer pays postage only.

- Shipping provider: **EasyPost** (rates, labels, refunds, trackers + webhooks, address verification). Nothing outside `packages/shipping` may import the EasyPost SDK.
- Payments: **Stripe**, pay-as-you-go on a saved card. Every purchase is a manual-capture PaymentIntent: authorize → buy at EasyPost → record label → capture. One charge per batch. Refunds go back to the card once EasyPost reports `refunded`.
- No wallet, no prepaid balance, no plans.

## Design is the source of truth: `design/`

Every screen and every backend flow has an artboard in `design/`. They are plain HTML with inline styles (plus a small `<script>` for the clickable ones). **Before building or changing a screen or service, `Read` its artboard and match it exactly.** Copy exact px values, colors and copy from the file; never round to a 4/8px grid or swap in framework defaults. `design/canvas.json` is the index (titles, pages).

### Product screens

| Artboard | Screen | Notes |
|---|---|---|
| `Main.dc.html` | **Ship** — address → package → rates → buy → label ready | Core screen. The `<script>` shows what recalculates (package type, weight, extras) and how the selected rate row is styled. |
| `Landing.dc.html` | Marketing landing page | Copy is final except bracketed `[placeholders]`. |
| `Auth.dc.html` | Sign up / Log in | Email + Google. Card is added at first purchase, not sign-up. |
| `Shipments.dc.html` | Shipments list | Status filters, reprint / void / email tracking. |
| `Batch.dc.html` | Batch from store orders | Cheapest rate pre-picked per row, one charge per batch. |
| `Wallet.dc.html` | **Billing** (file name is historical) | Saved cards, charges + refunds list, receipts. |
| `Reports.dc.html` | Reports | Stat tiles + single-hue bar chart + by-service table. |
| `Settings.dc.html` | Settings | Printing, ship-from, stores, team, customer emails, API & webhooks. |
| `AddressBook.dc.html` | Address book | |
| `Tracking.dc.html` | Public customer tracking page | Store-branded, no login. |
| `MobileShip.dc.html` | Ship flow at phone width (390px) | Same logic as Main, stepped. |
| `Components.dc.html` | **Design system sheet** — read this first | Tokens, type, buttons, inputs, chips, the rate row. |

### System design

| Artboard | Sheet |
|---|---|
| `Architecture.dc.html` | Modular monolith + workers; edge, core services, data, externals |
| `DataModel.dc.html` | Postgres tables, keys, invariants, hot indexes |
| `API.dc.html` | REST surface, buy-label example, error codes, outbound webhooks |
| `BuyLabelFlow.dc.html` | The buy transaction step by step, with every failure branch |
| `TrackingFlow.dc.html` | EasyPost tracker ingest pipeline and the shipment state machine |
| `Ledger.dc.html` | **Billing & payments** on Stripe (file name is historical) |
| `CarrierAdapter.dc.html` | **EasyPost integration** and the `ShippingProvider` seam (file name is historical) |

`SystemMap.dc.html` and `DirectionA/B/C.dc.html` are archived early sketches — ignore them.

## Design tokens — "Sunny" (chosen by the team, Sept 2026; artboards `design/SunnyShip.dc.html`, `design/SunnyLanding.dc.html`)

Direction: warm and playful. Cream page, white cards with a 2px ink outline and an offset hard shadow, pills, sticker badges. The v1 "bold editorial" screens on the canvas are superseded; token *names* in the code were kept from v1 (`paper`, `ink`, `electric`, `lime`…) and remapped, so `electric` is now coral and `lime` is yellow.

| Token (CSS) | Value | Use |
|---|---|---|
| paper | `#fff8ee` | page background (cream) |
| surface | `#ffffff` | cards |
| ink | `#2b2320` | text, outlines, dark panels |
| ink-2 | `#5c524b` | body text |
| muted | `#7a6f68` | labels, hints |
| muted-on-ink | `#d9cfc4` | secondary text on ink |
| hairline / line | `#e9dfd4` | quiet card borders, dividers |
| coral (= electric) | `#ff5c39` | primary action, links, "Cheapest!" sticker |
| teal | `#0fa3a3` | verified, selected chips, success, "Fastest" sticker |
| yellow (= lime) | `#ffd23f` | the selected rate card, price highlights, active nav text on ink |
| danger | `#d93a2b` | errors, exceptions |

- **Type**: `Sora` 800 for display (76 / 56 / 44 / 40 / 24 / 22, line-height 1, letter-spacing −2%) — headlines, prices, buttons; `Nunito` 600/700/800 for body (20 / 18 / 16 / 15 / 14 / 13). Labels: Nunito 800, 13px, muted, sentence case (no uppercase). Google Fonts via `next/font`.
- **Radius**: pills for buttons/chips/nav (999), 14px fields, 18px quiet cards, 22px cards. **Shadow**: `6px 6px 0 ink` on cards, `5px 5px 0` on primary buttons; nothing soft.
- **Cards** (`card` utility): white, 2px ink outline, 22px radius, offset shadow. `card-quiet`: 2px hairline outline, 18px radius, no shadow.
- **Buttons**: 40 / 48 / 58px pills, Sora 800. Primary = coral bg, white text, ink outline, offset shadow. Secondary = ink bg, yellow text. Outline = white, ink outline. On ink panels = yellow.
- **Inputs**: 50px, 2px ink outline, 14px radius, 16px Nunito 700; focused = coral outline + `coral-soft` fill; error = danger outline + 13px message.
- **Chips**: 38–44px pills, 2px ink outline; selected = teal fill, white text. Switch 54×30 (teal when on). Checkbox 22px rounded, teal when checked.
- **Rate card**: white card with hairline outline; selected = yellow card, ink outline, offset shadow, price 40px Sora, "You save $x" in teal; "Cheapest!" (coral) / "Fastest!" (teal) rotated sticker badges. Carrier mark = `CarrierLogo` (official SVG from `public/carriers/` when present, text badge otherwise).
- **Nav**: 72px, pill items, active = ink pill with yellow text. Wordmark: "snap" + coral dot.
- **Icons**: inline SVG, 2.4–2.8px stroke, 14–18px, `currentColor`. Hit targets ≥ 44px on mobile.

## Stack — deployed on Vercel

Vercel has no long-running processes, so "workers" and "queue" from `Architecture.dc.html` map to serverless equivalents:

| Design says | On Vercel |
|---|---|
| Next.js app + API | Next.js App Router, route handlers under `src/app/api` |
| Postgres | **Neon** (Vercel Postgres integration) via **Drizzle**; pooled URL in the app, unpooled for migrations |
| Job queue + workers, cron | **Vercel Cron** → `/api/cron/hourly` (`vercel.json`): polls quiet EasyPost trackers, retries outbound webhook deliveries, sweeps stale draft shipments. Batch buys run in-request with bounded concurrency. (Inngest can replace this later if jobs outgrow request limits.) |
| Object store (label PDF/ZPL) | Not yet — labels are streamed from the provider URL through `/api/labels/[id]/file` (session) and `/api/v1/labels/[id]/file` (API key). Move to Vercel Blob when we want our own copies. |
| Webhook receiver | `/api/webhooks/easypost` — verifies HMAC, dedupes on `inbound_events(id)`, feeds `ingestTrackingEvents` (state machine + notifications). Stripe arrives with phase 4. |
| Email | `src/lib/email.ts` — Resend when `RESEND_API_KEY` is set, console log otherwise |

Payments: `stripe` SDK + Stripe Elements (phase 4). Shipping: `@easypost/api` behind `src/lib/shipping` (fake provider when no key; live key refused for buys outside Vercel Production). Auth: Auth.js v5 (email + Google), JWT sessions.

Layout (single Next.js app):

```
src/app/(marketing)  landing, /rates calculator, /docs
src/app/(auth)       /signup, /login; /invite/[token] accepts team invites
src/app/(app)        ship, shipments, batch, reports, billing (placeholder), settings/*, addresses
src/app/t/[token]    public customer tracking page
src/app/api          labels file, exports, batch template + merged PDF, cron, webhooks/easypost, v1/* public API
src/components/      ui primitives (Components.dc.html), AppNav, feature components
src/lib/shipping/    ShippingProvider seam: provider.ts, easypost.ts, fake.ts (CarrierAdapter.dc.html)
src/lib/ship/        address parsing, quoteShipment / buyLabel (BuyLabelFlow.dc.html), server actions
src/lib/tracking/    ingest + state machine + customer emails (TrackingFlow.dc.html)
src/lib/batch/       CSV → orders, rate-all, buy-all
src/lib/webhooks/    outbound deliveries with HMAC + retries
src/lib/settings/    account, printing, team, API keys, webhook endpoints
src/lib/api/         API-key auth + problem+json helpers for /api/v1
src/lib/db/          Drizzle schema + drizzle/ migrations (DataModel.dc.html) — `npm run db:generate` then `db:migrate`
design/              the artboards (do not edit by hand; ask Claude to update the canvas)
```

Environment variables are listed in `.env.example`; local dev uses `.env.local`.

## Status (Sept 2026)

Built and verified against EasyPost test mode: design system, auth, Ship flow, shipments (void/reprint/email tracking/CSV export), tracking (webhook + poll + public page + emails), batch (CSV import, rate-all, buy-all, merged PDF), reports, settings (store, printing, ship-from, team invites, customer emails, API keys + webhooks), public API v1, landing page + public rate calculator. **Not built:** Stripe billing (phase 4 — `/billing` is a placeholder and labels are bought without a charge), Shopify/Etsy connectors (need partner-app credentials), our own label file storage.

## Build order

1. Tokens + components from `Components.dc.html` (verify against the sheet in the browser).
2. Auth (email + Google), accounts, roles.
3. Ship flow (`Main.dc.html`) against EasyPost **test** keys: address verify → rates → buy → label file.
4. Billing (`Ledger.dc.html`, `Wallet.dc.html`) in Stripe **test** mode: save card, authorize/capture, refunds.
5. Shipments + tracking: EasyPost webhooks, state machine, customer tracking page, emails.
6. Batch + store import (Shopify first), one charge per batch, merged PDF.
7. Reports, settings, address book, API keys + outbound webhooks.

## Rules of engagement

- Write the failure branches from `BuyLabelFlow.dc.html` as tests before the happy path (EasyPost timeout → check for `postage_label`; DB failure → refund orphan + cancel PaymentIntent; capture failure → retry worker).
- Money is integer cents everywhere. Every table carries `account_id`.
- Every POST accepts an `Idempotency-Key`; Stripe and EasyPost calls reuse our ids as idempotency keys / `reference`.
- Sample data in the artboards (names, rates, totals) is illustrative; bracketed `[placeholders]` are facts nobody has confirmed yet — ask, don't invent.
- Never expose EasyPost label URLs to customers; store label files in our bucket and serve signed URLs.
