# Reviews API

A Cloudflare Worker that stores customer ratings for guru-ashish.in.
Free tier covers this many times over — a shop doing 50 orders a day would
use well under 1% of the daily request allowance.

## Deploy (once, about five minutes)

Already deployed, and `wrangler.toml` already carries the KV namespace it
uses. To deploy a change:

```bash
cd worker
wrangler deploy
```

To rebuild from nothing — a new account, or the namespace deleted:

```bash
npm install -g wrangler      # if you don't have it
wrangler login

cd worker
wrangler kv namespace create REVIEWS   # paste the new id into wrangler.toml
wrangler deploy
wrangler secret put ADMIN_KEY          # any long random string
```

Wrangler prints a URL like
`https://guru-ashish-reviews.<your-subdomain>.workers.dev`.

The KV id in `wrangler.toml` is not a secret — it names the storage, it does
not open it. `ADMIN_KEY` is the secret, and it lives only in Cloudflare and
on the shopkeeper's phone. To change it, run `wrangler secret put ADMIN_KEY`
again and update the **राय** tab.

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
| `POST /orders` | anyone | log one order for the sales tab |
| `GET /admin?key=…` | shopkeeper | every review, newest first |
| `POST /admin` | shopkeeper | feature, unfeature, hide, show, delete |
| `GET /orders?key=…` | shopkeeper | every logged order, newest first |

## What the order log holds, and what it does not

Item id, name, size, colour, quantity and price. A timestamp. Nothing else.

No name, no flat, no phone, no address — they are not accepted by the
endpoint and could not be stored if they were sent. The sales tab needs
none of them, and the surest way never to leak a customer list is never
to hold one. Orders expire on their own after about thirteen months.

These are orders **started on the website**. Someone who taps send and
never sends the WhatsApp is counted; a walk-in never is. The sales tab
says so above the numbers, because a shopkeeper reading them as total
sales would stock the wrong things.

## Abuse handling

- One rating per IP address per 10 minutes
- Stars must be 1–5; text capped at 300 characters
- `<` and `>` stripped, so nothing can inject markup
- A hidden honeypot field silently swallows bots
- CORS limited to `https://guru-ashish.in`
- The shopkeeper can hide or delete anything from the admin page

None of this makes it unspammable. It makes spam rare and removable, which
is the right bar for a vegetable shop.
