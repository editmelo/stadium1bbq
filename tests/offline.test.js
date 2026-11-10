const BASE = 'http://127.0.0.1:9222';
(async () => {
  const list = await (await fetch(BASE + '/json/list')).json();
  const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const w = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); } });
  const send = (method, params = {}) => new Promise(res => { const i = ++id; w.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Page.enable'); await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  let pass = 0, fail = 0;
  const check = (n, g, want) => { const ok = JSON.stringify(g) === JSON.stringify(want);
    console.log((ok?'  ok   ':'  FAIL ')+n+(ok?'':`\n         got ${JSON.stringify(g)} want ${JSON.stringify(want)}`)); ok?pass++:fail++; };

  await send('Page.navigate', { url: 'http://localhost:8788/find-us' });
  await new Promise(r => setTimeout(r, 2500));

  console.log('\n--- /find-us with ordering switched off (production right now) ---');
  check('no cart is drawn', await ev('return document.querySelectorAll(".order-card").length'), 0);
  check('no pay button exists', await ev('return !!document.querySelector("[data-pay]")'), false);
  check('honest notice shown instead',
    await ev('return document.querySelector("[data-order] .notice strong").textContent'),
    'Ordering here isn’t switched on yet.');
  check('notice keeps the Square link',
    await ev(`return !!document.querySelector('[data-order] a[href*="cash.app"]')`), true);
  check('notice keeps the phone number',
    await ev(`return !!document.querySelector('[data-order] a[href^="tel:"]')`), true);
  /* The second .menu-table is "Everything at the tent"; the first holds the
     winter market dates. The price list has to survive the fallback. */
  check('printed price table is still on the page',
    await ev('return document.querySelectorAll(".menu-table")[1].querySelectorAll("tbody tr").length'), 6);
  check('price list still shows $20.00 plates',
    await ev(`return document.querySelectorAll('.menu-table')[1].textContent.includes('$20.00')`), true);
  check('Order Online buttons still go to Square while ordering is off',
    await ev(`return [...document.querySelectorAll('[data-order-cta]')].map(a=>a.getAttribute('href'))`),
    ['https://cash.app/$stadium1bbq','https://cash.app/$stadium1bbq']);
  console.log(`\nchecks ${pass+fail}, failures ${fail}\n`);
  ws.close(); process.exit(fail?1:0);
})();
