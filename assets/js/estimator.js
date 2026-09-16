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
    // Smallest total you'll take for a catered event.
    // NOT in the catering list — inferred from the packet. Confirm with Shon.
    minimumEvent: 800,

    // Service costs, from Shon's catering list.
    serverFee: 25,             // per server, full service only
    guestsPerServer: 50,       // ASSUMPTION — one server per 50 guests. Confirm with Shon.
    plates: { price: 49.99, guests: 25 },   // Plates & Utensils Pack, 25 settings
    delivery: { low: 25, high: 200 },    // delivery fee tiers, by distance

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
     MENU — Shon's catering prices, from her Square catalog (Sept 2026).
     `serves` is how many people one of that size feeds. Sizes are
     listed largest first. Brisket's 16 lb size is two 8 lb, so the
     builder uses 8/4/2 and the menu page shows all four.

     These must match menu/index.html. Both are generated from the same
     price list — change a price in one, change it in the other.
     ------------------------------------------------------------------ */
  var MEATS = [
    { id: 'ribs', name: 'Ribs', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 259.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 139.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 79.99, serves: 8, unit: 'third' }
    ]},
    { id: 'st-louis-ribs', name: 'St. Louis Style Ribs', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 8, unit: 'third' }
    ]},
    { id: 'rib-tips', name: 'Rib Tips', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 219.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 129.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 8, unit: 'third' }
    ]},
    { id: 'brisket', name: 'Brisket', group: 'Smoked & grilled', sizes: [
      { label: '8 lbs', price: 399.99, serves: 24, unit: 'lb' },
      { label: '4 lbs', price: 199.99, serves: 12, unit: 'lb' },
      { label: '2 lbs', price: 99.99, serves: 6, unit: 'lb' }
    ]},
    { id: 'pulled-pork', name: 'Pulled Pork', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'pulled-chicken', name: 'Pulled Chicken', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'chicken-chunks', name: 'Grilled Chicken Chunks', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 209.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 129.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'beef-bites', name: 'Beef Bites', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 219.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'steak-bites', name: 'Steak Bites', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 8, unit: 'third' }
    ]},
    { id: 'smoked-turkey', name: 'Smoked Turkey', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 299.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 199.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'smoked-sausage', name: 'Smoked Sausage', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 129.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 65.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 25.99, serves: 8, unit: 'third' }
    ]},
    { id: 'turkey-bites', name: 'Turkey Bites', group: 'Smoked & grilled', sizes: [
      { label: 'Full Pan', price: 129.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 65.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 29.99, serves: 8, unit: 'third' }
    ]},
    { id: 'chicken', name: 'Chicken', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' }
    ]},
    { id: 'pork-chops', name: 'Pork Chops', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'chicken-dressing', name: 'Chicken & Dressing', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 229.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 129.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 8, unit: 'third' }
    ]},
    { id: 'meatloaf', name: 'Meatloaf', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'spaghetti', name: 'Spaghetti', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 8, unit: 'third' }
    ]},
    { id: 'meatballs', name: 'Meatballs', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 129.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 8, unit: 'third' }
    ]},
    { id: 'white-chili', name: 'White Chicken Chili', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 8, unit: 'third' }
    ]},
    { id: 'plant-chicken', name: 'Plant-Based Chicken', group: 'Comfort mains', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]},
    { id: 'catfish', name: 'Catfish', group: 'Seafood', sizes: [
      { label: 'Full Pan', price: 239.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 119.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 8, unit: 'third' }
    ]},
    { id: 'perch', name: 'Perch', group: 'Seafood', sizes: [
      { label: 'Full Pan', price: 239.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 119.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 8, unit: 'third' }
    ]},
    { id: 'cod', name: 'Cod', group: 'Seafood', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 24, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 12, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 8, unit: 'third' }
    ]}
  ];

  var SIDES = [
    { id: 'mac', name: 'Mac & Cheese', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 220.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 69.99, serves: 10, unit: 'third' }
    ]},
    { id: 'vegan-mac', name: 'Vegan Mac & Cheese', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 210.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 10, unit: 'third' }
    ]},
    { id: 'mashed', name: 'Mashed Potatoes', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 109.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 59.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'potato-salad', name: 'Potato Salad', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 10, unit: 'third' }
    ]},
    { id: 'vegan-potato', name: 'Vegan Potato Salad', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 159.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 79.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'yams', name: 'Candied Yams', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 109.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 45.99, serves: 10, unit: 'third' }
    ]},
    { id: 'sweet-potatoes', name: 'Sweet Potatoes', group: 'Mac & potatoes', sizes: [
      { label: 'Full Pan', price: 159.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 79.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'beans', name: 'Baked Beans', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 25.99, serves: 10, unit: 'third' }
    ]},
    { id: 'green-beans', name: 'Green Beans', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 129.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'smothered-beans', name: 'Smothered Green Beans', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 159.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 79.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'vegan-beans', name: 'Vegan Green Beans', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 119.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 59.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'greens', name: 'Greens', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 10, unit: 'third' }
    ]},
    { id: 'cabbage', name: 'Cabbage', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'dirty-cabbage', name: 'Dirty Cabbage', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'corn', name: 'Corn on the Cob', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 109.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 59.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 35.99, serves: 10, unit: 'third' }
    ]},
    { id: 'mixed-veg', name: 'Mixed Vegetables', group: 'Beans & greens', sizes: [
      { label: 'Full Pan', price: 109.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 59.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'smoked-rice', name: 'Smoked Rice', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 119.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'dirty-rice', name: 'Dirty Rice', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 199.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 99.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 49.99, serves: 10, unit: 'third' }
    ]},
    { id: 'slaw', name: 'Cole Slaw', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 109.0, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 69.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 39.99, serves: 10, unit: 'third' }
    ]},
    { id: 'garden-salad', name: 'Garden Salad', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 25.99, serves: 10, unit: 'third' }
    ]},
    { id: 'fruit', name: 'Fruit', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 99.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 25.99, serves: 10, unit: 'third' }
    ]},
    { id: 'deviled-eggs', name: 'Deviled Eggs', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 89.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 49.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 29.99, serves: 10, unit: 'third' }
    ]},
    { id: 'cornbread', name: 'Cornbread', group: 'Rice, salads & bread', sizes: [
      { label: 'Full Pan', price: 159.99, serves: 30, unit: 'full' },
      { label: '1/2 Pan',  price: 109.99, serves: 15, unit: 'half' },
      { label: '1/3 Pan',  price: 59.99, serves: 10, unit: 'third' }
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

    var belowMinimum = base < CONFIG.minimumEvent;
    var mid = Math.max(base, CONFIG.minimumEvent);

    // Delivery runs from the lowest fee to the highest, so it widens the
    // range rather than being guessed. The bottom never dips under the
    // minimum, so a growing event can never look cheaper.
    var low = Math.max(CONFIG.minimumEvent, base * (1 - CONFIG.rangeSpread) + CONFIG.delivery.low);
    var high = Math.max(low, mid * (1 + CONFIG.rangeSpread) + CONFIG.delivery.high);

    return {
      builds: builds,
      extras: extras,
      food: food,
      low: low,
      high: high,
      perGuest: mid / state.guests,
      belowMinimum: belowMinimum
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
      if (result.belowMinimum) {
        notes.push('This event is under our ' + money(CONFIG.minimumEvent) + ' catering minimum, so the minimum is what\'s shown.');
      }
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
