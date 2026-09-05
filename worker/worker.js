/**
 * Reviews API for guru-ashish.in
 *
 * A Cloudflare Worker backed by one KV namespace. Free tier is far more than
 * a neighbourhood vegetable shop will ever need.
 *
 * Public
 *   GET  /reviews            -> { count, avg, featured[], recent[] }
 *   POST /reviews            -> add one rating   { stars, text, name, flat }
 *
 *   POST /orders             -> log one order for analytics  { shop, items[] }
 *
 * Shopkeeper (needs ADMIN_KEY)
 *   POST /admin              -> { key, action: 'feature'|'unfeature'|'delete', id }
 *   GET  /admin?key=...      -> every review, newest first
 *   GET  /orders?key=...     -> every logged order, newest first
 *
 * Storage: one KV entry per review, key `r:<ts>:<rand>`. Listing a few
 * hundred keys is cheap and avoids the lost-update race a single JSON blob
 * would have.
 */

const MAX_TEXT = 300;
const MAX_NAME = 40;
const MAX_FLAT = 12;
const RECENT_LIMIT = 40;
const MAX_LINES = 40;        /* a basket longer than this is not a real basket */
const ORDER_TTL = 60 * 60 * 24 * 400;   /* orders expire after ~13 months */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return preflight(env);

    try {
      if (path === '/reviews' && request.method === 'GET') return await listPublic(env);
      if (path === '/reviews' && request.method === 'POST') return await addReview(request, env);
      if (path === '/admin' && request.method === 'GET') return await listAll(url, env);
      if (path === '/admin' && request.method === 'POST') return await admin(request, env);
      if (path === '/orders' && request.method === 'POST') return await addOrder(request, env);
      if (path === '/orders' && request.method === 'GET') return await listOrders(url, env);
      return json({ ok: false, error: 'not_found' }, 404, env);
    } catch (err) {
      return json({ ok: false, error: 'server_error' }, 500, env);
    }
  }
};

/* ----------------------------- helpers -------------------------------- */

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function preflight(env) {
  return new Response(null, { status: 204, headers: cors(env) });
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(env) }
  });
}

