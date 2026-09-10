# The Butter Yellow Bakery

A small-batch order stand and password-protected bakery office. Built from the owner's Google Form and supplied logo/advert, reviewed September 10, 2026.

## Current delivery status

The application is deployed at https://tbyb.bakery-stand.workers.dev with a password-protected office at /#manager. Cloudflare D1 migrations and encrypted Worker secrets are installed. Email delivery still requires a verified Brevo sender, API key, and contact-list connection in the office. All categories start paused and every product starts at zero until the owner enters real availability.

Source lives under the personal **guildcoder** account, never an organization, at `guildcoder/butter-yellow-bakery`. Cloudflare Workers serves both the storefront and API, with D1 for durable private data. GitHub Pages is not the production host.

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

Use D1's backup/Time Travel facilities and apply subsequent migrations rather than replacing the production database. Rotating `SESSION_SECRET` invalidates sessions and encrypted integration tokens, so reconnect Instagram and Brevo afterward. Rotating only the owner password hash does not invalidate already-issued eight-hour sessions; rotate both to revoke them.

## Personal GitHub repository

Sign in to GitHub as **guildcoder**. Create a private repository named `butter-yellow-bakery`, selecting the personal owner, with no organization. The helper `node scripts/github.mjs --create` performs `/user` verification and refuses any authenticated identity other than guildcoder before creating a personal private repository. It requires an existing Git credential-manager sign-in.

After the repository is confirmed:

```sh
git remote add origin https://github.com/guildcoder/butter-yellow-bakery.git
git push -u origin HEAD
```

## Owner workflow

- **Bakes & stock:** edit names, prices, quantities, hide products, add bakes, and independently open or pause sourdough, cookies, and cinnamon rolls. Stock is allocated per product/pack size. A pack of six and a pack of twelve do not share a raw-cookie pool; divide available cookies among pack sizes deliberately. Flights have their own allocated stock. Check Unlimited beside a bake and Save to accept orders without consuming its saved quantity. Category pauses still apply. Uncheck Unlimited and set a quantity to resume limited stock. Customers see availability, never stock counts. The existing limit of 50 units per item per order still applies.
- **Orders:** new → paid → ready → collected. Check Venmo yourself before marking paid. Cancelled orders restore stock exactly once and cannot be reopened. No payment is charged by this application.
- **Customers:** grouped by normalized phone number, private notes, search, and CSV export. Data uses the most recent 2,000 orders in the office; this is a small-bakery limit, not a complete historical reporting system.
- **Email & updates:** connect a free Brevo account with an active verified sender and a Bakery updates contact list. Customers receive reservation confirmations; only customers who check the optional updates box enter the announcement list. Open Brevo from the office to compose and send announcements with its unsubscribe handling.
- **Shop & connections:** edit headline, welcome, pickup instructions, payment question, and Venmo username. Artwork is in `public/assets/`; changing images/fonts/layout currently requires source edits.
- **Giveaways:** one entry per normalized username, comment import, manual comment/like/share evidence, saved eligibility requirements, random winner selection, immutable draw pool, CSV audit. Drawing does not publish or message a winner.

## Email setup and limits

In **Email & updates**, follow the setup instructions to verify the owner's sender address in Brevo, create a contact list, and connect its list ID and API key. The key is encrypted in D1 and never returned to the browser. The production owner password is in the Git-excluded `.local/live-owner-password.txt`; the local preview uses a different password.

Brevo's free plan currently allows 300 emails per day, shared between announcements and confirmations, with Brevo branding. Leave capacity for order confirmations. A Gmail sender cannot authenticate its own domain; Brevo currently substitutes a provider-owned sending domain as a temporary accommodation. Replies go to the owner's verified email. A custom authenticated domain may be needed later. See [free-plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) and [sender requirements](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).

Orders, inventory deductions, and confirmation queue records commit together. Email failure cannot roll back a saved order. Queued messages and opted-in contacts are processed every two minutes after connection. Confirmation retries retain their payload and stop before Brevo's 15-minute duplicate-protection window expires. Failed/uncertain messages require reviewing the provider log before manually resending. An accepted status means Brevo accepted the request, not that the message reached an inbox. Email tests mock Brevo; live delivery has not yet been verified.

Announcements are composed and sent in Brevo, linked from the owner office. Signup history is not a current subscriber list: Brevo maintains unsubscribe and suppression state. The app does not automatically subscribe ordinary customers or override their suppression flags.

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


