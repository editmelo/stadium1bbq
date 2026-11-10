/* GET /api/menu — the orderable pop-up items, for the page to render from.
   Serving it rather than hardcoding it in the page means the prices on
   screen are always the prices /api/checkout will charge. */

'use strict';

const { SIDES, MEATS, ITEMS, MAX_QTY } = require('./_catalog');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET' });
  }
  /* Whether checkout can actually complete. The page asks before it
     draws a cart, so a missing token shows an honest notice rather than
     a working-looking cart that dead-ends at the pay button. */
  const ordering = Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);

  /* Short cache: the menu changes rarely, but a price edit should land
     the same day rather than sitting in a CDN for a week. Private and
     brief, because `ordering` flips the moment the env vars are set and
     a week-old "closed" in a CDN would be its own outage. */
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  return res.status(200).json({
    ordering, sides: SIDES, meats: MEATS, items: ITEMS, maxQty: MAX_QTY
  });
};
