# Ship with Snap

Cheapest USPS & UPS rates for small sellers. No monthly fee — pay postage only.
EasyPost for shipping, Stripe pay-as-you-go for billing, deployed on Vercel.

The design (every screen and every backend flow) lives in [`design/`](design/); the project brief Claude Code works from is [`CLAUDE.md`](CLAUDE.md).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in test keys
npm run dev                  # http://localhost:3000
```

`npm run build` · `npm run lint` · `npm run typecheck`

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In Vercel: **Add New → Project → Import** the repo. Framework is auto-detected as Next.js; no build settings to change.
3. **Storage tab** → add **Neon** (Postgres) and **Upstash Redis** from the marketplace, and create a **Blob** store. Each one injects its env vars into the project.
4. **Settings → Environment Variables** → add the remaining keys from [`.env.example`](.env.example): EasyPost, Stripe, Google, Inngest, email. Use test keys for Preview, live keys for Production.
5. Deploy. Every push to `main` deploys to production; every branch gets a preview URL.
6. After the first deploy, point the webhooks at it: EasyPost → `https://<domain>/api/webhooks/easypost`, Stripe → `/api/webhooks/stripe`, Inngest → `/api/inngest` (the Inngest Vercel integration sets this up itself).

Or from the terminal, without Git integration: `npx vercel login`, then `npx vercel` (preview) / `npx vercel --prod`.

## Build order

See "Build order" in [`CLAUDE.md`](CLAUDE.md): components → auth → Ship flow → billing → shipments & tracking → batch & store import → reports and settings.
