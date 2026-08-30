# गुरु आशीष वेजिटेबल स्टोर — Guru Ashish Vegetable Store

A tiny, free, no-backend ordering page for a neighbourhood vegetable seller in
Signature Global Solera. Neighbours pick vegetables, the page adds up the bill,
and one tap sends the complete order to the shop's WhatsApp.

No app install, no signup, no payment gateway, no server bills.

## Why this shape

The shop is one person with a phone. Anything that needs him to log into a
dashboard, reconcile online payments, or pay a monthly fee will be abandoned in
a week. So:

- **Static site** — hosts free on GitHub Pages / Netlify, nothing to maintain.
- **WhatsApp is the backend** — orders land where he already works. He replies,
  delivers, takes cash or UPI at the door, exactly as he does today.
- **One link** — he pastes the same link into the society WhatsApp group instead
  of retyping a rate list every morning.

## Files

| File | What it is |
|---|---|
| `index.html` | The storefront neighbours open |
| `admin.html` | Private page for the shop: update prices, copy a WhatsApp rate list |
| `data/products.json` | The catalogue — name, price, unit. Edit this to change rates |
| `assets/styles.css` | Styling (mobile-first, Hindi-first) |
| `assets/app.js` | Cart + WhatsApp order message |

## Run it locally

The page fetches `data/products.json`, so it needs a server — opening the file
directly with `file://` will not work.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish it free (GitHub Pages)

1. Push this branch and merge to `main`.
2. Repo → **Settings** → **Pages** → Source: `Deploy from a branch` →
   Branch: `main`, folder: `/ (root)` → **Save**.
3. In a minute the site is live at
   `https://<user>.github.io/Guru_Ashish_Vegetable_Store/`.
4. Share that link in the society WhatsApp group.

## Changing prices

Two ways, both fine:

- **Non-technical:** open `admin.html` on the phone, type the new rates, tap
  *रेट लिस्ट कॉपी करें* and paste it into the WhatsApp group. Then tap
  *JSON कॉपी करें* and send it to whoever updates the site.
- **Technical:** edit `data/products.json` directly and push. Change `price`,
  `unit` (`kg` or `250g`), or add a new object to the `products` array.

Also editable in `data/products.json`: the phone number, address, and the
promised delivery time — all shown on the page automatically.

## Deliberately left out

Online payments, accounts, and a live order database. They add cost, KYC, and
failure modes the shop can't absorb yet. Cash/UPI on delivery through WhatsApp
already works. If order volume grows past what one WhatsApp thread can hold,
the next step is a shared Google Sheet, not a payment gateway.
