/* Local stand-in for Vercel: static files with clean URLs, plus the real
   api/*.js handlers behind a Vercel-shaped res shim and a stubbed Square. */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const PORT = Number(process.argv[3] || 8787);

/* Square stand-in: the real checkout.js calls global fetch. */
const realFetch = global.fetch;
global.fetch = async function (url, opts) {
  if (String(url).includes('/__apps_script')) {
    /* Stands in for the Apps Script web app: records what arrived so the
       tests can inspect it, and can be told to fail on demand. */
    lastForm = JSON.parse(opts.body);
    if (formsMode === 'fail') {
      return { ok: true, status: 200, json: async () => ({ ok: false, message: 'Sheet unavailable' }) };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, message: 'Received' }) };
  }
  if (String(url).includes('/v2/online-checkout/payment-links')) {
    const body = JSON.parse(opts.body);
    lastSquarePayload = body;
    return {
      ok: true, status: 200,
      json: async () => ({ payment_link: {
        url: 'http://localhost:' + PORT + '/fake-square?total=' + body.order.line_items.length,
        order_id: 'ORDER_STUB_1'
      } })
    };
  }
  return realFetch(url, opts);
};
let lastSquarePayload = null;
let lastForm = null;
let formsMode = 'ok';            /* 'ok' | 'fail' | 'unconfigured' */

process.env.SQUARE_ACCESS_TOKEN = 'STUB_TOKEN';
process.env.SQUARE_LOCATION_ID  = 'STUB_LOCATION';
process.env.SQUARE_ENV          = 'sandbox';
process.env.FORMS_ENDPOINT      = 'https://script.google.com/__apps_script/exec';
process.env.FORMS_SECRET        = 'STUB_FORMS_SECRET';
/* The real default is 3/min. The suite fires far more than that from one
   address, so it is raised here and lowered deliberately by the test that
   actually checks the limit. */
process.env.FORMS_RATE_LIMIT    = '500';

const menu     = require(path.join(ROOT, 'api/menu.js'));
const checkout = require(path.join(ROOT, 'api/checkout.js'));
let   contact  = require(path.join(ROOT, 'api/contact.js'));

const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg',
  '.svg':'image/svg+xml', '.json':'application/json', '.xml':'application/xml',
  '.txt':'text/plain; charset=utf-8', '.webp':'image/webp' };

function shim(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);

  if (p === '/api/menu')     return menu(req, shim(res));
  if (p === '/api/checkout') {
    let raw = '';
    for await (const c of req) raw += c;
    req.body = raw;
    return checkout(req, shim(res));
  }
  if (p === '/api/contact') {
    let raw = '';
    for await (const c of req) raw += c;
    req.body = raw;
    /* 'unconfigured' reproduces the state before the Apps Script URL is
       set, which is what the live site is in until Lauren hooks it up. */
    const keep = [process.env.FORMS_ENDPOINT, process.env.FORMS_SECRET];
    if (formsMode === 'unconfigured') {
      delete process.env.FORMS_ENDPOINT; delete process.env.FORMS_SECRET;
    }
    try { return await contact(req, shim(res)); }
    finally { process.env.FORMS_ENDPOINT = keep[0]; process.env.FORMS_SECRET = keep[1]; }
  }
  if (p === '/__forms_last') { shim(res).status(200).json(lastForm || {}); return; }
  if (p === '/__forms_ratelimit') {
    process.env.FORMS_RATE_LIMIT = url.searchParams.get('n') || '500';
    /* The limiter keeps its counts in module scope, and every request in
       this suite comes from the same address, so earlier tests would
       otherwise have already used the quota. Reloading gives the rate
       limit test a clean slate instead of a poisoned one. */
    delete require.cache[require.resolve(path.join(ROOT, 'api/contact.js'))];
    contact = require(path.join(ROOT, 'api/contact.js'));
    shim(res).status(200).json({ limit: process.env.FORMS_RATE_LIMIT });
    return;
  }
  if (p === '/__forms_mode') {
    formsMode = url.searchParams.get('mode') || 'ok';
    shim(res).status(200).json({ mode: formsMode });
    return;
  }
  if (p === '/__square_payload') { shim(res).status(200).json(lastSquarePayload || {}); return; }
  if (p === '/fake-square') {
    /* Stands in for Square's hosted payment page so the flow can be walked
       end to end with no credentials and no real money. It shows exactly
       what the server asked Square to charge for. */
    const li = (lastSquarePayload && lastSquarePayload.order.line_items) || [];
    const total = li.reduce((s, l) => s + l.base_price_money.amount * Number(l.quantity), 0);
    const rows = li.map(function (l) {
      const money = '$' + (l.base_price_money.amount * Number(l.quantity) / 100).toFixed(2);
      return '<li><span>' + l.quantity + '&times; ' + l.name +
             '<br><small>' + (l.note || '') + '</small></span><span>' + money + '</span></li>';
    }).join('');
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Stand-in for Square</title><style>' +
'body{margin:0;background:#0c0908;color:#f7efe2;font:16px/1.5 system-ui,sans-serif;' +
'display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}' +
'.box{max-width:460px;width:100%;background:#16100d;border:1px solid rgba(255,138,31,.3);' +
'border-radius:14px;padding:28px}' +
'h1{font-size:1.1rem;margin:0 0 6px;color:#ffc02e}' +
'p.sub{margin:0 0 22px;color:#a2938a;font-size:.9rem}' +
'ul{list-style:none;margin:0 0 4px;padding:0}' +
'li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;' +
'border-bottom:1px dashed rgba(247,239,226,.16);font-size:.92rem}' +
'li small{color:#968779}' +
'li span:last-child{color:#ffc02e;font-variant-numeric:tabular-nums;white-space:nowrap}' +
'.tot{display:flex;justify-content:space-between;font-weight:700;font-size:1.15rem;margin:16px 0 20px}' +
'.note{font-size:.78rem;color:#968779;line-height:1.55}a{color:#ffc02e}' +
'</style></head><body><div class="box">' +
'<h1 id="sq">This is where Square&rsquo;s payment page opens</h1>' +
'<p class="sub">Local demo &mdash; no real card, no real charge.</p>' +
'<ul>' + rows + '</ul>' +
'<div class="tot"><span>Total</span><span>$' + (total / 100).toFixed(2) + '</span></div>' +
'<p class="note">On the real site this is Square&rsquo;s own checkout, where the customer ' +
'types their card. Paying creates the order in Square so the kitchen sees it, then sends ' +
'them to <a href="/order-confirmed">the confirmation page</a>.<br><br>' +
'These prices came from the server, not from the browser &mdash; that is the whole point ' +
'of the hand-off. <a href="/find-us#order">Back to the order page</a>.</p>' +
'</div></body></html>');
  }

  if (p === '/') p = '/home';
  let file = path.join(ROOT, p);
  try {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found: ' + p); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch (e) { res.statusCode = 500; res.end(String(e)); }
}).listen(PORT, () => console.log('listening on ' + PORT));
