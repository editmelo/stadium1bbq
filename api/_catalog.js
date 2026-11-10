/* ==========================================================================
   Pop-up ordering catalog — the one place prices live.

   /api/menu serves this to the browser so the page renders from it, and
   /api/checkout prices every order against it. The browser never gets to
   say what anything costs: it sends ids and choices, the server looks up
   the money. That is the whole reason this file is shared rather than
   copied into the page.

   Prices are integer cents, which is what Square's API takes.
   Source: "Current Menu for Pop Up Events" flyer (Sept 2026).
   ========================================================================== */

'use strict';

/* The five sides on the flyer. */
const SIDES = [
  { id: 'mac',      name: 'Mac & Cheese' },
  { id: 'beans',    name: 'Baked Beans' },
  { id: 'corn',     name: 'Smoked Skillet Corn' },
  { id: 'mashed',   name: 'Mashed Potatoes' },
  { id: 'veg',      name: 'Smoked Mixed Vegetables' }
];

/* Slider and bowl meats, from the ribbon-cutting menu board. */
const MEATS = [
  { id: 'pulled-chicken', name: 'Pulled Chicken' },
  { id: 'pulled-pork',    name: 'Pulled Pork' },
  { id: 'brisket',        name: 'Brisket' }
];

/* `choices` drives the UI and is validated again on the server.
   kind 'side' or 'meat', `pick` is exactly how many must be chosen. */
const ITEMS = [
  { id: 'plate-tips',   name: 'Rib Tips Plate',          price: 2000,
    blurb: 'Rib tips and two sides.',
    choices: [{ key: 'sides', kind: 'side', pick: 2 }] },

  { id: 'plate-wings',  name: '6 Wings',                 price: 2000,
    blurb: 'Six wings and two sides.',
    choices: [{ key: 'sides', kind: 'side', pick: 2 }] },

  { id: 'sliders-2-2',  name: '2 Sliders & 2 Sides',     price: 2000,
    blurb: 'Two sliders and two sides.',
    choices: [{ key: 'meat', kind: 'meat', pick: 1 },
              { key: 'sides', kind: 'side', pick: 2 }] },

  { id: 'bowl',         name: 'Build Your Own Bowl',     price: 1500,
    blurb: 'Your meat over your side.',
    choices: [{ key: 'meat', kind: 'meat', pick: 1 },
              { key: 'sides', kind: 'side', pick: 1 }] },

  { id: 'brat',         name: 'Brat or Street Polish',   price: 1500,
    blurb: 'With one side. Red Hot Polish available — ask at the tent.',
    choices: [{ key: 'sides', kind: 'side', pick: 1 }] },

  { id: 'sliders-2-1',  name: '2 Sliders & 1 Side',      price: 1500,
    blurb: 'Two sliders and one side.',
    choices: [{ key: 'meat', kind: 'meat', pick: 1 },
              { key: 'sides', kind: 'side', pick: 1 }] }
];

/* Square caps a line item quantity at 12. */
const MAX_QTY = 12;
/* Keeps a single order from running away; raise it if real orders need more. */
const MAX_LINES = 20;

const byId = (list, id) => list.find(x => x.id === id);

/* Turn one cart line into a priced Square line item, or throw.
   Everything the browser sent is treated as untrusted. */
function priceLine(line) {
  const item = byId(ITEMS, String(line && line.id));
  if (!item) throw new Error('Unknown item');

  const qty = Number(line.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new Error('Quantity for ' + item.name + ' must be 1 to ' + MAX_QTY);
  }

  /* Every declared choice must be present, the right length, and real. */
  const parts = [];
  for (const choice of item.choices) {
    const source = choice.kind === 'side' ? SIDES : MEATS;
    const picked = Array.isArray(line.choices && line.choices[choice.key])
      ? line.choices[choice.key]
      : [];

    if (picked.length !== choice.pick) {
      throw new Error(item.name + ' needs exactly ' + choice.pick + ' ' +
        choice.kind + (choice.pick === 1 ? '' : 's'));
    }
    const names = picked.map(id => {
      const found = byId(source, String(id));
      if (!found) throw new Error('Unknown ' + choice.kind + ' on ' + item.name);
      return found.name;
    });
    /* Two of the same side is a real order, so duplicates are allowed. */
    parts.push(names.join(', '));
  }

  return {
    name: item.name.slice(0, 512),
    quantity: String(qty),
    base_price_money: { amount: item.price, currency: 'USD' },
    note: parts.join(' · ').slice(0, 2000)
  };
}

function priceOrder(cart) {
  if (!Array.isArray(cart) || cart.length === 0) throw new Error('Your cart is empty');
  if (cart.length > MAX_LINES) throw new Error('Too many items in one order');

  const lineItems = cart.map(priceLine);
  const total = cart.reduce(
    (sum, line) => sum + byId(ITEMS, String(line.id)).price * Number(line.qty), 0);
  return { lineItems, total };
}

module.exports = { SIDES, MEATS, ITEMS, MAX_QTY, MAX_LINES, priceLine, priceOrder };
