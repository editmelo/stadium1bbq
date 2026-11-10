/* ==========================================================================
   POST /api/checkout

   Takes a cart of item ids, quantities and choices, prices it against
   _catalog.js, and asks Square for a payment link carrying those exact
   line items. Returns the link; the browser sends the customer there.

   The browser never sends prices and is never believed about them. It
   sends ids; this file looks up the money. A cart that claims a $20
   plate costs a penny is priced at $20 regardless.

   Environment (set these in Vercel, never in the repo):
     SQUARE_ACCESS_TOKEN   production or sandbox access token
     SQUARE_LOCATION_ID    the location the order belongs to
     SQUARE_ENV            "sandbox" or "production" (default: sandbox)
     SITE_ORIGIN           optional, e.g. https://www.stadium1bbq.com
   ========================================================================== */

'use strict';

const { priceOrder } = require('./_catalog');

const SQUARE_VERSION = '2026-09-16';
const HOSTS = {
  sandbox: 'https://connect.squareupsandbox.com',
  production: 'https://connect.squareup.com'
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { throw new Error('Malformed request'); }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const env = process.env.SQUARE_ENV === 'production' ? 'production' : 'sandbox';

  /* Said plainly so the page can show something honest rather than a
     generic failure while the credentials are still outstanding. */
  if (!token || !locationId) {
    return res.status(503).json({
      error: 'Online ordering is not switched on yet.',
      detail: 'SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID are not set on the server.'
    });
  }

  let lineItems, total;
  try {
    const body = readBody(req);
    const priced = priceOrder(body.cart);
    lineItems = priced.lineItems;
    total = priced.total;
  } catch (err) {
    /* Anything priceOrder rejects is the cart's fault, not Square's. */
    return res.status(400).json({ error: err.message || 'That order could not be read.' });
  }

  const origin = process.env.SITE_ORIGIN ||
    (req.headers && req.headers.origin) || 'https://www.stadium1bbq.com';

  const payload = {
    idempotency_key: (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2),
    order: { location_id: locationId, line_items: lineItems },
    checkout_options: {
      redirect_url: origin.replace(/\/+$/, '') + '/order-confirmed',
      ask_for_shipping_address: false,   /* pickup, so no address */
      allow_tipping: true
    }
  };

  let response, data;
  try {
    response = await fetch(HOSTS[env] + '/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION
      },
      body: JSON.stringify(payload)
    });
    data = await response.json();
  } catch {
    return res.status(502).json({ error: 'Could not reach Square. Please try again.' });
  }

  if (!response.ok || !data || !data.payment_link || !data.payment_link.url) {
    /* Square's own wording is useful to us but not to a hungry customer,
       so it goes to the log and a plain sentence goes to the page. */
    console.error('Square rejected the payment link:', response.status,
                  JSON.stringify(data && data.errors));
    return res.status(502).json({ error: 'Square could not start this order. Please try again.' });
  }

  return res.status(200).json({
    url: data.payment_link.url,
    orderId: data.payment_link.order_id,
    total
  });
};
