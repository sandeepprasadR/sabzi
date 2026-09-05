# गुरु आशीष वेजिटेबल स्टोर, guru-ashish.in

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
| `index.html` | The storefront. Self-contained: catalogue, copy and logic all inside |
| `garments.html` | The clothing shop: size, colour, quantity, bag, courier or collection |
| `admin.html` | Private editor the shopkeeper opens on his phone |
| `worker/` | Cloudflare Worker holding customer ratings, the one moving part |
| `CNAME` | The custom domain |

## Updating prices, stock and photos

Open **https://guru-ashish.in/admin.html** on a phone. Paste a GitHub
token once (the page explains how to make one) and it stays on that
phone.

The page is in **English by default**, with a Hindi toggle in the header
that remembers the choice. It translates the admin only. Product names
stay as they are, and the WhatsApp rate list stays Hindi because it goes
to the society group.

From there:

- open any item and change its name, category, price and unit
- for clothes: which sizes are in stock, colours, fabric, a line of
  sales copy, and an old price to show struck through
- change any price, and the unit it is sold by
- mark something out of stock, and it greys out on the site instead of
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

## Two shops, one site

`index.html` sells vegetables for delivery. `garments.html` sells clothes,
either collected from the shop or sent by courier. The customer picks a
size and quantity, and gives a full address only when they choose courier.

The vegetable page carries a strip of garment photos in its header, above
the fold, because most people arrive for vegetables and never learn about
the clothes. It cannot read the other catalogue at runtime, because both pages are
standalone files, so the admin copies four photos and their names into
`store.crossSell` every time it saves.

The clothing page links back to the vegetables in two places: a pill at the
top of its header and the line in its footer, so the way back is there
whether the customer has scrolled or not.

Both bags live in `localStorage` and survive moving between the pages.

## Stock, cost and the sales tab

Every item carries a stock count Tarun keeps by hand, and two numbers that
say what it cost him: what he paid, and how much came for that money. ₹200
for 25 kilos of potato is ₹8 a kilo, and the editor works that out and
shows it against the selling price, with the margin, in red when a price
has slipped below cost.

Everything is counted in the item's base unit: the kilo for anything sold
by weight, the नग, the गड्डी, the piece. A 250-gram price is the one place
the sale unit and the base unit part company, and it is four to the kilo.

The tab totals both: what the stock cost him and what it would fetch. The
first is the honest number for money tied up on the shelf; the second is
only a hope until it sells. Items with stock but no cost entered are
counted separately, so the total never quietly pretends to be complete.
The storefront stays quiet about stock until three or fewer are left.

A website order does not decrement anything: a customer can tap send and
never send the WhatsApp, so a number that moved on its own would be wrong
more often than right. A sale over the counter is different, because it
already happened, and the **बेचा** button on each garment records one:
quantity, size and colour, the stock comes down, the page saves itself,
and the sale joins the numbers in the Sales tab.

The **Sales** tab reads website orders and recorded counter sales
together: fastest movers, items nobody ordered, sizes, colours and price
bands, for both shops, with the split between the two shown whenever both
are present. It still leads with what it cannot see, because a walk-in
nobody recorded and an order taken on the phone remain invisible.

## Customer ratings

Customers rate the shop out of five stars and can leave a line of text.
The page shows the honest average and count of every rating received, and
above them the handful the shopkeeper has picked out. Both halves are
real: he chooses what to highlight, he cannot change the average.

Ratings are the only thing here that needs a server, so it is the
smallest one that exists, a Cloudflare Worker with a KV namespace, both
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

Edit the JSON and push. Keep the markers, because `admin.html` finds the block
by them.

## Deliberately left out

Online payments, accounts, and an order database. They add cost, KYC and
failure modes the shop cannot absorb. Cash and UPI at the door already
work. If order volume outgrows one WhatsApp thread, the next step is a
shared sheet, not a payment gateway.
