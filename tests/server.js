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

process.env.SQUARE_ACCESS_TOKEN = 'STUB_TOKEN';
process.env.SQUARE_LOCATION_ID  = 'STUB_LOCATION';
process.env.SQUARE_ENV          = 'sandbox';

const menu     = require(path.join(ROOT, 'api/menu.js'));
const checkout = require(path.join(ROOT, 'api/checkout.js'));

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
  if (p === '/__square_payload') { shim(res).status(200).json(lastSquarePayload || {}); return; }
  if (p === '/fake-square') { res.setHeader('Content-Type','text/html'); return res.end('<h1 id="sq">SQUARE CHECKOUT STUB</h1>'); }

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
