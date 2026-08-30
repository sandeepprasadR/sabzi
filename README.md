# गुरु आशीष वेजिटेबल स्टोर — guru-ashish.in

A free, no-backend ordering page for a neighbourhood vegetable seller in
Signature Global Solera, Gurgaon, plus a catalogue page for the same
owner's clothing shop.

Neighbours pick vegetables, the page adds up the bill, and one tap sends
the complete order to the shop's WhatsApp. Payment is cash or UPI at the
door. No app, no signup, no payment gateway, no server bills.

**Live: https://guru-ashish.in**

## Files

| File | What it is |
|---|---|
| `index.html` | The storefront. Self-contained — catalogue, copy and logic all inside |
| `garments.html` | Catalogue for the clothing shop, WhatsApp enquiry per item |
| `admin.html` | Private editor the shopkeeper opens on his phone |
| `worker/` | Cloudflare Worker holding customer ratings — the one moving part |
| `CNAME` | The custom domain |

## Updating prices, stock and photos

Open **https://guru-ashish.in/admin.html** on a phone. Paste a GitHub
token once (the page explains how to make one) and it stays on that
phone. From there:

- change any price, and the unit it is sold by
- mark something out of stock — it greys out on the site instead of
  vanishing, so customers know it is coming back
- take or pick a photo; it is shrunk to 640px JPEG and committed
- add or remove items, on either shop
- set opening hours, minimum order, UPI id, and the complaint window
- read every customer rating, and choose which ones show on the shop
  page (see below)
- copy a formatted rate list to paste into the society WhatsApp group

Saving commits to this repository, and GitHub Pages republishes within
about a minute.

### The token

Use a fine-grained personal access token limited to **this repository
only**, with **Contents: Read and write**. It can change nothing else.
It is stored in the browser's localStorage on that phone; "लॉग आउट"
removes it.

## Customer ratings

Customers rate the shop out of five stars and can leave a line of text.
The page shows the honest average and count of every rating received, and
above them the handful the shopkeeper has picked out. Both halves are
real: he chooses what to highlight, he cannot change the average.

Ratings are the only thing here that needs a server, so it is the
smallest one that exists — a Cloudflare Worker with a KV namespace, both
free at this volume. `worker/README.md` has the deploy steps. Afterwards,
put the Worker's URL and admin key into the **राय** tab of `admin.html`;
until the URL is set, the whole ratings section stays hidden and the rest
of the page is unaffected.

Moderation is deliberately narrow. The shopkeeper can highlight a review,
hide one, or delete one. He cannot edit what a customer wrote.

## Editing by hand instead

Both pages keep their catalogue as plain JSON between markers:

```js
var DATA = /*<CATALOGUE>*/{ ... }/*</CATALOGUE>*/;
```

Edit the JSON and push. Keep the markers — `admin.html` finds the block
by them.

## Deliberately left out

Online payments, accounts, and an order database. They add cost, KYC and
failure modes the shop cannot absorb. Cash and UPI at the door already
work. If order volume outgrows one WhatsApp thread, the next step is a
shared sheet, not a payment gateway.
