/* Minimal CDP driver: Node 24 has a global WebSocket, so no dependencies.
   Evaluates expressions in the page and reports pass/fail. */
const BASE = 'http://127.0.0.1:9222';

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(BASE + '/json/list')).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('no CDP target');
}

(async () => {
  const ws = new WebSocket(await target());
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiters = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id; waiters.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true
    });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});

  let pass = 0, fail = 0;
  const check = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`));
    ok ? pass++ : fail++;
  };

  const goto = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      const ready = await evalJs('return document.readyState');
      if (ready === 'complete') break;
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 600));   // let fetch('/api/menu') land
  };

  console.log('\n--- /find-us ordering cart ---');
  await goto('http://localhost:8787/find-us');

  check('cart rendered (6 item cards)',
    await evalJs('return document.querySelectorAll(".order-card").length'), 6);
  check('no fallback notice',
    await evalJs('return !!document.querySelector("[data-order] .notice")'), false);
  check('total starts at $0.00',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$0.00');
  check('pay button starts disabled',
    await evalJs('return document.querySelector("[data-pay]").disabled'), true);
  check('empty note visible',
    await evalJs('return !document.querySelector("[data-empty]").hidden'), true);
  check('rib tips card has 2 side selects',
    await evalJs('return document.querySelectorAll(\'[data-item="plate-tips"] select\').length'), 2);
  check('sliders card has meat + 2 sides',
    await evalJs(`const s=[...document.querySelectorAll('[data-item="sliders-2-2"] select')];
                  return s.map(x=>x.getAttribute('data-kind'))`), ['meat','side','side']);
  check('every select label is wired to its select',
    await evalJs(`const sels=[...document.querySelectorAll('[data-order] select')];
      return sels.every(s=>s.id && document.querySelector('label[for="'+CSS.escape(s.id)+'"]'))`), true);
  check('cart toggle is hidden on desktop',
    await evalJs(`return getComputedStyle(document.querySelector('.cart-toggle')).display`), 'none');
  check('cart is in normal flow on desktop (not a fixed bar)',
    await evalJs(`return getComputedStyle(document.querySelector('.order-cart')).position`), 'sticky');
  check('Order Online buttons point at the cart once ordering is live',
    await evalJs(`return [...document.querySelectorAll('[data-order-cta]')].map(a=>a.getAttribute('href'))`),
    ['#order','#order']);
  check('and no longer open a new tab',
    await evalJs(`return [...document.querySelectorAll('[data-order-cta]')].some(a=>a.hasAttribute('target'))`), false);
  check('side options match the five on the flyer',
    await evalJs(`return [...document.querySelectorAll('[data-item="plate-tips"] select')[0].options].map(o=>o.value)`),
    ['mac','beans','corn','mashed','veg']);

  /* Add a rib tips plate with mac + beans */
  await evalJs(`const c=document.querySelector('[data-item="plate-tips"]');
    const s=c.querySelectorAll('select'); s[0].value='mac'; s[1].value='beans';
    c.querySelector('[data-add]').click();`);
  check('one line after first add',
    await evalJs('return document.querySelectorAll("[data-lines] .pan").length'), 1);
  check('total is $20.00',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$20.00');
  check('count reads 1 item',
    await evalJs('return document.querySelector("[data-count]").textContent'), '1 item');
  check('pay button now enabled',
    await evalJs('return document.querySelector("[data-pay]").disabled'), false);
  check('line shows the chosen sides',
    await evalJs('return document.querySelector("[data-lines] .pan__qty").textContent'), 'Mac & Cheese, Baked Beans');
  check('empty note hidden',
    await evalJs('return document.querySelector("[data-empty]").hidden'), true);

  /* Same thing again should stack, not duplicate */
  await evalJs(`document.querySelector('[data-item="plate-tips"] [data-add]').click();`);
  check('identical add stacks into one line',
    await evalJs('return document.querySelectorAll("[data-lines] .pan").length'), 1);
  check('stacked line shows 2x',
    await evalJs('return document.querySelector("[data-lines] .pan__name").textContent.trim()'), '2× Rib Tips Plate');
  check('total is $40.00',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$40.00');
  check('count reads 2 items',
    await evalJs('return document.querySelector("[data-count]").textContent'), '2 items');

  /* Different sides on the same item is a separate line */
  await evalJs(`const c=document.querySelector('[data-item="plate-tips"]');
    const s=c.querySelectorAll('select'); s[0].value='corn'; s[1].value='corn';
    c.querySelector('[data-add]').click();`);
  check('different sides make a second line',
    await evalJs('return document.querySelectorAll("[data-lines] .pan").length'), 2);
  check('double-corn is allowed and labelled',
    await evalJs('return [...document.querySelectorAll("[data-lines] .pan__qty")][1].textContent'),
    'Smoked Skillet Corn, Smoked Skillet Corn');
  check('total is $60.00',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$60.00');

  /* A bowl: meat + one side, $15 */
  await evalJs(`const c=document.querySelector('[data-item="bowl"]');
    const s=c.querySelectorAll('select'); s[0].value='brisket'; s[1].value='mac';
    c.querySelector('[data-add]').click();`);
  check('total is $75.00 after the bowl',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$75.00');
  check('bowl line shows meat then side',
    await evalJs('return [...document.querySelectorAll("[data-lines] .pan__qty")][2].textContent'),
    'Brisket · Mac & Cheese');

  /* Remove the middle line */
  await evalJs(`[...document.querySelectorAll('[data-remove]')][1].click();`);
  check('removing a line drops it',
    await evalJs('return document.querySelectorAll("[data-lines] .pan").length'), 2);
  check('total back to $55.00',
    await evalJs('return document.querySelector("[data-total]").textContent'), '$55.00');
  check('remove buttons are re-indexed',
    await evalJs(`return [...document.querySelectorAll('[data-remove]')].map(b=>b.getAttribute('data-remove'))`),
    ['0','1']);

  /* The quantity ceiling */
  await evalJs(`const b=document.querySelector('[data-item="brat"] [data-add]');
    for(let i=0;i<15;i++) b.click();`);
  check('quantity stops at Square’s cap of 12',
    await evalJs(`return document.querySelector('[data-lines] .pan:last-child .pan__name').textContent.trim()`),
    '12× Brat or Street Polish');
  check('hitting the cap says so',
    await evalJs('return document.querySelector("[data-status]").textContent'),
    'That is as many of those as one order can hold.');
  check('cap message is styled as a problem',
    await evalJs('return document.querySelector("[data-status]").classList.contains("is-bad")'), true);

  /* Now the real thing: pay */
  const totalBefore = await evalJs('return document.querySelector("[data-total]").textContent');
  console.log('  ..   cart total before paying: ' + totalBefore);
  await evalJs(`document.querySelector('[data-pay]').click();`);
  await new Promise(r => setTimeout(r, 1500));
  check('pay button sends the browser to Square',
    await evalJs('return !!document.getElementById("sq")'), true);

  /* What did the server actually ask Square for? */
  const payload = await (await fetch('http://localhost:8787/__square_payload')).json();
  const li = payload.order.line_items;
  check('Square got 3 line items', li.length, 3);
  check('server-side total matches the cart',
    '$' + (li.reduce((s,l)=>s + l.base_price_money.amount * Number(l.quantity), 0)/100).toFixed(2),
    totalBefore);
  /* Square's hosted checkout page shows the line item NAME and does not
     show the note, so the choices have to survive into the name or a
     customer cannot check their own order before paying. */
  check('rib tips name carries both sides',
    li.some(l => l.name === 'Rib Tips Plate (Mac & Cheese, Baked Beans)'), true);
  check('bowl name carries meat and side',
    li.some(l => l.name === 'Build Your Own Bowl (Brisket \u00b7 Mac & Cheese)'), true);
  check('every line item names its choices',
    li.every(l => /\(.+\)$/.test(l.name)), true);
  check('notes still carry the choices for Order Manager',
    li.every(l => typeof l.note === 'string' && l.note.length > 0), true);
  check('names stay inside Square\u2019s 512 character limit',
    li.every(l => l.name.length <= 512), true);
  check('quantities are strings (Square requires it)',
    li.every(l => typeof l.quantity === 'string'), true);
  check('redirect points at /order-confirmed',
    payload.checkout_options.redirect_url.endsWith('/order-confirmed'), true);
  check('no shipping address asked for (pickup)',
    payload.checkout_options.ask_for_shipping_address, false);
  check('idempotency key present',
    typeof payload.idempotency_key === 'string' && payload.idempotency_key.length > 10, true);
  /* name is what Square shows the customer; note is what reads in Order
     Manager. Printed apart so neither is mistaken for the other. */
  li.forEach(l => console.log('  ..   ' + l.quantity + '× ' + l.name + '   [note: ' + l.note + ']'));

  console.log('\n--- /order-confirmed ---');
  await goto('http://localhost:8787/order-confirmed');
  check('page has a heading', await evalJs('return !!document.querySelector("h2")'), true);
  check('noindex is set',
    await evalJs(`return document.querySelector('meta[name=robots]').content`), 'noindex, nofollow');
  check('links back to ordering',
    await evalJs(`return !!document.querySelector('a[href="/find-us#order"]')`), true);
  /* A half-bumped page is the classic cache bug here: one asset on the new
     version, the rest stranded on the old one. Assert they all agree. */
  check('every local asset carries the same ?v=',
    await evalJs(`const v=[...document.querySelectorAll('[src],[href]')]
        .map(e=>e.getAttribute('src')||e.getAttribute('href'))
        .filter(u=>u && u.startsWith('/assets/'))
        .map(u=>(u.match(/\\?v=(\\d+)/)||[])[1]);
      return {missing: v.filter(x=>!x).length, distinct: new Set(v).size}`),
    { missing: 0, distinct: 1 });

  console.log(`\nchecks ${pass + fail}, failures ${fail}\n`);
  ws.close();
  process.exit(fail ? 1 : 0);
})();
