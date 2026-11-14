/* ==========================================================================
   POST /api/contact

   Takes a quote or contact submission, checks it, and hands it to the
   Apps Script web app that writes the row and emails Shon.

   It goes through here rather than the browser posting to Google directly
   for four reasons: the Apps Script URL and its secret stay off the public
   page, Apps Script's redirect makes a browser fetch unable to read the
   result, spam is dropped before it can reach the Sheet, and the page gets
   a straight answer about whether the submission actually landed.

   Environment (set in Vercel, never in the repo):
     FORMS_ENDPOINT   the Apps Script /exec URL
     FORMS_SECRET     must match SECRET in tools/forms-apps-script.gs
   ========================================================================== */

'use strict';

/* Mirrors tools/forms-apps-script.gs. Anything not listed is discarded
   rather than passed along, so a crafted post cannot add columns. */
const FORMS = {
  quote: {
    required: ['name', 'phone', 'email'],
    optional: ['event_date', 'guests', 'event_type', 'service_style', 'budget',
               'location', 'menu_interest', 'heard_from', 'message']
  },
  contact: {
    required: ['name', 'email', 'message'],
    optional: ['phone', 'subject']
  }
};

/* Generous enough that no real enquiry hits them. Anything longer is
   refused outright rather than trimmed: quietly cutting the end off
   someone's message would lose the part they cared about and neither
   they nor Shon would ever know. */
const MAX_FIELD = 4000;     /* one field */
const MAX_TOTAL = 8000;     /* everything together */

/* Plain-looking addresses only. Deliberately not RFC-complete: this
   rejects the malformed ones, it does not prove the address exists. */
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { throw new Error('Malformed request'); }
  }
  return {};
}

/* Keeps one source from hammering the endpoint. Per instance, so it is a
   speed bump rather than a guarantee — enough to stop a loop, and the
   honeypot does the heavier lifting. */
const seen = new Map();
const WINDOW_MS = 60 * 1000;

function rateLimited(key) {
  /* Read per call, not at load, so it can be tuned without a code change
     if a real person ever trips it. Three a minute is already generous
     for someone filling in a twelve-field form by hand. */
  const max = Number(process.env.FORMS_RATE_LIMIT) || 3;
  const now = Date.now();
  const hits = (seen.get(key) || []).filter(t => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(key, hits);
  if (seen.size > 500) {           /* never let the map grow without bound */
    for (const [k, v] of seen) if (!v.some(t => now - t < WINDOW_MS)) seen.delete(k);
  }
  return hits.length > max;
}

/* Note this does NOT truncate — see MAX_FIELD. Length is checked by the
   caller so an over-long field can be reported rather than silently cut. */
function clean(value) {
  return String(value == null ? '' : value).trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const endpoint = process.env.FORMS_ENDPOINT;
  const secret = process.env.FORMS_SECRET;

  /* Said plainly, so the page can tell the truth rather than show a
     generic failure while the Apps Script URL is still outstanding. */
  if (!endpoint || !secret) {
    return res.status(503).json({
      error: 'The form is not connected yet.',
      detail: 'FORMS_ENDPOINT and FORMS_SECRET are not set on the server.'
    });
  }

  let body;
  try { body = readBody(req); }
  catch { return res.status(400).json({ error: 'That submission could not be read.' }); }

  const spec = FORMS[body.form];
  if (!spec) return res.status(400).json({ error: 'Unknown form' });

  /* A field no human sees. Browsers leave it empty; bots fill everything.
     Answered with a 200 on purpose — a bot told it failed tries again. */
  if (clean(body.website)) {
    console.log('form dropped: honeypot', body.form);
    return res.status(200).json({ ok: true });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    console.log('form dropped: rate limit', body.form);
    return res.status(429).json({ error: 'Too many submissions. Please try again shortly.' });
  }

  /* Copy across only the fields this form declares. */
  const fields = {};
  let total = 0;
  for (const key of spec.required.concat(spec.optional)) {
    const value = clean((body.fields || {})[key]);
    if (!value) continue;
    if (value.length > MAX_FIELD) {
      return res.status(400).json({
        error: 'That message is too long to send. Please shorten it, or call instead.'
      });
    }
    fields[key] = value;
    total += value.length;
  }

  if (total > MAX_TOTAL) {
    return res.status(400).json({
      error: 'That submission is too long to send. Please shorten it, or call instead.'
    });
  }
  for (const key of spec.required) {
    if (!fields[key]) {
      return res.status(400).json({ error: 'Please fill in every required field.' });
    }
  }
  if (!EMAIL.test(fields.email)) {
    return res.status(400).json({ error: 'That email address does not look right.' });
  }

  let response, data;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* Apps Script answers 302 to googleusercontent; fetch follows it. */
      redirect: 'follow',
      body: JSON.stringify({ secret, form: body.form, fields })
    });
    data = await response.json();
  } catch (err) {
    console.error('forms endpoint unreachable:', String(err));
    return res.status(502).json({ error: 'That did not send. Please try again.' });
  }

  if (!response.ok || !data || data.ok !== true) {
    console.error('forms endpoint refused:', response.status, JSON.stringify(data));
    return res.status(502).json({ error: 'That did not send. Please try again.' });
  }

  /* A record that the submission landed, without putting the customer's
     name, number or message into a log file. */
  console.log('form delivered:', body.form, 'fields:', Object.keys(fields).length);

  return res.status(200).json({ ok: true });
};
