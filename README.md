# Stadium 1 BBQ & More — website

A five-page static site. No build step, no dependencies, no framework.

Run it locally with `python3 -m http.server 8080` and open
<http://localhost:8080>. Use a server rather than opening the files
directly — the clean URLs below depend on one.

```
home/index.html         /home        Home — splits catering vs. plates
catering/index.html     /catering    The money page. Cookout builder + quote form
menu/index.html         /menu        Full menu and prices
find-us/index.html      /find-us     Market dates, pop-up menu, Facebook
faq/index.html          /faq         20 questions, native <details>, FAQPage schema

Market days: the winter market is **every other Wednesday, 4:00–6:30 PM** at
the Hendricks County Fairgrounds (Dec 15 is the one Tuesday, which is why the
flyer calls it a special market). Pike is **summer Saturdays, 8 AM–12 PM,
June to August**.
about/index.html        /about       Story, what sets them apart, contact form
index.html                           Redirect stub: bare domain -> /home
assets/                              Stylesheet, scripts, photography, logo
vercel.json                          Redirects, caching, headers (the live host)
_redirects                           The same redirects for Netlify
```

### URLs

Every page is a folder containing `index.html`, which every static host
serves at the clean path with no configuration. `/catering.html` is gone.

The home page lives at **`/home`**, not at the bare domain. `vercel.json`
sends `/` and `/index.html` there with a 308, and the small `index.html`
at the root does the same thing with a meta refresh for any host that has
no redirect rules. `trailingSlash` is `false`, so the address bar reads
`/home` rather than `/home/`.

Links are root-relative (`/menu`, `/assets/…`). That assumes the site is
served from a domain root, which it is on Vercel. If it ever has to live
in a subfolder, those would need to become relative again.

Adding a page means adding a folder, not a `.html` file.

---

## Before this goes live

Five things need a decision. The first two are the important ones.

