/* ==========================================================================
   Build Your Cookout — live catering estimator
   Stadium 1 BBQ & More

   HOW THE ESTIMATE WORKS
   ----------------------
   Every number below comes from Stadium 1's real catering price list
   (pan pricing). The estimator works out how many pans an event needs,
   prices those pans, adds a service percentage, applies the event
   minimum, and shows a range.

   TO CHANGE PRICES: edit CONFIG and MENU below. Nothing else needs to move.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — Shon, these are the only numbers you need to touch.
     ------------------------------------------------------------------ */
  var CONFIG = {
    // Smallest total you'll take for a catered event.
    minimumEvent: 800,

    // Added to the food subtotal to cover setup, serving and disposables.
    serviceRate: {
      dropoff: 0.10,   // you drop it off hot, they serve themselves
      full:    0.22    // you set up, serve and clean up
    },

    // How wide the quoted range is around the calculated figure (±).
    rangeSpread: 0.12,

    // Guest slider
    guests: { min: 20, max: 400, step: 5, start: 150 },

    // How much meat to cook. One meat = one serving each. Every extra
    // meat adds a little, because people sample rather than pick one.
    meatPerGuest: 1.0,
    meatVarietyBump: 0.12,
    meatVarietyCap: 1.45,

    // Servings of each side per guest, by how many sides were chosen.
    sidePerGuest: { 1: 0.75, 2: 0.60, 3: 0.50, 4: 0.45 },

    maxMeats: 4,
    maxSides: 4
  };

  /* ------------------------------------------------------------------
     MENU — real prices from the Stadium 1 catering list.
     `serves` is how many people one of that size feeds.
     Sizes must be listed largest first.
     ------------------------------------------------------------------ */
  var MEATS = [
    { id: 'ribs', name: 'Ribs', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 99.99,  serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 49.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'rib-tips', name: 'Rib Tips', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 119.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 59.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'brisket', name: 'Brisket', confirmed: true, sizes: [
      { label: '8 lbs', short: '8LB', price: 350.99, serves: 24, unit: 'lb' },
      { label: '4 lbs', short: '4LB', price: 175.99, serves: 12, unit: 'lb' },
      { label: '2 lbs', short: '2LB', price: 85.99,  serves: 6,  unit: 'lb' }
    ]},
    { id: 'pulled-pork', name: 'Pulled Pork', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 159.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 79.99,  serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 39.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'pulled-beef', name: 'Pulled Beef', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 99.99,  serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 49.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'pulled-chicken', name: 'Pulled Chicken', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 159.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 79.99,  serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 39.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'bbq-chicken', name: 'BBQ Chicken', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 170.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 85.99,  serves: 12, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 45.99,  serves: 8,  unit: 'third' }
    ]},
    { id: 'baked-chicken', name: 'Baked Chicken', confirmed: true, sizes: [
      { label: '100 Pieces', short: '100PC', price: 159.99, serves: 50, unit: 'pc' },
      { label: '50 Pieces',  short: '50PC',  price: 79.99,  serves: 25, unit: 'pc' },
      { label: '25 Pieces',  short: '25PC',  price: 35.99,  serves: 12, unit: 'pc' }
    ]},
    { id: 'fried-chicken', name: 'Fried Chicken', confirmed: true, sizes: [
      { label: '100 Pieces', short: '100PC', price: 159.99, serves: 50, unit: 'pc' },
      { label: '50 Pieces',  short: '50PC',  price: 79.99,  serves: 25, unit: 'pc' },
      { label: '25 Pieces',  short: '25PC',  price: 35.99,  serves: 12, unit: 'pc' }
    ]}
  ];

  var SIDES = [
    // Confirmed pan pricing from the catering list.
    { id: 'mac', name: 'Mac & Cheese', confirmed: true, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 159.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 79.99,  serves: 15, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 39.99,  serves: 10, unit: 'third' }
    ]},
    /* --------------------------------------------------------------
       The three sides below are ESTIMATED. Stadium 1 sells them by
       the portion at the market ($4 each) but has no published pan
       price. These follow the same pan structure as Mac & Cheese.
       ACTION: confirm these three with Shon and set `confirmed: true`.
       -------------------------------------------------------------- */
    { id: 'beans', name: 'Baked Beans', confirmed: false, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 29.99, serves: 10, unit: 'third' }
    ]},
    { id: 'slaw', name: 'Cole Slaw', confirmed: false, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 29.99, serves: 10, unit: 'third' }
    ]},
    { id: 'green-beans', name: 'Green Beans', confirmed: false, sizes: [
      { label: 'Full Pan', short: 'FULL', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  short: '1/2',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  short: '1/3',  price: 29.99, serves: 10, unit: 'third' }
    ]}
  ];

  /* These strings must match the <option> text in the quote form on
     catering.html exactly — the handoff sets the select by value. */
  var EVENT_TYPES = [
    'Corporate Meeting', 'Team Building', 'Warehouse Event',
    'Repast', 'Holiday Party', 'Family Gathering', 'Wedding', 'Other'
  ];

  var SERVICE = [
    { id: 'dropoff', name: 'Drop-off', note: 'Hot and ready in pans. You serve.' },
    { id: 'full',    name: 'Full Service', note: 'We set up, serve and clean up.' }
  ];

  /* ------------------------------------------------------------------
     Pan packing.

     Finds the cheapest set of pans that covers the servings needed,
     the way a caterer actually loads the van: full pans carry the bulk,
     with at most one half pan and two third pans making up the
     remainder. PAN_TAIL_CAP holds that shape.

     PAN_COUNT_PENALTY nudges ties toward fewer, bigger pans — so a
     full pan wins over three thirds when the cost is a wash.

     Because this is a minimum over a set of options that only ever
     shrinks as more servings are needed, the price can never go down
     when the guest count goes up.
     ------------------------------------------------------------------ */
  var PAN_TAIL_CAP = [Infinity, 1, 2];
  var PAN_COUNT_PENALTY = 4;

  function packPans(item, servingsNeeded) {
    var sizes = item.sizes;
    var need = Math.max(1, Math.ceil(servingsNeeded));

    var maxBulk = Math.ceil(need / sizes[0].serves);
    var capMid = sizes[1] ? PAN_TAIL_CAP[1] : 0;
    var capSmall = sizes[2] ? PAN_TAIL_CAP[2] : 0;

    var best = null;

    for (var a = 0; a <= maxBulk; a++) {
      for (var b = 0; b <= capMid; b++) {
        for (var c = 0; c <= capSmall; c++) {
          var covered = a * sizes[0].serves +
            (sizes[1] ? b * sizes[1].serves : 0) +
            (sizes[2] ? c * sizes[2].serves : 0);
          if (covered < need) continue;

          var cost = a * sizes[0].price +
            (sizes[1] ? b * sizes[1].price : 0) +
            (sizes[2] ? c * sizes[2].price : 0);
          var panCount = a + b + c;
          if (panCount === 0) continue;

          var score = cost + PAN_COUNT_PENALTY * panCount;
          if (!best || score < best.score) {
            best = { qty: [a, b, c], cost: cost, covered: covered, score: score };
          }
        }
      }
    }

    // Fallback that cannot normally be reached: one of the smallest size.
    if (!best) {
      var smallest = sizes[sizes.length - 1];
      return {
        item: item,
        lines: [{ size: smallest, qty: 1 }],
        total: smallest.price,
        covered: smallest.serves
      };
    }

    var lines = [];
    for (var i = 0; i < sizes.length; i++) {
      if (best.qty[i] > 0) lines.push({ size: sizes[i], qty: best.qty[i] });
    }

    // Estimates are quoted in whole dollars. The menu keeps its .99
    // prices; carrying them into a five-figure estimate just adds noise.
    return { item: item, lines: lines, total: Math.round(best.cost), covered: best.covered };
  }

  /* ------------------------------------------------------------------
     The calculation
     ------------------------------------------------------------------ */
  function calculate(state) {
    var chosenMeats = MEATS.filter(function (m) { return state.meats.indexOf(m.id) > -1; });
    var chosenSides = SIDES.filter(function (s) { return state.sides.indexOf(s.id) > -1; });

    if (!chosenMeats.length) return null;

    // Meat: one serving per guest, plus a little for each extra choice.
    var varietyFactor = Math.min(
      CONFIG.meatPerGuest + CONFIG.meatVarietyBump * (chosenMeats.length - 1),
      CONFIG.meatVarietyCap
    );
    var meatServings = state.guests * varietyFactor;
    var perMeat = meatServings / chosenMeats.length;

    var builds = chosenMeats.map(function (m) { return packPans(m, perMeat); });

    // Sides: people take less of each when there are more to choose from.
    if (chosenSides.length) {
      var perGuest = CONFIG.sidePerGuest[Math.min(chosenSides.length, 4)] || 0.45;
      var perSide = state.guests * perGuest;
      builds = builds.concat(chosenSides.map(function (s) { return packPans(s, perSide); }));
    }

    var food = builds.reduce(function (sum, b) { return sum + b.total; }, 0);
    var rate = CONFIG.serviceRate[state.service] || 0;
    var withService = food * (1 + rate);

    var belowMinimum = withService < CONFIG.minimumEvent;
    var mid = Math.max(withService, CONFIG.minimumEvent);

    // The bottom of the range never dips under the minimum — otherwise
    // an event that grows past the minimum would appear to get cheaper.
    var low = Math.max(CONFIG.minimumEvent, mid * (1 - CONFIG.rangeSpread));
    var high = Math.max(low, mid * (1 + CONFIG.rangeSpread));

    var unconfirmed = builds.some(function (b) { return b.item.confirmed === false; });

    return {
      builds: builds,
      food: food,
      serviceRate: rate,
      low: low,
      high: high,
      perGuest: mid / state.guests,
      belowMinimum: belowMinimum,
      unconfirmed: unconfirmed
    };
  }

  /* ------------------------------------------------------------------
     Formatting
     ------------------------------------------------------------------ */
  function money(n, decimals) {
    return '$' + n.toLocaleString('en-US', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  }
  function roundTo(n, to) { return Math.round(n / to) * to; }

  /* ------------------------------------------------------------------
     Build the UI
     ------------------------------------------------------------------ */
  function init() {
    var root = document.querySelector('[data-cookout]');
    if (!root) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var state = {
      guests: CONFIG.guests.start,
      meats: ['ribs', 'pulled-pork'],
      sides: ['mac', 'beans'],
      service: 'dropoff',
      eventType: ''
    };

    /* ---- markup ---- */
    root.innerHTML =
      '<div class="builder">' +
        '<div class="panel">' +

          '<div class="field">' +
            '<div class="field__label">' +
              '<h3>How many guests?</h3>' +
              '<span class="field__hint">' + CONFIG.guests.min + '&ndash;' + CONFIG.guests.max + '</span>' +
            '</div>' +
            '<div class="guests">' +
              '<span class="guests__count" data-guest-out>' + state.guests + '</span>' +
              '<span class="guests__unit">guests</span>' +
            '</div>' +
            '<label class="sr-only" for="ck-guests">Number of guests</label>' +
            '<input type="range" id="ck-guests" data-guests ' +
              'min="' + CONFIG.guests.min + '" max="' + CONFIG.guests.max + '" ' +
              'step="' + CONFIG.guests.step + '" value="' + state.guests + '">' +
          '</div>' +

          '<div class="field">' +
            '<div class="field__label">' +
              '<h3>What kind of event?</h3>' +
              '<span class="field__hint">Optional</span>' +
            '</div>' +
            '<div class="chips" data-events></div>' +
          '</div>' +

          '<div class="field">' +
            '<div class="field__label">' +
              '<h3>Pick your meats</h3>' +
              '<span class="field__hint">Up to ' + CONFIG.maxMeats + '</span>' +
            '</div>' +
            '<div class="chips" data-meats></div>' +
          '</div>' +

          '<div class="field">' +
            '<div class="field__label">' +
              '<h3>Pick your sides</h3>' +
              '<span class="field__hint">Up to ' + CONFIG.maxSides + '</span>' +
            '</div>' +
            '<div class="chips" data-sides></div>' +
          '</div>' +

          '<div class="field">' +
            '<div class="field__label"><h3>How should we serve it?</h3></div>' +
            '<div class="chips" data-service></div>' +
          '</div>' +

        '</div>' +

        '<div class="ticket">' +
          '<div class="ticket__top">' +
            '<p class="ticket__title">Your estimate</p>' +
            '<div class="ticket__range" data-range aria-live="polite">&mdash;</div>' +
            '<p class="ticket__per" data-per></p>' +
            '<p class="ticket__note" data-note></p>' +
          '</div>' +
          '<div class="ticket__body">' +
            '<p class="ticket__title">What that gets you</p>' +
            '<ul class="pans" data-pans></ul>' +
            '<p class="ticket__empty" data-empty hidden>Pick at least one meat to see your cookout.</p>' +
          '</div>' +
          '<div class="ticket__foot">' +
            '<button type="button" class="btn btn--fire" data-send>Send this to Shon</button>' +
            '<p class="ticket__sent" data-send-status role="status" aria-live="polite"></p>' +
            '<p class="ticket__legal">Estimate only &middot; Shon confirms every quote</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* ---- chip builders ---- */
    function chipGroup(host, items, opts) {
      host.innerHTML = items.map(function (it) {
        var id = opts.name + '-' + (it.id || it.replace(/\W+/g, '-').toLowerCase());
        var val = it.id || it;
        var label = it.name || it;
        return '<label class="chip">' +
          '<input type="' + opts.type + '" name="' + opts.name + '" id="' + id + '" value="' + val + '">' +
          '<span>' + label + '</span>' +
        '</label>';
      }).join('');
    }

    var elGuests  = root.querySelector('[data-guests]');
    var elGuestOut= root.querySelector('[data-guest-out]');
    var elMeats   = root.querySelector('[data-meats]');
    var elSides   = root.querySelector('[data-sides]');
    var elService = root.querySelector('[data-service]');
    var elEvents  = root.querySelector('[data-events]');
    var elRange   = root.querySelector('[data-range]');
    var elPer     = root.querySelector('[data-per]');
    var elNote    = root.querySelector('[data-note]');
    var elPans    = root.querySelector('[data-pans]');
    var elEmpty   = root.querySelector('[data-empty]');
    var elSend    = root.querySelector('[data-send]');
    var elSendStatus = root.querySelector('[data-send-status]');

    chipGroup(elMeats,   MEATS,       { name: 'meat',    type: 'checkbox' });
    chipGroup(elSides,   SIDES,       { name: 'side',    type: 'checkbox' });
    chipGroup(elService, SERVICE,     { name: 'service', type: 'radio' });
    chipGroup(elEvents,  EVENT_TYPES, { name: 'event',   type: 'radio' });

    // preselect
    state.meats.forEach(function (id) {
      var i = elMeats.querySelector('input[value="' + id + '"]'); if (i) i.checked = true;
    });
    state.sides.forEach(function (id) {
      var i = elSides.querySelector('input[value="' + id + '"]'); if (i) i.checked = true;
    });
    var svc = elService.querySelector('input[value="' + state.service + '"]');
    if (svc) svc.checked = true;

    /* ---- reading the form ---- */
    function readChecked(host, name) {
      return Array.prototype.slice
        .call(host.querySelectorAll('input[name="' + name + '"]:checked'))
        .map(function (i) { return i.value; });
    }

    function enforceCap(host, name, cap) {
      var checked = readChecked(host, name);
      Array.prototype.slice.call(host.querySelectorAll('input[name="' + name + '"]'))
        .forEach(function (i) {
          i.disabled = !i.checked && checked.length >= cap;
        });
    }

    function sync() {
      state.guests = parseInt(elGuests.value, 10);
      state.meats  = readChecked(elMeats, 'meat');
      state.sides  = readChecked(elSides, 'side');
      state.service = (readChecked(elService, 'service')[0]) || 'dropoff';
      state.eventType = (readChecked(elEvents, 'event')[0]) || '';

      enforceCap(elMeats, 'meat', CONFIG.maxMeats);
      enforceCap(elSides, 'side', CONFIG.maxSides);

      elGuestOut.textContent = state.guests;

      // paint the slider fill
      var pct = ((state.guests - CONFIG.guests.min) / (CONFIG.guests.max - CONFIG.guests.min)) * 100;
      elGuests.style.setProperty('--fill', pct + '%');

      render(calculate(state));
    }

    /* ---- rendering the ticket ---- */
    function render(result) {
      if (!result) {
        elRange.innerHTML = '&mdash;';
        elPer.textContent = '';
        elNote.textContent = '';
        elPans.innerHTML = '';
        elEmpty.hidden = false;
        elSend.disabled = true;
        return;
      }
      elEmpty.hidden = true;
      elSend.disabled = false;

      var low = roundTo(result.low, 25);
      var high = roundTo(result.high, 25);
      elRange.textContent = money(low) + ' – ' + money(high);
      elPer.textContent = 'About ' + money(result.perGuest, 2) + ' a guest · ' + state.guests + ' guests';

      var notes = [];
      if (result.belowMinimum) {
        notes.push('This event is under our ' + money(CONFIG.minimumEvent) + ' catering minimum, so the minimum is what\'s shown.');
      }
      if (result.serviceRate > 0) {
        notes.push('Includes ' + Math.round(result.serviceRate * 100) + '% for ' +
          (state.service === 'full' ? 'setup, serving and cleanup' : 'setup and disposables') + '.');
      }
      elNote.textContent = notes.join(' ');

      elPans.innerHTML = result.builds.map(function (b) {
        var units = b.lines.map(function (l) {
          var out = '';
          for (var i = 0; i < l.qty; i++) {
            out += '<span class="pan__unit pan__unit--' + l.size.unit + '"></span>';
          }
          return out;
        }).join('');

        var qtyText = b.lines.map(function (l) {
          return l.qty + '× ' + l.size.label;
        }).join(' + ');

        return '<li class="pan">' +
          '<span class="pan__name">' + b.item.name + '</span>' +
          '<span class="pan__price">' + money(b.total, 2) + '</span>' +
          '<span class="pan__vis">' + units + '<span class="pan__spacer"></span>' +
            '<span class="pan__qty">' + qtyText + '</span></span>' +
        '</li>';
      }).join('');
    }

    /* ---- hand the build to the quote form ----------------------------
       Every click rewrites the whole build, so changing the cookout and
       pressing the button again always refreshes what the form says.
       Anything typed by hand — name, phone, their own notes — is kept.
       ------------------------------------------------------------------ */

    var BUILD_START = '--- My cookout build ---';
    var BUILD_END = '--- end of build ---';
    var handedOff = false;

    function buildSummary(result) {
      return BUILD_START + '\n' +
        state.guests + ' guests' + (state.eventType ? ' \u00b7 ' + state.eventType : '') + '\n' +
        (state.service === 'full' ? 'Full Service' : 'Drop-off') + '\n' +
        result.builds.map(function (b) {
          return '\u2022 ' + b.item.name + ' \u2014 ' + b.lines.map(function (l) {
            return l.qty + '\u00d7 ' + l.size.label;
          }).join(' + ');
        }).join('\n') + '\n' +
        'Estimate shown: ' + money(roundTo(result.low, 25)) + ' \u2013 ' +
        money(roundTo(result.high, 25)) + '\n' + BUILD_END;
    }

    /* Take out whatever build is already in the box so the new one
       replaces it rather than stacking on top.

       Three shapes have to be recognised: the marked block written by
       this code, a marked block whose end marker the visitor deleted,
       and the older unmarked summary written before the markers existed
       — anyone who used the builder before this change still has one of
       those sitting in their form. */
    var LEGACY_START = 'Built with the cookout estimator:';
    var TAIL = 'Estimate shown:';

    function cutThroughTail(text, from) {
      var tail = text.indexOf(TAIL, from);
      if (tail < 0) return text.slice(0, from);
      var lineEnd = text.indexOf('\n', tail);
      return text.slice(0, from) + (lineEnd < 0 ? '' : text.slice(lineEnd + 1));
    }

    function removeOldBuild(text) {
      var from = text.indexOf(BUILD_START);
      if (from > -1) {
        var to = text.indexOf(BUILD_END, from);
        return to > from
          ? text.slice(0, from) + text.slice(to + BUILD_END.length)
          : cutThroughTail(text, from);
      }
      from = text.indexOf(LEGACY_START);
      return from > -1 ? cutThroughTail(text, from) : text;
    }

    /* Briefly outline a field so a repeat click visibly does something. */
    var flashTimers = [];
    function flash(field) {
      if (!field) return;
      field.classList.add('is-updated');
      flashTimers.push(window.setTimeout(function () {
        field.classList.remove('is-updated');
      }, 1500));
    }

    elSend.addEventListener('click', function () {
      var result = calculate(state);
      if (!result) return;

      var form = document.querySelector('[data-quote-form]');
      if (!form) return;

      flashTimers.forEach(window.clearTimeout);
      flashTimers = [];

      function set(name, value) {
        var f = form.querySelector('[name="' + name + '"]');
        if (!f) return;
        f.value = value;
        flash(f);
      }

      var range = money(roundTo(result.low, 25)) + ' \u2013 ' + money(roundTo(result.high, 25));

      set('guests', state.guests);
      set('service_style', state.service === 'full' ? 'Full Service' : 'Drop-off');
      set('budget', range);
      set('menu_interest', result.builds.map(function (b) { return b.item.name; }).join(', '));

      /* Only overwrite the event type when the builder has one, so a
         choice made directly in the form isn't wiped out. */
      if (state.eventType) set('event_type', state.eventType);

      /* The summary is a managed block between two markers. Replace it
         where it already exists, otherwise put it above whatever they
         have written. Either way it is rewritten on every click. */
      var notes = form.querySelector('[name="message"]');
      if (notes) {
        var summary = buildSummary(result);
        var existing = removeOldBuild(notes.value);

        notes.value = existing.trim() ? summary + '\n\n' + existing.trim() : summary;
        flash(notes);
      }

      if (elSendStatus) {
        elSendStatus.textContent = handedOff
          ? 'Request below updated'
          : 'Sent to the request below';
        flashTimers.push(window.setTimeout(function () {
          elSendStatus.textContent = '';
        }, 4000));
      }

      var target = document.getElementById('quote');
      if (target) {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        /* Only take focus the first time, so a repeat click doesn't yank
           the cursor out of a field they are part-way through typing. */
        if (!handedOff) {
          var first = form.querySelector('input:not([type="hidden"])');
          window.setTimeout(function () {
            if (first) first.focus({ preventScroll: true });
          }, 550);
        }
      }

      handedOff = true;
    });

    /* ---- listeners ---- */
    elGuests.addEventListener('input', sync);
    [elMeats, elSides, elService, elEvents].forEach(function (host) {
      host.addEventListener('change', sync);
    });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
