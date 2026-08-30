/* Guru Ashish Vegetable Store — order page.
   No backend: the cart is turned into a WhatsApp message. */
(function () {
  'use strict';

  var CART_KEY = 'gavs.cart.v1';
  var INFO_KEY = 'gavs.info.v1';

  var store = null;
  var products = [];
  var cart = load(CART_KEY, {});
  var info = load(INFO_KEY, {});

  var el = {
    grid: document.getElementById('grid'),
    cartbar: document.getElementById('cartbar'),
    cartCount: document.getElementById('cartCount'),
    cartTotal: document.getElementById('cartTotal'),
    cartToggle: document.getElementById('cartToggle'),
    sendOrder: document.getElementById('sendOrder'),
    sheet: document.getElementById('sheet'),
    sheetItems: document.getElementById('sheetItems'),
    sheetTotal: document.getElementById('sheetTotal'),
    sheetClose: document.getElementById('sheetClose'),
    scrim: document.getElementById('scrim'),
    fName: document.getElementById('fName'),
    fFlat: document.getElementById('fFlat'),
    fPhone: document.getElementById('fPhone'),
    fNote: document.getElementById('fNote')
  };

  fetch('data/products.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      store = data.store;
      products = data.products || [];
      paintStore();
      renderGrid();
      restoreInfo();
      renderCart();
    })
    .catch(function () {
      el.grid.innerHTML = '<p class="empty">रेट लिस्ट लोड नहीं हो पाई। कृपया पेज रिफ्रेश करें।</p>';
    });

  /* ---------- rendering ---------- */

  function paintStore() {
    document.getElementById('storeName').textContent = store.name;
    document.getElementById('storeTagline').textContent = store.tagline;
    document.getElementById('deliveryTime').textContent = store.deliveryMinutes + ' मिनट ';
    document.getElementById('storeAddress').textContent = store.address + ' • फोन: ' + store.phone;
    document.getElementById('callLink').href = 'tel:+91' + store.phone;
    document.getElementById('waLink').href = 'https://wa.me/' + store.whatsapp;
    var up = document.getElementById('updatedOn');
    if (store.updatedOn) up.textContent = 'अपडेट: ' + formatDate(store.updatedOn);
  }

  function renderGrid() {
    el.grid.innerHTML = '';
    products.forEach(function (p) {
      var card = document.createElement('div');
      card.className = 'card';
      card.id = 'card-' + p.id;
      card.innerHTML =
        '<div class="emoji">' + p.emoji + '</div>' +
        '<div class="name">' + p.hi + '</div>' +
        '<div class="en">' + p.en + '</div>' +
        '<div class="price">₹' + p.price + ' <small>/ ' + unitLabel(p.unit) + '</small></div>' +
        '<div class="ctrl"></div>';
      el.grid.appendChild(card);
      renderControl(p);
    });
  }

  function renderControl(p) {
    var card = document.getElementById('card-' + p.id);
    var slot = card.querySelector('.ctrl');
    var qty = cart[p.id] || 0;
    slot.innerHTML = '';
    card.classList.toggle('active', qty > 0);

    if (qty <= 0) {
      var add = document.createElement('button');
      add.className = 'add';
      add.type = 'button';
      add.textContent = '+ जोड़ें';
      add.addEventListener('click', function () { change(p, p.step); });
      slot.appendChild(add);
      return;
    }

    var box = document.createElement('div');
    box.className = 'stepper';
    var minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−';
    minus.setAttribute('aria-label', p.hi + ' कम करें');
    minus.addEventListener('click', function () { change(p, -p.step); });
    var label = document.createElement('span');
    label.className = 'qty';
    label.textContent = qtyLabel(p, qty);
    var plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+';
    plus.setAttribute('aria-label', p.hi + ' बढ़ाएं');
    plus.addEventListener('click', function () { change(p, p.step); });
    box.appendChild(minus); box.appendChild(label); box.appendChild(plus);
    slot.appendChild(box);
  }

  function change(p, delta) {
    var qty = round2((cart[p.id] || 0) + delta);
    if (qty <= 0) delete cart[p.id];
    else cart[p.id] = qty;
    save(CART_KEY, cart);
    renderControl(p);
    renderCart();
  }

  function renderCart() {
    var lines = cartLines();
    var total = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var count = lines.length;

    el.cartbar.hidden = count === 0;
    if (count === 0) closeSheet();
    el.cartCount.textContent = String(count);
    el.cartTotal.textContent = fmt(total);
    el.sheetTotal.textContent = fmt(total);

    el.sheetItems.innerHTML = '';
    lines.forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'line';
      row.innerHTML =
        '<span class="n">' + l.p.emoji + ' ' + l.p.hi +
        ' <span class="q">(' + qtyLabel(l.p, l.qty) + ')</span></span>' +
        '<b>₹' + fmt(l.amount) + '</b>';
      el.sheetItems.appendChild(row);
    });
  }

  function cartLines() {
    return products
      .filter(function (p) { return cart[p.id] > 0; })
      .map(function (p) {
        var qty = cart[p.id];
        return { p: p, qty: qty, amount: round2(qty * p.price) };
      });
  }

  /* ---------- order ---------- */

  el.sendOrder.addEventListener('click', function () {
    var lines = cartLines();
    if (!lines.length) return;

    var name = el.fName.value.trim();
    var flat = el.fFlat.value.trim();
    var phone = el.fPhone.value.replace(/\D/g, '');

    if (!requireField(el.fFlat, flat) | !requireField(el.fName, name)) {
      document.getElementById('orderForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    saveInfo();

    var total = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var msg = ['*' + store.name + '* — नया ऑर्डर', ''];
    lines.forEach(function (l, i) {
      msg.push((i + 1) + '. ' + l.p.emoji + ' ' + l.p.hi + ' — ' +
        qtyLabel(l.p, l.qty) + ' = ₹' + fmt(l.amount));
    });
    msg.push('', '*कुल: ₹' + fmt(total) + '*', '');
    msg.push('नाम: ' + name);
    msg.push('टावर/फ्लैट: ' + flat);
    if (phone) msg.push('मोबाइल: ' + phone);
    var note = el.fNote.value.trim();
    if (note) msg.push('सूचना: ' + note);

    window.open('https://wa.me/' + store.whatsapp + '?text=' + encodeURIComponent(msg.join('\n')),
      '_blank', 'noopener');
  });

  function requireField(node, value) {
    var ok = value.length > 0;
    node.classList.toggle('err', !ok);
    return ok;
  }

  /* ---------- sheet ---------- */

  el.cartToggle.addEventListener('click', function () {
    if (el.sheet.hidden) openSheet(); else closeSheet();
  });
  el.sheetClose.addEventListener('click', closeSheet);
  el.scrim.addEventListener('click', closeSheet);

  function openSheet() {
    el.sheet.hidden = false; el.scrim.hidden = false;
    el.cartToggle.setAttribute('aria-expanded', 'true');
  }
  function closeSheet() {
    el.sheet.hidden = true; el.scrim.hidden = true;
    el.cartToggle.setAttribute('aria-expanded', 'false');
  }

  /* ---------- customer info persistence ---------- */

  function restoreInfo() {
    el.fName.value = info.name || '';
    el.fFlat.value = info.flat || '';
    el.fPhone.value = info.phone || '';
    [el.fName, el.fFlat, el.fPhone].forEach(function (n) {
      n.addEventListener('input', function () { n.classList.remove('err'); });
      n.addEventListener('change', saveInfo);
    });
  }
  function saveInfo() {
    save(INFO_KEY, {
      name: el.fName.value.trim(),
      flat: el.fFlat.value.trim(),
      phone: el.fPhone.value.trim()
    });
  }

  /* ---------- helpers ---------- */

  function unitLabel(unit) { return unit === 'kg' ? 'किलो' : unit === '250g' ? '250 ग्राम' : unit; }

  function qtyLabel(p, qty) {
    var grams = p.unit === 'kg' ? qty * 1000 : qty * 250;
    if (grams < 1000) return grams + ' ग्राम';
    return fmt(grams / 1000) + ' किलो';
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function formatDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
})();