/* Strip anything that could be markup, collapse whitespace, clamp length. */
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/* Timing-safe-ish comparison so the admin key can't be probed byte by byte. */
function keyOk(given, expected) {
  if (!expected) return false;
  const a = String(given || '');
  const b = String(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readAll(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.REVIEWS.list({ prefix: 'r:', cursor, limit: 1000 });
    for (const k of page.keys) {
      const raw = await env.REVIEWS.get(k.name);
      if (!raw) continue;
      try {
        const r = JSON.parse(raw);
        r.id = k.name;
        out.push(r);
      } catch (e) { /* skip a corrupt entry rather than fail the request */ }
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => b.ts - a.ts);
  return out;
}

/* ------------------------------ public -------------------------------- */

async function listPublic(env) {
  const all = await readAll(env);
  const visible = all.filter(r => !r.hidden);
  const count = visible.length;
  const avg = count
    ? Math.round((visible.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10
    : 0;

  const shape = r => ({ id: r.id, stars: r.stars, text: r.text, name: r.name, flat: r.flat, ts: r.ts });

  return json({
    ok: true,
    count,
    avg,
    featured: visible.filter(r => r.featured).map(shape),
    recent: visible.filter(r => r.text).slice(0, RECENT_LIMIT).map(shape)
  }, 200, env);
}

async function addReview(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  /* One rating per address per 10 minutes. Enough to stop a bored teenager
     without blocking a family sharing a connection. */
  const rlKey = 'rl:' + ip;
  if (await env.REVIEWS.get(rlKey)) {
    return json({ ok: false, error: 'too_soon' }, 429, env);
  }

  let body;
  try { body = await request.json(); } catch (e) { body = {}; }

  const stars = Math.round(Number(body.stars));
  if (!(stars >= 1 && stars <= 5)) {
    return json({ ok: false, error: 'bad_stars' }, 400, env);
  }

  /* Honeypot: a real person never fills a field they cannot see. */
  if (clean(body.website, 20)) return json({ ok: true, skipped: true }, 200, env);

  const review = {
    stars: stars,
    text: clean(body.text, MAX_TEXT),
    name: clean(body.name, MAX_NAME),
    flat: clean(body.flat, MAX_FLAT),
    ts: Date.now(),
    featured: false,
    hidden: false
  };

  const id = 'r:' + review.ts + ':' + Math.random().toString(36).slice(2, 8);
  await env.REVIEWS.put(id, JSON.stringify(review));
  await env.REVIEWS.put(rlKey, '1', { expirationTtl: 600 });

  return json({ ok: true, id }, 200, env);
}

/* ------------------------------ orders --------------------------------- */
/*
 * What the shop asked for, not who asked for it.
 *
 * No name, flat, phone or address is accepted or stored here. The analytics
 * this feeds needs item, size, colour, quantity and price and nothing else,
 * and the surest way not to leak a customer list is never to hold one.
 *
 * These are orders *started on the website*. A customer who taps send and
 * never sends the WhatsApp still lands here, and a walk-in never does. The
 * admin page says so where the numbers are shown.
 */
async function addOrder(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { body = {}; }

  const shop = body.shop === 'gar' ? 'gar' : 'veg';
  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];
  const items = raw.map(l => ({
    id: clean(l.id, 60),
    name: clean(l.name, MAX_NAME),
    size: clean(l.size, 12),
    color: clean(l.color, MAX_NAME),
    qty: Math.min(999, Math.max(0, Math.round(Number(l.qty) || 0))),
    price: Math.min(1000000, Math.max(0, Math.round(Number(l.price) || 0)))
  })).filter(l => l.id && l.qty > 0);

  if (!items.length) return json({ ok: false, error: 'empty' }, 400, env);

  const order = {
    shop: shop,
    items: items,
    total: items.reduce((s, l) => s + l.qty * l.price, 0),
    ts: Date.now()
  };
  const id = 'o:' + order.ts + ':' + Math.random().toString(36).slice(2, 8);
  await env.REVIEWS.put(id, JSON.stringify(order), { expirationTtl: ORDER_TTL });
  return json({ ok: true }, 200, env);
}

async function listOrders(url, env) {
  if (!keyOk(url.searchParams.get('key'), env.ADMIN_KEY)) {
    return json({ ok: false, error: 'unauthorised' }, 401, env);
  }
  const out = [];
  let cursor;
  do {
    const page = await env.REVIEWS.list({ prefix: 'o:', cursor, limit: 1000 });
    for (const k of page.keys) {
      const raw = await env.REVIEWS.get(k.name);
      if (!raw) continue;
      try { out.push(JSON.parse(raw)); } catch (e) { /* skip a corrupt entry */ }
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => b.ts - a.ts);
  return json({ ok: true, orders: out }, 200, env);
}

/* ---------------------------- shopkeeper ------------------------------ */

async function listAll(url, env) {
  if (!keyOk(url.searchParams.get('key'), env.ADMIN_KEY)) {
    return json({ ok: false, error: 'unauthorised' }, 401, env);
  }
  return json({ ok: true, reviews: await readAll(env) }, 200, env);
}

async function admin(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { body = {}; }

  if (!keyOk(body.key, env.ADMIN_KEY)) {
    return json({ ok: false, error: 'unauthorised' }, 401, env);
  }

  const id = String(body.id || '');
  if (!id.startsWith('r:')) return json({ ok: false, error: 'bad_id' }, 400, env);

  if (body.action === 'delete') {
    await env.REVIEWS.delete(id);
    return json({ ok: true }, 200, env);
  }

  const raw = await env.REVIEWS.get(id);
  if (!raw) return json({ ok: false, error: 'not_found' }, 404, env);
  const r = JSON.parse(raw);

  if (body.action === 'feature') r.featured = true;
  else if (body.action === 'unfeature') r.featured = false;
  else if (body.action === 'hide') r.hidden = true;
  else if (body.action === 'show') r.hidden = false;
  else return json({ ok: false, error: 'bad_action' }, 400, env);

  await env.REVIEWS.put(id, JSON.stringify(r));
  return json({ ok: true }, 200, env);
}
