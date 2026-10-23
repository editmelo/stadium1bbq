/* ==========================================================================
   Build Your Cookout — live catering estimator
   Stadium 1 BBQ & More

   HOW THE ESTIMATE WORKS
   ----------------------
   Every number below comes from Stadium 1's real catering price list
   (pan pricing). The estimator works out how many pans an event needs,
   prices those pans, adds plates and servers at Shon's rates, applies
   the event minimum, and shows a range that covers delivery.

   TO CHANGE PRICES: edit CONFIG and MENU below. Nothing else needs to move.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — Shon, these are the only numbers you need to touch.
     ------------------------------------------------------------------ */
  var CONFIG = {
    // Smallest event Shon will take, in guests.
    minimumGuests: 25,

    // Service costs, from Shon's catering list.
    serverFee: 25,             // per server, full service only
    guestsPerServer: 50,       // ASSUMPTION — one server per 50 guests. Confirm with Shon.
    plates: { price: 49.99, guests: 25 },   // Plates & Utensils Pack, 25 settings
    delivery: { low: 25, high: 200 },    // delivery fee tiers, by distance

    // How wide the quoted range is around the calculated figure (±).
    rangeSpread: 0.12,

    // Guest slider
    guests: { min: 25, max: 400, step: 5, start: 150 },

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
     MENU — Shon's catering prices, October 2026.

     Source: the "Customer-Facing A La Carte Prices" sheet. Twenty-five
     items, half pan and full pan only, and every full pan is exactly
     twice the half. Her note with the sheet: "These will be the only
     items that need to be on the site."

     `serves` is how many people one pan feeds. That part is not on the
     sheet — a half pan is taken as 12 for an entrée and 15 for a side,
     and a 6 qt pot as 24 eight-ounce servings.

     These must match menu/index.html. Both are generated from one
     transcription of the sheet — change a price in one, change it in
     the other.
     ------------------------------------------------------------------ */
  var MEATS = [
    { id: 'smoked-turkey', name: 'Smoked Turkey', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 150.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 75.0, serves: 12, unit: 'half' }
    ]},
    { id: 'pulled-pork', name: 'Pulled Pork', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 160.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 80.0, serves: 12, unit: 'half' }
    ]},
    { id: 'pulled-chicken', name: 'Pulled Chicken', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 140.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 70.0, serves: 12, unit: 'half' }
    ]},
    { id: 'rib-tips', name: 'Rib Tips', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 230.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 115.0, serves: 12, unit: 'half' }
    ]},
    { id: 'beef-bites', name: 'Beef Bites', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 280.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 140.0, serves: 12, unit: 'half' }
    ]},
    { id: 'chicken-dressing', name: 'Chicken & Dressing', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 300.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 150.0, serves: 12, unit: 'half' }
    ]},
    { id: 'wings', name: 'Wings', group: 'Entrées', sizes: [
      { label: 'Full Pan', price: 250.0, serves: 24, unit: 'full' },
      { label: 'Half Pan', price: 125.0, serves: 12, unit: 'half' }
    ]},
    { id: 'brisket-chili', name: 'Brisket Chili', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 360.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 180.0, serves: 24, unit: 'half' }
    ]},
    { id: 'traditional-chili', name: 'Traditional Chili', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 300.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 150.0, serves: 24, unit: 'half' }
    ]},
    { id: 'chicken-chowder', name: 'Chicken Corn Chowder', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 250.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 125.0, serves: 24, unit: 'half' }
    ]},
    { id: 'white-chili', name: 'White Chicken Chili', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 250.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 125.0, serves: 24, unit: 'half' }
    ]},
    { id: 'corn-chowder', name: 'Corn Chowder', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 210.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 105.0, serves: 24, unit: 'half' }
    ]},
    { id: 'jambalaya', name: 'Chicken Jambalaya', group: 'Fall & winter', sizes: [
      { label: 'Full Pan', price: 290.0, serves: 48, unit: 'full' },
      { label: 'Half Pan', price: 145.0, serves: 24, unit: 'half' }
    ]}
  ];

  var SIDES = [
    { id: 'mac', name: 'Mac & Cheese', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 200.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 100.0, serves: 15, unit: 'half' }
    ]},
    { id: 'mashed', name: 'Mashed Potatoes', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 90.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 45.0, serves: 15, unit: 'half' }
    ]},
    { id: 'rice', name: 'Seasoned Rice', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 80.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 40.0, serves: 15, unit: 'half' }
    ]},
    { id: 'normandy', name: 'Normandy Vegetables', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 110.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 55.0, serves: 15, unit: 'half' }
    ]},
    { id: 'green-beans', name: 'Green Beans', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 120.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 60.0, serves: 15, unit: 'half' }
    ]},
    { id: 'baked-beans', name: 'Baked Beans', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 130.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 65.0, serves: 15, unit: 'half' }
    ]},
    { id: 'sweet-potatoes', name: 'Sweet Potatoes', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 140.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 70.0, serves: 15, unit: 'half' }
    ]},
    { id: 'skillet-corn', name: 'Skillet Corn', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 170.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 85.0, serves: 15, unit: 'half' }
    ]},
    { id: 'dressing', name: 'Dressing', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 200.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 100.0, serves: 15, unit: 'half' }
    ]},
    { id: 'greens', name: 'Southern-Style Greens', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 280.0, serves: 30, unit: 'full' },
      { label: 'Half Pan', price: 140.0, serves: 15, unit: 'half' }
    ]},
    { id: 'gravy', name: 'Gravy', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 80.0, serves: 60, unit: 'full' },
      { label: 'Half Pan', price: 40.0, serves: 30, unit: 'half' }
    ]},
    { id: 'cornbread', name: 'Cornbread', group: 'Sides', sizes: [
      { label: 'Full Pan', price: 120.0, serves: 60, unit: 'full' },
      { label: 'Half Pan', price: 60.0, serves: 30, unit: 'half' }
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

    // Service, priced the way Shon charges it rather than as a percentage.
    var extras = [];
    if (state.plates) {
      var packs = Math.ceil(state.guests / CONFIG.plates.guests);
      extras.push({ name: 'Plates & Utensils', detail: packs + '\u00d7 25-guest pack',
                    total: Math.round(packs * CONFIG.plates.price) });
    }
    if (state.service === 'full') {
      var servers = Math.max(1, Math.ceil(state.guests / CONFIG.guestsPerServer));
      extras.push({ name: 'Servers', detail: servers + '\u00d7 server',
                    total: servers * CONFIG.serverFee });
    }
    var extrasTotal = extras.reduce(function (sum, e) { return sum + e.total; }, 0);
    var base = food + extrasTotal;

    // No dollar minimum any more — Shon's floor is 25 guests, which the
    // slider already enforces, so the quote is simply what it costs.
    var low = base * (1 - CONFIG.rangeSpread) + CONFIG.delivery.low;
    var high = Math.max(low, base * (1 + CONFIG.rangeSpread) + CONFIG.delivery.high);

    return {
      builds: builds,
      extras: extras,
      food: food,
      low: low,
      high: high,
      perGuest: base / state.guests
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
      meats: ['rib-tips', 'pulled-pork'],
      sides: ['mac', 'baked-beans'],
      service: 'dropoff',
      plates: true,
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
            '<div class="chips chips--extra">' +
              '<label class="chip">' +
                '<input type="checkbox" id="ck-plates" data-plates checked>' +
                '<span>Add plates &amp; utensils</span>' +
              '</label>' +
            '</div>' +
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
    function esc(t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    function chipGroup(host, items, opts) {
      var lastGroup = null;
      host.innerHTML = items.map(function (it) {
        var id = opts.name + '-' + (it.id || it.replace(/\W+/g, '-').toLowerCase());
        var val = it.id || it;
        var label = it.name || it;
        var heading = '';
        if (it.group && it.group !== lastGroup) {
          heading = '<p class="chips__group">' + esc(it.group) + '</p>';
          lastGroup = it.group;
        }
        return heading + '<label class="chip">' +
          '<input type="' + opts.type + '" name="' + opts.name + '" id="' + id + '" value="' + val + '">' +
          '<span>' + esc(label) + '</span>' +
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
    var elPlates  = root.querySelector('[data-plates]');

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
      state.plates = elPlates.checked;

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
      notes.push('Includes delivery, ' + money(CONFIG.delivery.low) + '\u2013' +
        money(CONFIG.delivery.high) + ' depending on distance.');
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
          '<span class="pan__name">' + esc(b.item.name) + '</span>' +
          '<span class="pan__price">' + money(b.total, 2) + '</span>' +
          '<span class="pan__vis">' + units + '<span class="pan__spacer"></span>' +
            '<span class="pan__qty">' + qtyText + '</span></span>' +
        '</li>';
      }).join('') + result.extras.map(function (e) {
        return '<li class="pan pan--extra">' +
          '<span class="pan__name">' + esc(e.name) + '</span>' +
          '<span class="pan__price">' + money(e.total, 2) + '</span>' +
          '<span class="pan__qty">' + esc(e.detail) + '</span>' +
        '</li>';
      }).join('');
    }

    /* ---- hand the build to the quote form ----------------------------
       Every click rewrites the whole build, so changing the cookout and
       pressing the button again always refreshes what the form says.
       Anything typed by hand — name, phone, their own notes — is kept.
       ------------------------------------------------------------------ */

    var BUILD_HEADER = 'MY COOKOUT BUILD';
    var BUILD_FOOT = '---';
    var handedOff = false;

    function buildSummary(result) {
      return BUILD_HEADER + '\n' +
        state.guests + ' guests' + (state.eventType ? ' \u00b7 ' + state.eventType : '') + '\n' +
        (state.service === 'full' ? 'Full Service' : 'Drop-off') + '\n' +
        result.builds.map(function (b) {
          return '\u2022 ' + b.item.name + ' \u2014 ' + b.lines.map(function (l) {
            return l.qty + '\u00d7 ' + l.size.label;
          }).join(' + ');
        }).join('\n') + '\n' +
        result.extras.map(function (e) {
          return '\u2022 ' + e.name + ' \u2014 ' + e.detail;
        }).join('\n') + (result.extras.length ? '\n' : '') +
        'Estimate shown: ' + money(roundTo(result.low, 25)) + ' \u2013 ' +
        money(roundTo(result.high, 25)) + '\n' + BUILD_FOOT;
    }

    /* Take out whatever build is already in the box so the new one
       replaces it rather than stacking on top.

       The block runs from its heading to a line holding nothing but
       three dashes. Matching a whole line rather than the characters
       anywhere means a stray "---" inside a sentence is not mistaken
       for the end.

       Everything after that is a fallback for a block whose closing rule
       has been deleted, and for the two shapes written before this
       format existed — anyone who used the builder earlier still has one
       of those sitting in their form. */
    var END_RULE = /^[ \t]*---[ \t]*$/m;
    var OLD_HEADERS = ['--- My cookout build ---', 'Built with the cookout estimator:'];
    var OLD_END = '--- end of build ---';
    var TAIL = 'Estimate shown:';

    function blockEnd(text, from) {
      // Start looking below the heading, so a fenced old heading that
      // itself contains dashes cannot match as the closing rule.
      var headingEnd = text.indexOf('\n', from);
      if (headingEnd === -1) return text.length;
      var searchFrom = headingEnd + 1;

      var rule = END_RULE.exec(text.slice(searchFrom));
      if (rule) {
        var lineEnd = text.indexOf('\n', searchFrom + rule.index);
        return lineEnd === -1 ? text.length : lineEnd;
      }

      var blank = text.indexOf('\n\n', searchFrom);

      var fence = text.indexOf(OLD_END, searchFrom);
      if (fence > -1 && (blank === -1 || fence < blank)) return fence + OLD_END.length;

      if (blank > -1) return blank;

      var tail = text.indexOf(TAIL, searchFrom);
      if (tail > -1) {
        var t = text.indexOf('\n', tail);
        return t === -1 ? text.length : t;
      }
      return text.length;
    }

    function removeOldBuild(text) {
      var headers = [BUILD_HEADER].concat(OLD_HEADERS);
      for (var i = 0; i < headers.length; i++) {
        var from = text.indexOf(headers[i]);
        if (from > -1) return text.slice(0, from) + text.slice(blockEnd(text, from));
      }
      return text;
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
    elPlates.addEventListener('change', sync);

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
