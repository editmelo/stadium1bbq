/* The forms, end to end against the real api/contact.js with the Apps
   Script endpoint stubbed. The rule being protected: a submission that
   did not send must never look like one that did. */
const BASE = 'http://127.0.0.1:9222';

(async () => {
  const list = await (await fetch(BASE + '/json/list')).json();
  const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const w = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); }
  });
  const send = (m, p = {}) => new Promise(res => { const i = ++id; w.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async x => (await send('Runtime.evaluate', { expression: `(async()=>{${x}})()`, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });

  let pass = 0, fail = 0;
  const check = (n, g, want) => {
    const ok = JSON.stringify(g) === JSON.stringify(want);
    console.log((ok ? '  ok   ' : '  FAIL ') + n + (ok ? '' : `\n         got ${JSON.stringify(g)}\n         want ${JSON.stringify(want)}`));
    ok ? pass++ : fail++;
  };

  const goto = async url => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      if (await ev('return document.readyState') === 'complete') break;
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 500));
  };

  /* ---- markup ---------------------------------------------------------- */
  console.log('\n--- form markup ---');
  await goto('http://localhost:8787/catering');
  check('quote form declares itself',
    await ev(`return document.querySelector('[data-site-form]').getAttribute('data-site-form')`), 'quote');
  check('no stale data-no-endpoint',
    await ev(`return !!document.querySelector('[data-no-endpoint]')`), false);
  check('honeypot exists and starts empty',
    await ev(`const h=document.querySelector('[name=website]'); return [!!h, h.value]`), [true, '']);
  check('honeypot is off-screen, not merely hidden',
    await ev(`const r=document.querySelector('[name=website]').getBoundingClientRect(); return r.right < 0`), true);
  check('honeypot is hidden from screen readers',
    await ev(`return document.querySelector('[name=website]').closest('[aria-hidden="true"]') !== null`), true);
  check('honeypot is not reachable by keyboard',
    await ev(`return document.querySelector('[name=website]').tabIndex`), -1);
  check('status box starts hidden',
    await ev(`return document.querySelector('[data-form-status]').hidden`), true);

  /* ---- a real submission ------------------------------------------------ */
  const fillQuote = `
    const f = document.querySelector('[data-site-form]');
    f.querySelector('[name=name]').value = 'Maria Tran';
    f.querySelector('[name=phone]').value = '317-555-0142';
    f.querySelector('[name=email]').value = 'maria@example.com';
    f.querySelector('[name=guests]').value = '120';
    f.querySelector('[name=message]').value = 'Graduation party, outdoor.';`;

  console.log('\n--- a submission that sends ---');
  await ev(fillQuote);
  await ev(`document.querySelector('[data-site-form] button[type=submit]').click();`);
  await new Promise(r => setTimeout(r, 1500));
  check('says it was received',
    await ev(`return /Got it/.test(document.querySelector('[data-form-status]').textContent)`), true);
  check('success is NOT styled as a failure',
    await ev(`return document.querySelector('[data-form-status]').classList.contains('notice--bad')`), false);
  check('form is cleared so it cannot be sent twice by accident',
    await ev(`return document.querySelector('[data-site-form] [name=name]').value`), '');
  check('submit button is usable again',
    await ev(`const b=document.querySelector('[data-site-form] button[type=submit]'); return [b.disabled, b.textContent.trim()]`),
    [false, 'Send My Request']);

  const got = await (await fetch('http://localhost:8787/__forms_last')).json();
  check('the server forwarded the right form', got.form, 'quote');
  check('fields arrived intact',
    [got.fields.name, got.fields.guests, got.fields.email],
    ['Maria Tran', '120', 'maria@example.com']);
  check('the shared secret was sent', typeof got.secret === 'string' && got.secret.length > 0, true);
  check('the honeypot field was never forwarded', 'website' in got.fields, false);

  /* ---- the failure path ------------------------------------------------- */
  console.log('\n--- a submission that fails must say so ---');
  await fetch('http://localhost:8787/__forms_mode?mode=fail');
  await goto('http://localhost:8787/catering');
  await ev(fillQuote);
  await ev(`document.querySelector('[data-site-form] button[type=submit]').click();`);
  await new Promise(r => setTimeout(r, 1500));
  const failed = await ev(`const b=document.querySelector('[data-form-status]');
    return {text:b.textContent, bad:b.classList.contains('notice--bad'),
            name:document.querySelector('[name=name]').value};`);
  check('tells the customer it did not send', /didn.t send/i.test(failed.text), true);
  check('never claims it was received', /Got it|thank you/i.test(failed.text), false);
  check('is styled as a problem', failed.bad, true);
  check('gives the phone number instead', /332-1327/.test(failed.text), true);
  check('keeps their answers on screen to copy', failed.name, 'Maria Tran');

  /* ---- not connected yet ------------------------------------------------ */
  console.log('\n--- before the Sheet is hooked up (503) ---');
  await fetch('http://localhost:8787/__forms_mode?mode=unconfigured');
  await goto('http://localhost:8787/about');
  await ev(`const f=document.querySelector('[data-site-form]');
    f.querySelector('[name=name]').value='Sam';
    f.querySelector('[name=email]').value='sam@example.com';
    f.querySelector('[name=message]').value='Do you do repasts?';
    f.querySelector('button[type=submit]').click();`);
  await new Promise(r => setTimeout(r, 1500));
  const unconf = await ev(`const b=document.querySelector('[data-form-status]');
    return {text:b.textContent, bad:b.classList.contains('notice--bad')};`);
  check('says plainly it is not connected', /not connected/i.test(unconf.text), true);
  check('does not claim success', /Got it/i.test(unconf.text), false);
  check('still offers the phone number', /332-1327/.test(unconf.text), true);
  check('styled as a problem', unconf.bad, true);

  await fetch('http://localhost:8787/__forms_mode?mode=ok');

  /* ---- server-side rejections ------------------------------------------- */
  console.log('\n--- what the server refuses ---');
  const post = async body => {
    const r = await fetch('http://localhost:8787/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: r.status, body: await r.json() };
  };
  const good = { name: 'A', phone: '1', email: 'a@b.co', message: 'hi' };

  check('a bot that fills the honeypot is dropped, quietly',
    await post({ form: 'quote', website: 'http://spam.example', fields: good }),
    { status: 200, body: { ok: true } });
  const sameAsBefore = await (await fetch('http://localhost:8787/__forms_last')).json();
  check('and the honeypot submission never reached the Sheet', sameAsBefore.fields.name, 'Maria Tran');

  check('unknown form rejected', (await post({ form: 'nope', fields: good })).status, 400);
  check('missing required field rejected',
    (await post({ form: 'quote', fields: { name: 'A', email: 'a@b.co' } })).status, 400);
  check('bad email rejected',
    (await post({ form: 'contact', fields: { name: 'A', email: 'not-an-email', message: 'x' } })).status, 400);
  check('GET is refused', (await (await fetch('http://localhost:8787/api/contact')).json()).error, 'Use POST');

  const long = { name: 'A', phone: '1', email: 'a@b.co', message: 'x'.repeat(9000) };
  const big = await post({ form: 'quote', fields: long });
  check('an oversized message is refused, not silently cut short', big.status, 400);
  check('and says what to do about it', /too long|shorten|call/i.test(big.body.error || ''), true);

  /* A long but plausible message must still get through untouched. */
  const realistic = 'We are planning a repast for about 80 people. ' + 'Details. '.repeat(100);
  await post({ form: 'contact', fields: { name: 'C', email: 'c@d.co', message: realistic } });
  const kept = await (await fetch('http://localhost:8787/__forms_last')).json();
  check('a long genuine message arrives whole', kept.fields.message.length, realistic.trim().length);

  /* Extra keys must be dropped, not passed through to the Sheet. */
  await post({ form: 'contact', fields: { name: 'B', email: 'b@c.co', message: 'hi', evil: 'DROP TABLE' } });
  const last = await (await fetch('http://localhost:8787/__forms_last')).json();
  check('fields the form never declared are discarded', 'evil' in last.fields, false);

  /* ---- the rate limit, on purpose -------------------------------------- */
  console.log('\n--- the rate limit ---');
  await fetch('http://localhost:8787/__forms_ratelimit?n=2');
  const burst = [];
  for (let i = 0; i < 5; i++) burst.push((await post({ form: 'contact', fields: { name: 'A', email: 'a@b.co', message: 'x' } })).status);
  check('the first submissions go through', burst.slice(0, 2), [200, 200]);
  check('then a burst from one address is cut off', burst.slice(-1)[0], 429);
  check('the whole burst is not blocked, only the excess',
    burst.filter(x => x === 200).length, 2);
  await fetch('http://localhost:8787/__forms_ratelimit?n=500');

  console.log(`\nchecks ${pass + fail}, failures ${fail}\n`);
  ws.close();
  process.exit(fail ? 1 : 0);
})();
