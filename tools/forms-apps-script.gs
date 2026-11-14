/* ==========================================================================
   Stadium 1 BBQ — form receiver
   Paste this into Apps Script on the Google Sheet that should hold the leads.

   What it does, for every quote or contact form sent from the website:
     1. writes a row to the right tab of this Sheet
     2. emails Shon a readable summary, with Reply-To set to the customer
        so hitting reply goes to them and not into a void
     3. answers the website so it knows the submission actually landed

   Setup is in the site README under "Where the forms go".
   ========================================================================== */

/* ---- Settings -------------------------------------------------------- */

/* Where the lead emails go. */
var NOTIFY = 'stadium1bbq@stadium1bbq.com';

/* Must match FORMS_SECRET in Vercel. Anyone who learns this web app's URL
   could otherwise write rows into the Sheet and send mail on this account's
   quota. Generate a long random string; never reuse a password. */
var SECRET = 'PASTE_THE_SAME_SECRET_YOU_PUT_IN_VERCEL';

/* Tab name and column order per form. Add a field here and to the website
   and it lands in the right column; order is what the Sheet uses. */
var FORMS = {
  quote: {
    tab: 'Catering Quotes',
    fields: ['name', 'phone', 'email', 'event_date', 'guests', 'event_type',
             'service_style', 'budget', 'location', 'menu_interest',
             'heard_from', 'message'],
    labels: {
      name: 'Name', phone: 'Phone', email: 'Email', event_date: 'Event date',
      guests: 'Guests', event_type: 'Event type', service_style: 'Service style',
      budget: 'Budget', location: 'Location', menu_interest: 'Menu interest',
      heard_from: 'Heard about us', message: 'Notes'
    }
  },
  contact: {
    tab: 'Contact',
    fields: ['name', 'phone', 'email', 'subject', 'message'],
    labels: {
      name: 'Name', phone: 'Phone', email: 'Email',
      subject: 'About', message: 'Message'
    }
  }
};

/* ---- Entry point ------------------------------------------------------ */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply(false, 'No data');

    var body = JSON.parse(e.postData.contents);

    if (!SECRET || SECRET.indexOf('PASTE_THE_SAME') === 0) {
      return reply(false, 'Script not configured');
    }
    if (body.secret !== SECRET) return reply(false, 'Not authorised');

    var spec = FORMS[body.form];
    if (!spec) return reply(false, 'Unknown form');

    var fields = body.fields || {};

    /* The website validates too, but this script is reachable on its own,
       so it re-checks rather than trusting what arrived. */
    if (!String(fields.name || '').trim())  return reply(false, 'Name is required');
    if (!String(fields.email || '').trim()) return reply(false, 'Email is required');

    writeRow(spec, fields);
    notify(body.form, spec, fields);

    return reply(true, 'Received');
  } catch (err) {
    /* Logged to the Apps Script execution log, where it can be read later;
       the caller gets a plain message. */
    console.error('doPost failed: ' + err);
    return reply(false, 'Could not record that submission');
  }
}

/* A GET is handy for checking the deployment is alive without sending a
   fake lead. It deliberately reveals nothing. */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'stadium1bbq-forms' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- Sheet ------------------------------------------------------------ */

function writeRow(spec, fields) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(spec.tab);

  if (!sheet) {
    sheet = book.insertSheet(spec.tab);
    var header = ['Received'].concat(spec.fields.map(function (f) {
      return spec.labels[f] || f;
    }));
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  var row = [new Date()].concat(spec.fields.map(function (f) {
    return String(fields[f] == null ? '' : fields[f]);
  }));
  sheet.appendRow(row);
}

/* ---- Email ------------------------------------------------------------ */

function notify(formKey, spec, fields) {
  var subject = formKey === 'quote'
    ? subjectForQuote(fields)
    : 'Website message — ' + clean(fields.name) +
      (fields.subject ? ' — ' + clean(fields.subject) : '');

  var lines = spec.fields.map(function (f) {
    var v = String(fields[f] == null ? '' : fields[f]).trim();
    if (!v) return null;
    return pad(spec.labels[f] || f) + v;
  }).filter(function (x) { return x; });

  var body =
    (formKey === 'quote' ? 'New catering quote request.' : 'New message from the website.') +
    '\n\n' + lines.join('\n') +
    '\n\nReply to this email and it goes straight to ' + clean(fields.name) + '.\n';

  var options = { name: 'Stadium 1 BBQ website' };
  /* So Shon can just hit reply. Only set when it looks like an address,
     because a malformed Reply-To makes Gmail reject the whole send. */
  if (/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(fields.email || '').trim())) {
    options.replyTo = String(fields.email).trim();
  }

  MailApp.sendEmail(NOTIFY, subject, body, options);
}

/* Shon reads these on her phone between jobs, so the subject carries the
   things that decide whether to pull over: who, how many, when. */
function subjectForQuote(fields) {
  var bits = ['Catering quote — ' + clean(fields.name)];
  if (String(fields.guests || '').trim())     bits.push(clean(fields.guests) + ' guests');
  if (String(fields.event_date || '').trim()) bits.push(clean(fields.event_date));
  return bits.join(', ');
}

/* ---- Helpers ---------------------------------------------------------- */

function clean(v) {
  /* Newlines in a subject line are how header injection starts. */
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
}

function pad(label) {
  var s = label + ':';
  while (s.length < 16) s += ' ';
  return s;
}

function reply(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