**Also waiting on you:** online ordering is built and tested but switched
off until three environment variables are set in Vercel. It is safe to
deploy as-is — the page says so honestly and keeps the Square link. See
[Ordering on the site](#ordering-on-the-site) for exactly what to add and
where the token comes from.

### 1. Connect the forms — built, waiting on the Google Sheet

Both forms are wired to `/api/contact` and fully tested. They do not send yet
only because `FORMS_ENDPOINT` and `FORMS_SECRET` are not set in Vercel. Until
they are, submitting says plainly that it did not send and gives the phone
number, with the customer's answers still on screen.

Setup is about ten minutes: make a Google Sheet, paste in
`tools/forms-apps-script.gs`, deploy it as a web app, put the URL and secret
into Vercel. Full steps in [Where the forms go](#where-the-forms-go).

### 2. Pricing — from Shon's October 2026 sheets

Catering prices come from the photographed sheets in `Updates/websitechanges`:
**Customer-Facing A La Carte Prices**, **Corporate Catering Packages**,
**Family Meals - Working Model** and the **Seasonal Fall/Winter Menu**. Shon's
note with them: *"These will be the only items that need to be on the site."*

That replaced the Square-catalog pricing entirely. The menu is now 25 items,
half pan and full pan only — no 1/3 pans — and every full pan is exactly twice
the half. Prices rose sharply: a half pan of Mac & Cheese went $69.99 → $100,
Rib Tips $69.99 → $115. Items not on the new sheet are gone, including Ribs,
St. Louis Ribs, Brisket, Pulled Beef and all the seafood.

The sheets also carry **direct cost and margin columns**. Those are internal
and deliberately stay off the site; only the customer-facing columns are used.

Confirmed by Shon in October:

- **Family meal prices are final** at $60 / $90 / $120.
- **Desserts stay.** Whole bundt cakes are now $45 (three were $36), and the
  "Your Choice Combo, six" line came off.
- **Servers are $50 an hour**, not $25 a head. The builder bills
  `serverFee x serverHours x servers`.
- **Delivery splits by job.** $5–$10 covers a Friday family-meal drop, which
  is small and has no setup. Event catering keeps the $25–$200 distance tiers
  because it is more food and includes setup.
- **"Your Choice $15"** was removed from the pop-up menu.

Still an assumption, still worth a yes/no:

- **Server hours.** $50/hr is hers; **3 hours** is the builder's assumption for
  a service window, set by `serverHours` in `CONFIG`. It is shown to the
  customer as "3 hrs at $50/hr" so the basis is visible and easy to correct.
- **Servers per guest** is still one per 50 (`guestsPerServer`).
- **Repast photographs.** The fried chicken, mashed potato and green bean
  shots Shon sent look like licensed stock rather than her own kitchen. They
  are used as she asked; worth confirming she holds a licence.

### 3. Phone number

The site uses **(317) 332-1327** — the number published on the old site and
on Yelp. The foundation packet listed (317) 802-0325; if that's the one Shon
wants customers calling, it's a find-and-replace across the five page files
and `assets/js/site.js`.

### 4. Photography — all Shon's own

Shon supplied a photo library in August 2026. Thirty-four photographs were
selected, rotated to their correct orientation, cropped and compressed into
`assets/img`. Each one exists twice: `name.jpg` at 1000×750 for display and
`name-thumb.jpg` at 200×200 for the menu rows.

Nothing on the site is stock any more. The AI-generated marketing graphics in
the library (the `file_…` files and the "Cheese be Cheesing" mascot) were
deliberately left out, so every photograph is genuinely the food.

To add or replace one, run the same treatment — the source is in the client
folder, and the processing script pattern is: correct the EXIF rotation, crop
to 4:3, resize to 1000px, save at quality 76, then crop a 200px square for the
thumbnail. Cameras store rotation as metadata rather than rotating the pixels,
so skipping that step leaves photos on their side.

**Still worth shooting:** Shon at the pit, a catering table before anyone
eats, and a wide shot of a repast or corporate spread.

---

## The FAQ page

`/faq` holds twenty questions in five groups, written by Shon. Each one is a
native `<details>`, so every answer is in the HTML for search engines, is
readable with JavaScript off, and opens with the keyboard. The page also
carries `FAQPage` structured data, which is what lets Google show the
questions directly in results.

To add a question, copy a `.faq__item` block. Keep the schema block at the
bottom of `<head>` in step with it, or the markup and the structured data
drift apart.

---

## Photographs on the menu

Every priced item that has a photograph carries a thumbnail beside its name,
and on screens 1080px and wider a larger version appears in a sticky panel to
the right of the price list when the row is hovered or focused.

The thumbnail is real markup with real alt text, so the food is visible with
JavaScript off, on a phone, and to a screen reader. The panel is an
enhancement built by `assets/js/menu.js` only when there is room for it, and
torn down again if the window is narrowed.

To give an item a photograph:

1. Add `photo.jpg` and `photo-thumb.jpg` to `assets/img`
2. Put `data-shot="photo" data-shot-label="Item Name"` on its `<tr>`
3. Wrap the item cell in `.menu-item` with the thumbnail, matching a row that
   already has one

Rows with no photograph use `.menu-item__thumb--none`, an invisible spacer
that keeps every dish name on the same left edge.

---

## The cookout builder

The thing no other BBQ caterer in Indianapolis has. Guest count, event type,
meats, sides and service style produce a live estimate — and, more usefully,
a picture of **the actual pans that arrive**, because Shon's price list is
denominated in pans. Then "Send this to Shon" fills the quote form below it
with everything: guest count, event type, service style, budget range, menu
interest and a written summary.

**Pressing it again always refreshes the form.** Change the cookout, press
it a second time, and every field it owns is rewritten. The written summary
in the message box runs from a `MY COOKOUT BUILD` heading to a line holding
nothing but `---`. That pair is how the block is found and replaced on each
press. The closing rule is matched as a whole line, so a stray `---` inside
a sentence is not mistaken for the end. If it has been deleted the blank
line before the visitor's own text is used instead, and failing that the
`Estimate shown:` line — so their notes are never eaten. Two earlier shapes
are still recognised and cleaned up, so anyone carrying an old summary in
their form gets it replaced rather than stacked.
Fields the builder rewrote are
outlined in ember for a moment, so a repeat press visibly does something
even when the form is already on screen. Name, phone, email, date and
location are never touched.

### How it prices

1. Works out meat servings needed — one per guest, plus a bit for each extra
   entrée, since people sample instead of picking one
2. Works out side servings — less of each when there are more to choose from
3. Finds the cheapest set of pans covering that
4. Adds **plates & utensils** at $49.99 per 25 guests (the visitor can untick
   it), and on full service **servers** at $25 each
5. Shows a range with **delivery at $25–$200** folded in

There is no dollar minimum any more. Shon's floor is **25 guests**, which the
slider enforces, so the quote is simply what the food costs.

Serving counts: an entrée half pan feeds about 12 and a full pan 24, and a
6 qt pot of chili or chowder about 24 eight-ounce servings — those are still
assumptions. **Sides are 20 to a half pan and 40 to a full**, which Shon gave
in November. Cornbread is the one exception at 30, because its half pan is a
printed 30 pieces.

Examples, drop-off with plates:

| Event | Estimate |
|---|---|
| 25 guests · pulled pork · mac, green beans | $425 – $700 |
| 50 guests · rib tips, pulled chicken · mac, baked beans | $900 – $1,300 |
| 150 guests, full service · rib tips, pulled pork, wings · mac, green beans, cornbread | $2,900 – $3,875 |
| 300 guests, full service · beef bites, smoked turkey · mac, greens | $6,050 – $7,875 |

### Seasonal items

The six chilis and chowders are one block on the menu page (`id="seasonal"`)
and one group in the builder, exactly so the whole lot can come off at the end
of winter without touching anything else. Shon's sheet asked for them to be
removable on their own.

### Changing prices

Prices live in two places that must agree: the tables on `menu/index.html`
and the `MEATS` / `SIDES` arrays in `assets/js/estimator.js`.

Service costs sit in one `CONFIG` block at the top of the estimator:

```js
var CONFIG = {
  minimumGuests: 25,                         // Shon's floor, enforced by the slider
  serverFee: 25,                             // per server, full service
  guestsPerServer: 50,                       // ASSUMPTION — confirm
  plates: { price: 49.99, guests: 25 },      // Plates & Utensils Pack
  delivery: { low: 25, high: 200 },          // event catering, by distance
  rangeSpread: 0.12,
  guests: { min: 25, max: 400, step: 5, start: 150 },
  ...
};
```

If you add or remove a menu item, check the default selections in `state`
near the top of `init()` — they reference item ids, and a stale id silently
drops out of the starting build.

After changing an asset, bump the `?v=` number on every page (see Caching).

---

## Ordering on the site

Customers build an order on `/find-us#order` and go straight to Square's
payment page. They never retype the order anywhere. When they pay, Square
creates a real **Order** in Shon's Order Manager, so the kitchen gets a
ticket — that is the reason this uses the Checkout API and not the Web
Payments SDK, which would take money without creating an order.

### The pieces

| File | What it does |
| --- | --- |
| `api/_catalog.js` | The only place pop-up prices live. Items, sides, meats, cents. |
| `api/menu.js` | `GET /api/menu` — serves the catalog so the page renders from it, plus `ordering: true/false`. |
| `api/checkout.js` | `POST /api/checkout` — prices the cart, asks Square for a payment link. |
| `assets/js/order.js` | The cart. Fetches the menu, holds the lines, sends the browser to Square. |
| `order-confirmed/` | Where Square sends people after they pay. |

**The browser never sends prices and is never believed about them.** It
sends item ids and choices; the server looks up the money in
`_catalog.js`. A cart claiming a $20 plate costs a penny is still charged
$20. This is tested — see `tests/`.

### Switching it on

Nothing works until three environment variables exist in Vercel. Until
they do, the page says so honestly: no cart is drawn, and the printed
price list, the Square link and the phone number are all still there. **So
it is safe to deploy this before the credentials exist.**

In Vercel → the `stadium1bbq` project → **Settings → Environment
Variables**, add these to **Production** (and Preview, if you want the
preview builds to take orders too):

| Name | Value |
| --- | --- |
| `SQUARE_ACCESS_TOKEN` | Shon's Square **access token** (see below) |
| `SQUARE_LOCATION_ID` | Shon's Square **location ID** (see below) |
| `SQUARE_ENV` | `production` — or `sandbox` to test with fake cards first |
| `SITE_ORIGIN` | `https://stadium1bbq.revieweditmelo.com` (or the live domain) |

Then **redeploy** — environment variables only reach a new build.

**Where the token comes from.** In Square's Developer Dashboard
(<https://developer.squareup.com/apps>), signed in on the account that owns
the business: create an application, then under **Credentials** copy the
**Production access token**. It needs the `ORDERS_WRITE`, `ORDERS_READ`
and `PAYMENTS_WRITE` permissions. Treat it like a password — it can take
money. It goes in Vercel and nowhere else; never in this repo.

**Where the location ID comes from.** Same dashboard, the **Locations**
tab. It looks like `L4K8XBWEYCQ3P`. If the business has more than one
location, pick the one the pop-up sales should land under.

Start with `SQUARE_ENV=sandbox` and a sandbox token if you want to place a
test order end to end first — Square's test card is `4111 1111 1111 1111`,
any future expiry, any CVV. Sandbox orders show in the sandbox dashboard,
not the real one.

### After it is on

The two **Order Online** buttons on Find Us rewire themselves to the cart
automatically once `/api/menu` reports `ordering: true` — there is no
switch to flip by hand. While ordering is off they keep pointing at
`cash.app/$stadium1bbq`, so that path never breaks.

### Changing a price

Edit `api/_catalog.js` only. The page renders from the same file that
prices the order, so the two cannot drift. Then bump the `?v=` number so
browsers pick up the change (see Caching), and update the printed price
table in `find-us/index.html`, which is hand-written markup and will not
follow on its own.

Note this catalog is **separate from Shon's Square item catalog**, which is
stale ($5 sliders against the $20/$15 pop-up plates). Orders placed here
carry their own names and prices, so the stale catalog does not affect
them. Shon can tidy her catalog whenever she likes without touching this.

### Testing it

```
./tests/run.sh
```

Needs Node and Google Chrome; no install step. It drives a headless
browser through the real cart against the real API handlers with Square
stubbed out, and checks both states — credentials set and credentials
missing. 53 checks at the time of writing.

---

## Where the forms go

The catering quote form and the contact form both post to `/api/contact`,
which checks the submission and hands it to a **Google Apps Script web app**.
That script writes a row to a Google Sheet and emails Shon, with Reply-To
set to the customer so hitting reply goes to them.

Submissions go to **Shon only** (`stadium1bbq@stadium1bbq.com`). Nothing is
copied to Edit Me Lo, by Lauren's decision — so the server logs whether each
submission was delivered, and nothing about who sent it, which is the only
way to diagnose a failure without reading someone's enquiry.

### The pieces

| File | What it does |
| --- | --- |
| `tools/forms-apps-script.gs` | Paste into Apps Script. Writes the row, sends the email. |
| `api/contact.js` | Validates, drops spam, forwards to the script. |
| `assets/js/site.js` | Submits the form and reports honestly what happened. |

### Setting it up

**1. Make the Sheet.** A new Google Sheet, on whichever account should own
the leads. Shon's is better long term — she owns the data and the emails
come from her own account. Note that moving the script to another account
later means redeploying it, so it is worth deciding now.

**2. Add the script.** In the Sheet: **Extensions → Apps Script**. Delete
whatever is in the editor and paste all of `tools/forms-apps-script.gs`.

**3. Set the secret.** Near the top of the script, replace
`PASTE_THE_SAME_SECRET_YOU_PUT_IN_VERCEL` with a long random string. Generate
one with `openssl rand -hex 32`. Keep it to hand for step 5. Save.

**4. Deploy it.** **Deploy → New deployment**. Next to "Select type" choose
**Web app**. Set:

- **Execute as:** Me
- **Who has access:** Anyone

Click **Deploy** and accept the permissions prompt — it is asking to write to
the Sheet and send mail as that account, which is what it does. Copy the
deployment URL; it ends in `/exec`.

> Use the `/exec` URL, not `/dev`. The `/dev` one only works for people with
> edit access to the script and always runs unsaved code.

**5. Tell the site.** In Vercel → `stadium1bbq` → **Settings → Environment
Variables**, add to **Production**:

| Name | Value |
| --- | --- |
| `FORMS_ENDPOINT` | the `/exec` URL from step 4 |
| `FORMS_SECRET` | the same random string from step 3 |

Then **redeploy** — environment variables only reach a new build.

**6. Check it.** Submit the contact form on `/about` with your own details.
A row should appear in the Sheet and an email in Shon's inbox within seconds.

### Until it is set up

The forms stay honest. `/api/contact` returns 503, and the page says it did
not send and gives the phone number, with the customer's answers still on
screen to copy. **It never claims a message was sent when it was not** —
that rule is what `tests/forms.test.js` exists to protect.

### Spam

Two defences, because nobody is screening before Shon's inbox:

- A **honeypot** field, off-screen and hidden from screen readers. People
  leave it empty; bots fill it. A submission that fills it is answered with
  a cheerful 200 and thrown away — a bot told it failed simply retries.
- A **rate limit**, three submissions a minute per address. Tune it with the
  `FORMS_RATE_LIMIT` environment variable if a real person ever trips it.

Fields the form does not declare are discarded rather than passed on, so a
crafted post cannot add columns to the Sheet.

### Changing the fields

Add the field to the HTML, to `FORMS` in `api/contact.js`, and to `FORMS` in
`tools/forms-apps-script.gs` — then redeploy the script (**Deploy → Manage
deployments → edit → new version**, which keeps the same URL). The Sheet gains
the column on the next submission only if the tab is new; for an existing tab,
add the header yourself.

### Email limits

Apps Script sends up to 100 emails a day from a personal Gmail account, 1,500
from a Google Workspace one. Comfortable for a catering enquiry form; worth
knowing it exists.

---

## Deploying

The site is hosted on **Vercel**, deploying automatically from `main` on
this GitHub repo. Push and it ships; there is no build step. The review
build is at <https://stadium1bbq.revieweditmelo.com>.

### Caching — read this before changing an asset

Filenames here are stable (`site.css`, not `site.a1b2c3.css`), so the
stylesheet and scripts are served `must-revalidate`. Browsers re-check
them on every visit and get a 304 when nothing changed, which costs a few
hundred bytes and means an edit always reaches people. Images get seven
days, since they are the heavy files and rarely change.

They must **never** be served `immutable`. That tells a browser not even
to ask again, and with stable filenames a fix can then never reach anyone
who has already visited.

Asset URLs in the HTML carry `?v=13`. If you change a stylesheet or script
and want it to land instantly for everyone — including anyone holding a
stale copy — bump that number everywhere it appears:

```
grep -rl '?v=' */index.html | xargs sed -i '' 's/?v=13/?v=14/g'
```

The `og:image` and schema URLs deliberately have no version, so social
and search keep one stable address for the image.

Update the domain in `sitemap.xml` and in the `canonical` / `og:url` tags
if the site lands anywhere other than `stadium1bbq.com`.

---|---|
| `/all-about-stadium-1-bbq` | `/about` |
| `/savory-menu` | `/menu` |
| `/dessert-menu` | `/menu` |
| `/catering-options` | `/catering` |
| `/promotions`, `/upcoming-promo` | `/find-us` |
| `/contact` | `/about` |
| `/menus`, `/product/*` | `/menu` |
| `/careers` | `/about` |

`/catering` and `/about` already existed on the older version of the site
and keep working unchanged.

A Netlify `_redirects` file is included with exactly these rules; it is
ignored by other hosts. On Vercel the same thing goes in `vercel.json` as
a `redirects` array, and on Apache in `.htaccess` as `Redirect 301` lines.

---

## What was checked

- **Estimator maths** — 628,320 data points across 8,160 combinations of
  guest count, meats, sides and service style. The price never drops when the
  guest count goes up, full service always costs at least drop-off, and every
  menu item builds a valid pan set
- **Layout** — no horizontal overflow at 320, 360, 390, 430, 768, 1024 and
  1440px across all five pages
- **Interactions** — 15 checks covering the slider, the four-meat cap, the
  empty state, the handoff into the quote form, and form validation
- **Accessibility** — every image has alt text, every form control has a
  label, one `<h1>` per page, no heading-level jumps, no duplicate IDs,
  visible keyboard focus, a skip link, and `prefers-reduced-motion` respected
- The site works with JavaScript disabled — the builder is replaced with a
  message pointing at the phone number, and nothing else is hidden

---

## Where the content came from

The old site had already been rebuilt on Square Online and the menu pages
were gone. The full catering menu, all prices and the photography were
recovered from archived copies of the Webador version of `stadium1bbq.com`.

Copy comes from Shon's own answers in the foundation packet, including the
headline — *"It's not just grilling, it's a way of life"* — and the
positioning line on the About page, *"what sets us apart is our ability to
create customized menus that fit each client's event and price."*

The `2×` figure is Shon's reported revenue growth last year on word of mouth
alone, per the packet.
