# Ordering regression

`./tests/run.sh` — needs Node and Google Chrome, no npm install.

It exercises the pop-up ordering flow end to end against the real
`api/*.js` handlers, with Square itself stubbed out:

- **`server.js`** — a local stand-in for Vercel. Serves the site with clean
  URLs, mounts `api/menu.js` and `api/checkout.js` behind a Vercel-shaped
  `res` shim, and intercepts the call to Square so no real payment link is
  ever created. `/__square_payload` reports what the server last asked
  Square for, which is how the tests check server-side pricing.
- **`cart.test.js`** — the credentialed path: building a cart, stacking,
  removing, the quantity cap, and the hand-off to Square.
- **`offline.test.js`** — the path production is on until the Square
  environment variables are set: no cart is drawn, and the printed price
  list and phone number are still there.

These files are excluded from deployment by `.vercelignore`.
