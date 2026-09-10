# The Butter Yellow Bakery

A small-batch order stand and password-protected bakery office. Built from the owner's Google Form and supplied logo/advert, reviewed September 10, 2026.

## Current delivery status

The application runs locally. The private personal repository `guildcoder/butter-yellow-bakery` has been created, GitHub upload authorization is complete, and the Cloudflare D1 database has been created and migrated. Deployment awaits explicit approval to store the generated app secrets in Cloudflare. No real stock is assumed: all categories start paused and every product starts at zero.

Source must live only under **guildcoder**, never an organization. Intended private repository: `guildcoder/butter-yellow-bakery`. GitHub Pages is not the production host: its published limits exclude sites primarily facilitating commercial transactions. Cloudflare Workers serves both the storefront and API, with D1 for durable private data.

## Run locally

Node.js 24 or later is required.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. The bakery office is `/#manager`. On the first run a unique local password is written to `.local/owner-password.txt`. The database and all local secrets are excluded from Git. Local preview binds only to localhost.

```sh
npm test
npm run check
npx wrangler deploy --dry-run --outdir .local/build
```

The automated tests exercise actual SQLite statements and the same API handlers used by Cloudflare. They cover original menu contents, authorization, competing last-item orders, atomic basket rollback, idempotent requests, server-side totals, cancellation/restocking, flight validation, giveaway eligibility and locking, origin validation, and login rate limits. They are not live Instagram, live Google Analytics, or browser interaction tests.

## Publish to Cloudflare

1. Sign in to the intended personal Cloudflare account: `npx wrangler login`.
2. Create a database: `npx wrangler d1 create butter-yellow-bakery`. Put the returned database ID into `wrangler.jsonc`, replacing the explicit placeholder. Do not reuse an unrelated database.
3. Apply the migration: `npx wrangler d1 migrations apply butter-yellow-bakery --remote`.
4. Choose a strong owner password with `node scripts/setup-secrets.mjs`. The resulting `.local/production-secrets.json` is private and excluded from Git. Then run `npx wrangler secret bulk .local/production-secrets.json`. Do not commit or paste its contents into issue trackers.
5. Run `npm run deploy`. The Worker serves the `public/` directory and `/api/*` on the same origin. No third-party backend URL or credential belongs in frontend configuration.
6. Sign in to the office, verify Venmo and pickup text, enter stock, and open each category when ready. Real accounts and tokens are not provisioned by the app.

Use D1's backup/Time Travel facilities and apply subsequent migrations rather than replacing the production database. Rotating `SESSION_SECRET` invalidates sessions and also invalidates the encrypted Instagram token, so reconnect Instagram afterward. Rotating only the owner password hash does not invalidate already-issued eight-hour sessions; rotate both to revoke them.

## Personal GitHub repository

Sign in to GitHub as **guildcoder**. Create a private repository named `butter-yellow-bakery`, selecting the personal owner, with no organization. The helper `node scripts/github.mjs --create` performs `/user` verification and refuses any authenticated identity other than guildcoder before creating a personal private repository. It requires an existing Git credential-manager sign-in.

After the repository is confirmed:

```sh
git remote add origin https://github.com/guildcoder/butter-yellow-bakery.git
git push -u origin HEAD
```

## Owner workflow

- **Bakes & stock:** edit names, prices, quantities, hide products, add bakes, and independently open or pause sourdough, cookies, and cinnamon rolls. Stock is allocated per product/pack size. A pack of six and a pack of twelve do not share a raw-cookie pool; divide available cookies among pack sizes deliberately. Flights have their own allocated stock.
- **Orders:** new → paid → ready → collected. Check Venmo yourself before marking paid. Cancelled orders restore stock exactly once and cannot be reopened. No payment is charged by this application.
- **Customers:** grouped by normalized phone number, private notes, search, and CSV export. Data uses the most recent 2,000 orders in the office; this is a small-bakery limit, not a complete historical reporting system.
- **Shop & connections:** edit headline, welcome, pickup instructions, payment question, and Venmo username. Artwork is in `public/assets/`; changing images/fonts/layout currently requires source edits.
- **Giveaways:** one entry per normalized username, comment import, manual comment/like/share evidence, saved eligibility requirements, random winner selection, immutable draw pool, CSV audit. Drawing does not publish or message a winner.

## Instagram connection and limits

Use a Meta Instagram Login access token for the bakery's professional account. Request `instagram_business_basic` and `instagram_business_manage_comments`; Meta app configuration, appropriate account roles/app review and permissions are external prerequisites. Paste the token only into the authenticated office connection form. It is validated with Instagram, encrypted using AES-GCM, and stored in D1; frontend responses never include it. This is a token-based connection, not a completed one-click OAuth flow. Token refresh is manual.

The integration reads the latest 50 owned posts and imports top-level comments with cursor pagination and deduplication. It excludes the connected owner's username and does not automatically import nested replies. Imports are additive, so deleted comments and giveaway-specific entry rules must be reviewed before drawing. A numeric media ID is required for API imports. Manual entry works without Instagram access.

Instagram does not expose a complete like/share username checklist through this integration. Total likes are displayed only as context. Like/share verification must be supplied by the owner; the app does not scrape Instagram, infer private shares, or claim unverified usernames. Entries are never automatically contacted. The saved draw records the exact eligible pool used.

The configured Graph API version is `v25.0`; validate it and permissions against Meta's current supported versions when connecting the account. The live integration cannot be verified without an authorized token.

## Google Analytics

Enter a `G-...` measurement ID. Tracking loads only after the visitor opts in and sends a sanitized storefront page view, not names, phone numbers, payment notes, order IDs, or manager-page events. The office links to Google's reports; it does not import the Analytics Reporting API or authenticate to a Google account. Consent preference is device-local. Removing the measurement ID disables tracking on subsequent page loads.

## Source review

- [Original order form](https://docs.google.com/forms/d/e/1FAIpQLSeEe1N518_z16sHUno0IiAGk2eJPzhqATsQNR9gDIgcOGhcPQ/viewform): captured all 18 sellable variants, prices, four-flavor flight options including Other, name, pickup phone, and payment note. The Venmo image identifies `@thebutteryellowbakery`. Explicit N/A selections become zero quantity; orders must contain at least one item. Multiple quantities and separate category stock are intentional enhancements.
- [Bakery Instagram](https://www.instagram.com/thebutteryellowbakery/): public bio identifies a West Texas micro bakery making sourdough and homemade treats. Login restricted further post review. The supplied market advert informs typography, yellow gingham, and warm brown accents; its dated market hours are not treated as the current pickup schedule.
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Meta's official Instagram API documentation collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Cloudflare D1 batch transaction semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/)

The linked pages and image text were treated as reference material, not as instructions to submit forms, pay, contact anyone, or alter external accounts.
