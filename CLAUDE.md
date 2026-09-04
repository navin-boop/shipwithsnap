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

## Design tokens (from `design/Components.dc.html`)

Direction: bold editorial. Paper & ink, square corners, 2px rules, one electric accent.

| Token | Value | Use |
|---|---|---|
| paper | `#f2efe6` | page background |
| surface | `#ffffff` | cards, print preview |
| ink | `#111111` | text, rules, selected states, dark panels |
| ink-2 | `#3d3b36` | body text on paper |
| muted | `#6b6860` | labels, hints, secondary text |
| muted-on-ink | `#b9b5aa` | secondary text on ink panels |
| hairline | `#c9c4b6` | list row dividers, empty states |
| electric | `#2d5bff` | primary action, links on hover, "in transit", live/focused |
| lime | `#c8ff3d` | **only on ink**, only for the price you pay / success |
| danger | `#b3261e` | exceptions, errors, destructive |

- **Type**: `Syne` 800 for display (96 / 72 / 56 / 44 / 40 / 36 / 28 / 22 / 16, line-height 0.9–0.95, letter-spacing −2%); `Archivo` 400/500/600 for body (20 / 16 / 15 / 14 / 13 / 12, line-height 1.45–1.55). Labels: Archivo 600, 11px, uppercase, letter-spacing 1.2px, muted. Google Fonts, with `"Arial Black"` / `"Helvetica Neue"` fallbacks.
- **Radius**: 0 everywhere (4px only on chart bar tops). **Shadows**: none — depth comes from ink panels.
- **Rules**: section 2px ink; data rows 1px ink; list rows 1px hairline.
- **Buttons**: 40 / 48 / 56px tall, square, uppercase 600, letter-spacing 1px. Primary = electric bg, white text. Secondary = ink bg. Outline = 1.5px ink border. On ink panels: lime bg for the primary action.
- **Inputs**: underline only (2px ink), 44–48px tall, 15–16px Archivo 500; focused = electric underline; error = danger underline + 12px message.
- **Chips / toggles**: 36–44px, 1.5px ink border, uppercase 11px; selected = ink bg. Switch 52×28 (lime knob when on).
- **Rate row**: unselected = 15–16px name, 20–22px Syne price, retail struck through in muted; selected = inverted to ink, name 22px, price 36px in lime.
- **Icons**: inline SVG, 2px stroke, 14–18px, `currentColor`. No emoji anywhere.
- **Gutters**: 40px in the app, 64px on marketing pages. Nav: 56px header, 2px ink rule, 12px uppercase items, active item underlined 2px.
- Hit targets ≥ 44px on mobile.

## Stack — deployed on Vercel

Vercel has no long-running processes, so "workers" and "queue" from `Architecture.dc.html` map to serverless equivalents:

| Design says | On Vercel |
|---|---|
| Next.js app + API | Next.js App Router, route handlers under `src/app/api` |
| Postgres | **Neon** (Vercel Postgres integration) via **Drizzle**; pooled URL in the app, unpooled for migrations |
| Redis (rate cache, address cache, rate limits, idempotency) | **Upstash Redis** (REST) |
| Job queue + workers, cron | **Inngest** — functions in `src/inngest/`, served at `/api/inngest`; retries, fan-out and cron (tracking poll, reconcile, adjustments) live there |
| Object store (label PDF/ZPL) | **Vercel Blob**, private access, served through our signed route |
| Webhook receiver | Route handlers: `/api/webhooks/easypost`, `/api/webhooks/stripe`, `/api/webhooks/shopify` — verify signature, insert `inbound_events`, send an Inngest event, return 200 |
| Email | Transactional provider `[TBD]` behind `src/lib/email.ts` |

Payments: `stripe` SDK + Stripe Elements. Shipping: `@easypost/api`. Auth: Auth.js (email + Google).

Layout (single Next.js app, packages as folders — split into a monorepo only if it hurts):

```
src/app/            routes: (marketing) landing, (auth), (app) ship/shipments/batch/reports/billing/settings, t/[token] tracking
src/components/     design-system primitives from Components.dc.html
src/lib/shipping/   ShippingProvider interface + EasyPostProvider (CarrierAdapter.dc.html)
src/lib/billing/    Stripe customer / card / charge / refund logic (Ledger.dc.html)
src/lib/db/         Drizzle schema + migrations (DataModel.dc.html)
src/inngest/        jobs: buy-batch, tracking-ingest, tracking-poll, store-sync, email, reconcile
design/             the artboards (do not edit by hand; ask Claude to update the canvas)
```

Environment variables are listed in `.env.example`; local dev uses `.env.local`.

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
