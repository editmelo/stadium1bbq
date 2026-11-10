/* ==========================================================================
   Pop-up ordering — build the order here, pay on Square's page.

   The menu comes from /api/menu so what is on screen is what the server
   will charge. The cart holds ids and choices only; prices shown are for
   the customer's benefit and are worked out again server-side before
   Square is asked for anything.

   With JavaScript off, or if the menu cannot be fetched, the page keeps
   its printed price table and the direct Square link. Nothing here is
   the only way to find out what a plate costs.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.querySelector('[data-order]');
  if (!root) return;

  var menu = null;
  var cart = [];
  var busy = false;

  function money(cents) {
    return '$' + (cents / 100).toFixed(2);
  }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
  }
  function nameOf(kind, id) {
    var list = kind === 'side' ? menu.sides : menu.meats;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id;
  }
  function itemOf(id) {
    for (var i = 0; i < menu.items.length; i++) if (menu.items[i].id === id) return menu.items[i];
    return null;
  }

  /* ---- markup ---------------------------------------------------------- */

  function optionsFor(kind) {
    var list = kind === 'side' ? menu.sides : menu.meats;
    return list.map(function (o) {
      return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>';
    }).join('');
  }

  function cardFor(item) {
    /* One select per pick, so two of the same side is just two selects
       set the same way — which is a real order people place. */
    var fields = item.choices.map(function (ch) {
      var label = ch.kind === 'side' ? 'Side' : 'Meat';
      var out = '';
      for (var i = 0; i < ch.pick; i++) {
        var id = 'ch-' + item.id + '-' + ch.key + '-' + i;
        out += '<p class="order-card__field">' +
          '<label for="' + id + '">' + label + (ch.pick > 1 ? ' ' + (i + 1) : '') + '</label>' +
          '<select id="' + id + '" data-choice="' + esc(ch.key) + '" data-kind="' + ch.kind + '">' +
          optionsFor(ch.kind) + '</select></p>';
      }
      return out;
    }).join('');

    return '<article class="order-card" data-item="' + esc(item.id) + '">' +
      '<div class="order-card__head">' +
        '<h3>' + esc(item.name) + '</h3>' +
        '<span class="order-card__price">' + money(item.price) + '</span>' +
      '</div>' +
      (item.blurb ? '<p class="order-card__blurb">' + esc(item.blurb) + '</p>' : '') +
      fields +
      '<button type="button" class="btn btn--ghost order-card__add" data-add>Add to order</button>' +
    '</article>';
  }

  /* The Order Online buttons point at Square in the markup, so they work on
     a page with no JavaScript and on a site with no Square credentials set.
     Once ordering is actually live they belong to the cart below instead —
     done here rather than by hand, so there is no switch left to forget. */
  function claimOrderButtons() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-order-cta]'), function (a) {
        a.setAttribute('href', '#order');
        a.removeAttribute('target');
        a.removeAttribute('rel');
      });
  }

  function render() {
    claimOrderButtons();
    root.innerHTML =
      '<div class="builder">' +
        '<div class="panel"><div class="order-grid">' +
          menu.items.map(cardFor).join('') +
        '</div></div>' +
        '<div class="ticket order-cart is-empty">' +
          '<div class="ticket__top">' +
            '<p class="ticket__title">Your order</p>' +
            '<div class="ticket__range" data-total aria-live="polite">$0.00</div>' +
            '<p class="ticket__per" data-count>Nothing added yet</p>' +
            /* Only reachable on phones, where the list is collapsed to keep
               the bar out of the way. CSS hides it on wide screens. */
            '<button type="button" class="cart-toggle" data-toggle ' +
              'aria-expanded="false" aria-controls="cart-lines">Show</button>' +
          '</div>' +
          '<div class="ticket__body" id="cart-lines">' +
            '<ul class="pans" data-lines></ul>' +
            '<p class="ticket__empty" data-empty>Pick something on the left to get started.</p>' +
          '</div>' +
          '<div class="ticket__foot">' +
            '<button type="button" class="btn btn--fire" data-pay disabled>Go to payment</button>' +
            '<p class="ticket__sent" data-status role="status" aria-live="polite"></p>' +
            '<p class="ticket__legal">Pickup only &middot; you pay on Square&rsquo;s secure page</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    paint();
  }

  function paint() {
    var lines = root.querySelector('[data-lines]');
    var empty = root.querySelector('[data-empty]');
    var pay = root.querySelector('[data-pay]');
    var count = cart.reduce(function (n, l) { return n + l.qty; }, 0);
    var total = cart.reduce(function (n, l) { return n + itemOf(l.id).price * l.qty; }, 0);

    root.querySelector('[data-total]').textContent = money(total);
    root.querySelector('[data-count]').textContent =
      count ? count + (count === 1 ? ' item' : ' items') : 'Nothing added yet';
    empty.hidden = cart.length > 0;
    pay.disabled = cart.length === 0 || busy;

    /* An empty cart has nothing to say, so on phones the bar gets out of
       the way entirely rather than sitting over the menu saying $0.00. */
    var panel = root.querySelector('.order-cart');
    panel.classList.toggle('is-empty', cart.length === 0);
    if (!cart.length) {
      panel.classList.remove('is-open');
      root.querySelector('[data-toggle]').setAttribute('aria-expanded', 'false');
    }

    lines.innerHTML = cart.map(function (line, i) {
      var item = itemOf(line.id);
      var bits = [];
      Object.keys(line.choices).forEach(function (key) {
        var ch = item.choices.filter(function (c) { return c.key === key; })[0];
        bits.push(line.choices[key].map(function (id) { return nameOf(ch.kind, id); }).join(', '));
      });
      return '<li class="pan">' +
        '<span class="pan__name">' + (line.qty > 1 ? line.qty + '&times; ' : '') + esc(item.name) + '</span>' +
        '<span class="pan__price">' + money(item.price * line.qty) + '</span>' +
        '<span class="pan__vis"><span class="pan__qty">' + esc(bits.join(' · ')) + '</span>' +
          '<button type="button" class="order-remove" data-remove="' + i + '" ' +
            'aria-label="Remove ' + esc(item.name) + '">Remove</button></span>' +
      '</li>';
    }).join('');
  }

  function say(text, bad) {
    var el = root.querySelector('[data-status]');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-bad', !!bad);
  }

  /* ---- interaction ------------------------------------------------------ */

  root.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var card = add.closest('[data-item]');
      var item = itemOf(card.getAttribute('data-item'));
      var choices = {};
      Array.prototype.forEach.call(card.querySelectorAll('select[data-choice]'), function (sel) {
        var key = sel.getAttribute('data-choice');
        (choices[key] = choices[key] || []).push(sel.value);
      });

      /* Same item with the same choices stacks rather than repeating. */
      var key = item.id + JSON.stringify(choices);
      var existing = cart.filter(function (l) { return l.key === key; })[0];
      if (existing && existing.qty < menu.maxQty) existing.qty += 1;
      else if (!existing) cart.push({ key: key, id: item.id, qty: 1, choices: choices });
      else { say('That is as many of those as one order can hold.', true); return; }

      say('');
      paint();
      return;
    }

    var toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      var panel = root.querySelector('.order-cart');
      var open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Hide' : 'Show';
      return;
    }

    var remove = e.target.closest('[data-remove]');
    if (remove) {
      cart.splice(Number(remove.getAttribute('data-remove')), 1);
      say('');
      paint();
      return;
    }

    if (e.target.closest('[data-pay]')) checkout();
  });

  function checkout() {
    if (busy || !cart.length) return;
    busy = true;
    paint();
    say('Setting up your payment…');

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: cart.map(function (l) { return { id: l.id, qty: l.qty, choices: l.choices }; })
      })
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, data: d }; });
    }).then(function (res) {
      if (res.ok && res.data && res.data.url) {
        say('Taking you to payment…');
        window.location.href = res.data.url;   /* Square's hosted page */
        return;
      }
      busy = false;
      paint();
      say((res.data && res.data.error) || 'That did not go through. Please try again.', true);
    }).catch(function () {
      busy = false;
      paint();
      say('Could not reach the server. Please try again.', true);
    });
  }

  /* ---- start ------------------------------------------------------------ */

  function fallback() {
    /* The printed table and the Square link are still on the page, so this
       says what happened rather than pretending to be the menu. Drawing a
       cart that cannot take a payment would be worse than drawing nothing. */
    root.innerHTML = '<div class="notice">' +
      '<strong>Ordering here isn&rsquo;t switched on yet.</strong> ' +
      'The prices above are current &mdash; order through ' +
      '<a href="https://cash.app/$stadium1bbq" target="_blank" rel="noopener">Square</a> ' +
      'or call <a href="tel:+13173321327">(317) 332-1327</a>.</div>';
  }

  fetch('/api/menu')
    .then(function (r) { if (!r.ok) throw new Error('menu'); return r.json(); })
    .then(function (data) {
      if (!data || !data.items || !data.items.length) throw new Error('menu');
      /* The server tells us whether checkout can complete. No credentials,
         no cart — the Square link above still takes the order. */
      if (!data.ordering) { fallback(); return; }
      menu = data;
      render();
    })
    .catch(fallback);
})();
