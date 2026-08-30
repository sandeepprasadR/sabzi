# Reviews API

A Cloudflare Worker that stores customer ratings for guru-ashish.in.
Free tier covers this many times over — a shop doing 50 orders a day would
use well under 1% of the daily request allowance.

## Deploy (once, about five minutes)

```bash
npm install -g wrangler      # if you don't have it
wrangler login

cd worker
wrangler kv namespace create REVIEWS
```

That prints an `id`. Paste it into `wrangler.toml`, replacing
`PASTE_KV_NAMESPACE_ID_HERE`.

Then set the shopkeeper's moderation password and deploy:

```bash
wrangler secret put ADMIN_KEY     # type any long random string
wrangler deploy
```

Wrangler prints a URL like
`https://guru-ashish-reviews.<your-subdomain>.workers.dev`.

## Switch it on

1. Open **guru-ashish.in/admin.html** → **राय** tab
2. Paste that URL into **Reviews API**, and the `ADMIN_KEY` into **Admin key**
3. Save

Until the URL is set, the ratings section stays hidden on the storefront and
nothing looks broken.

## What it does

| Route | Who | Purpose |
|---|---|---|
| `GET /reviews` | anyone | average, count, featured quotes, recent quotes |
| `POST /reviews` | anyone | leave one rating |
| `GET /admin?key=…` | shopkeeper | every review, newest first |
| `POST /admin` | shopkeeper | feature, unfeature, hide, show, delete |

## Abuse handling

- One rating per IP address per 10 minutes
- Stars must be 1–5; text capped at 300 characters
- `<` and `>` stripped, so nothing can inject markup
- A hidden honeypot field silently swallows bots
- CORS limited to `https://guru-ashish.in`
- The shopkeeper can hide or delete anything from the admin page

None of this makes it unspammable. It makes spam rare and removable, which
is the right bar for a vegetable shop.
