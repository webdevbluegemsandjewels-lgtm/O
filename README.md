# OrenkaFine Storefront

This repository is a multi-page jewelry storefront built with plain HTML, CSS, and browser-side JavaScript.

The checked-in app is no longer just a static marketing site. It now includes:

- Supabase Auth for login and signup
- A profile table and account page backed by Supabase
- A localStorage cart
- A checkout flow that expects Supabase Edge Functions and Razorpay
- A Supabase S3-compatible storage helper for server-side asset work
- A welcome-email Supabase Edge Function



## Current stack

- Frontend: plain HTML, CSS, and JavaScript
- Auth and database: Supabase
- Payment UI: Razorpay Checkout
- Transactional email: Resend via a Supabase Edge Function
- Storage helper: AWS SDK v3 pointed at Supabase Storage's S3-compatible endpoint
- Package manager: npm

## Root structure

```text
OrenkaFine/
├── about.html
├── account.html
├── cart.html
├── checkout.html
├── collections.html
├── contact.html
├── index.html
├── login.html
├── order.html
├── our-journey.html
├── product.html
├── signup.html
├── style.css
├── package.json
├── s3Client.js
├── storage.js
├── supabase_schema.sql
├── js/
│   ├── auth-modal.js
│   ├── auth.js
│   ├── cart.js
│   ├── footer.js
│   ├── main.js
│   ├── products-db.js
│   ├── products.js
│   └── supabaseClient.js
└── supabase/
	└── functions/
		└── welcome-email/
			└── index.ts
```

## Page map

- `index.html`: homepage with hero, featured products, collection highlights, and shared header/footer behavior
- `collections.html`: collection listing page; loads the product grid and then replaces it with Supabase-backed products when available
- `product.html`: single-product page with add-to-cart and authenticated review flow
- `cart.html`: client-side cart view powered by localStorage
- `checkout.html`: shipping form and Razorpay checkout handoff; requires authenticated user plus backend Edge Functions
- `order.html`: post-payment confirmation page
- `login.html`: standalone login page using Supabase Auth
- `signup.html`: standalone signup page collecting profile metadata for Supabase
- `account.html`: authenticated account page for viewing and updating profile details in `profiles`
- `about.html`, `our-journey.html`, `contact.html`: content and brand pages using the shared site shell

## JavaScript modules

- `js/supabaseClient.js`: creates the browser Supabase client using the project's URL and anon key
- `js/auth.js`: session helpers, gated action helper, logout flow, account-avatar rendering, and auto-open signup prompt
- `js/auth-modal.js`: login/signup modal used across the site
- `js/cart.js`: localStorage cart state, badge updates, subtotal calculation, and add/update/remove helpers
- `js/products.js`: static fallback product catalog, category metadata, and image helpers
- `js/products-db.js`: loads active products from the Supabase `products` table and maps them into the card format used by the UI
- `js/main.js`: shared site behavior, asset URL rewriting for Supabase Storage, product rendering, filters, hover image swap, and cart badge sync
- `js/footer.js`: injects the shared footer

## Backend-related files

- `supabase_schema.sql`: creates and secures the `profiles` table, syncs new `auth.users` rows into profiles, and wires a welcome-email trigger
- `supabase/functions/welcome-email/index.ts`: Edge Function that sends a welcome email through Resend when a profile is created
- `s3Client.js`: Node-side S3 client configuration for a Supabase Storage S3 endpoint
- `storage.js`: helper utilities to list, fetch, and upload files in the configured bucket

## Setup

### 1. Install dependencies

```bash
npm install
```

The current `package.json` only declares server-side helper dependencies:

- `@aws-sdk/client-s3`
- `dotenv`

There are no npm scripts defined right now.

### 2. Supabase browser configuration

The frontend reads Supabase credentials directly from `js/supabaseClient.js`.

Current behavior:

- `SUPABASE_URL` is hardcoded
- `SUPABASE_ANON_KEY` is hardcoded
- every HTML page loads `@supabase/supabase-js` from a CDN before loading local scripts

If you move to a different Supabase project, update `js/supabaseClient.js`.

### 3. Database schema

Run `supabase_schema.sql` in the Supabase SQL Editor.

This file sets up:

- `public.profiles`
- row-level security for profile reads and writes
- a trigger to mirror new `auth.users` records into `profiles`
- a trigger that calls the welcome-email function after profile creation

### 4. Welcome email function

Deploy `supabase/functions/welcome-email/index.ts` as a Supabase Edge Function.

Required secrets:

- `RESEND_API_KEY`
- `WELCOME_FROM_EMAIL`
- `WEBHOOK_SECRET`

The function comments also note that JWT verification should be turned off for this webhook-driven endpoint.

### 5. Optional Node storage helper

If you use `s3Client.js` and `storage.js`, create a `.env` file with values for:

- `SUPABASE_S3_ENDPOINT`
- `SUPABASE_S3_REGION`
- `SUPABASE_S3_ACCESS_KEY_ID`
- `SUPABASE_S3_SECRET_ACCESS_KEY`
- `SUPABASE_BUCKET_NAME`

These files are not used by the static pages directly. They are helper modules for server-side scripts or admin tooling.

## Running locally

For static browsing of the marketing pages, you can open `index.html` directly in a browser.

For the full storefront flow, use a local static server instead so redirects, query-string navigation, and third-party integrations behave more predictably. Any simple static server will work.

Frontend features that work with the checked-in code alone:

- page navigation
- shared header/footer UI
- static product rendering
- cart storage in the browser
- login and signup against the configured Supabase project
- account profile loading and saving

Frontend features that require external services already referenced in code:

- live product loading from Supabase `products`
- checkout via Razorpay
- order creation and payment verification via Supabase Edge Functions
- welcome emails via Resend
- asset hosting through the configured Supabase Storage bucket

## Important repo notes

These are worth knowing before you try to run everything end to end:

- `checkout.html` calls Supabase Edge Functions named `create-razorpay-order` and `verify-razorpay-payment`, but those function files are not present in this repository.
- `index.html` references `js/hero-db.js`, but that file is not present in the `js/` folder.
- `collections.html` and `product.html` are set up to prefer database-backed products through `js/products-db.js`, while `js/products.js` still provides a large static fallback catalog.
- Product and brand naming are mixed between `OrenkaFine` and `OrenkaFine`.
- The README that was previously in this repo described an older, smaller structure and did not match the current files.

## Suggested next cleanup steps

If you continue working on this repo, the highest-value follow-ups are:

1. Add the missing checkout Edge Functions or remove the broken checkout calls.
2. Add or remove the missing `js/hero-db.js` reference in `index.html`.
3. Move hardcoded Supabase credentials out of committed frontend code if you want cleaner environment separation.
4. Standardize branding between `OrenkaFine`, `OrenkaFine`, and `OrenkaFine`.
