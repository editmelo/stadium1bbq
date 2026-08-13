# Stadium 1 BBQ & More — website

A five-page static site. No build step, no dependencies, no framework.

Run it locally with `python3 -m http.server 8080` and open
<http://localhost:8080>. Use a server rather than opening the files
directly — the clean URLs below depend on one.

```
home/index.html         /home        Home — splits catering vs. plates
catering/index.html     /catering    The money page. Cookout builder + quote form
menu/index.html         /menu        Full menu and prices
find-us/index.html      /find-us     Market plates, locations, Facebook
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

Four things need a decision. The first two are the important ones.

### 1. Connect the forms — they currently go nowhere

Both forms (catering quote, contact) validate properly but **do not send
anything**. On submit they show an honest message saying so and point people
at the phone and email instead. Nothing silently disappears and nothing
falsely says "thank you, we'll be in touch."

To connect them, pick a form service (Formspree, Basin and Netlify Forms all
work on a static site), then in `catering.html` and `about.html`:

```html
<!-- change this -->
<form class="form" data-quote-form data-no-endpoint novalidate>

<!-- to this -->
<form class="form" data-quote-form method="POST"
      action="https://formspree.io/f/YOUR_ID" novalidate>
```

Removing `data-no-endpoint` is what switches off the "not connected" message —
the handler in `assets/js/site.js` only binds to forms that have that
attribute. Then delete that block in `site.js` once both forms are live.

### 2. Confirm three side prices with Shon

The catering price list has pan pricing for **Mac & Cheese** only. Baked
Beans, Cole Slaw and Green Beans are sold at $4 a portion at the market but
have no published pan price, so the builder uses an **estimate** for them.

They're flagged in `assets/js/estimator.js` with `confirmed: false`. Get the
real numbers from Shon, update the prices, and set `confirmed: true`.

Also worth confirming: the **$800 event minimum** and the **service
percentages** (10% drop-off / 22% full service). Both are reasonable
inferences from the packet, not numbers Shon gave directly.

### 3. Phone number

The site uses **(317) 332-1327** — the number published on the old site and
on Yelp. The foundation packet listed (317) 802-0325; if that's the one Shon
wants customers calling, it's a find-and-replace across the five HTML files
and `assets/js/site.js`.

### 4. Photography — only Shon's own photos are used

The old site was mostly **stock imagery** (Vecteezy / AI-generated) with
unverified licensing. All of it has been removed. The site now ships with
exactly three photographs, all Shon's own, shot on a phone:

| File | Where it appears |
|---|---|
| `rib-tips.jpg` | Home hero, and the Find Us closing block |
| `mac-and-cheese.jpg` | Home — the word-of-mouth section |
| `trifle.jpg` | Menu desserts, and the About story |

Everywhere else that would have held a stock photo uses a **photo-free
treatment instead**: char ground, an ember glow, and charcoal grate lines
rising out of the bottom. It's used on the Catering and Find Us heroes, both
home-page doors, and every dish card. It reads as a deliberate design
decision rather than a gap, and it means nothing on the site misrepresents
the food.

**Adding real photos is still the biggest single upgrade available.** Shot
list, in priority order — all of it doable on a phone in daylight at one
event:

1. A full pan of ribs, straight down, filling the frame
2. Wings coming off the grill with flame visible
3. Shon at the smoker — a real face sells a one-woman operation better than food does
4. A catering table set up at an actual event, before anyone eats
5. A mac & cheese bowl with meat on top, the market version
6. Sliders, three on a board
7. A repast or corporate spread, wide, showing scale
8. The market stall with signage

To use a new photo, drop it in `assets/img/` and swap the photo-free
treatment for an image. On a hero, replace `class="hero hero--type"` with
`class="hero hero--bright"` and add the media block back:

```html
<section class="hero hero--bright">
  <div class="hero__media">
    <img src="assets/img/your-photo.jpg" alt="" fetchpriority="high">
  </div>
  ...
```

On a dish card, add `<div class="dish__img"><img src="…" alt="…"
loading="lazy"></div>` as the first child of the `<article class="dish">`.

---

## The cookout builder

The thing no other BBQ caterer in Indianapolis has. Guest count, event type,
meats, sides and service style produce a live estimate — and, more usefully,
a picture of **the actual pans that arrive**, because Shon's price list is
denominated in pans. Then "Send this to Shon" fills the quote form below it
with everything: guest count, event type, service style, budget range, menu
interest and a written summary.

### How it prices

All the numbers come from Stadium 1's real catering list. The estimator:

1. Works out meat servings needed — one per guest, plus a bit for each extra
   meat, since people sample instead of picking one
2. Works out side servings — less of each when there are more to choose from
3. Finds the cheapest set of pans covering that, shaped the way a caterer
   actually loads a van (full pans for the bulk, at most one half and two
   thirds for the remainder)
4. Adds the service percentage
5. Applies the event minimum
6. Shows a range around the result

Sanity check against what Shon reported in the packet:

| Event | Estimator says | Shon's stated range |
|---|---|---|
| 20 guests, 2 meats, 2 sides | $800 – $900 | $800 low end ✓ |
| 150 guests, 3 meats, 2 sides | $2,050 – $2,600 | sweet spot 100–200 ✓ |
| 350 guests, 2 meats, 2 sides | $4,625 – $5,900 | $5,000 high end ✓ |

### Changing prices

Everything lives in one `CONFIG` block and two arrays at the top of
`assets/js/estimator.js`. Nothing else needs touching.

```js
var CONFIG = {
  minimumEvent: 800,                          // smallest event you'll take
  serviceRate: { dropoff: 0.10, full: 0.22 }, // added for setup/serving
  rangeSpread: 0.12,                          // how wide the quoted range is
  guests: { min: 20, max: 400, step: 5, start: 150 },
  ...
};
```

If prices change on the menu page, change them here too — they're
deliberately kept in both places so the menu can show `.99` prices while the
estimate rounds to whole dollars.

---

## Deploying

The site is hosted on **Vercel**, deploying automatically from `main` on
this GitHub repo. Push and it ships; there is no build step. The review
build is at <https://stadium1bbq.revieweditmelo.com>.

`vercel.json` carries the redirects, a year-long immutable cache on
`/assets` (pages themselves stay uncached, so copy edits appear at once)
and two security headers.

Update the domain in `sitemap.xml` and in the `canonical` / `og:url` tags
if the site lands anywhere other than `stadium1bbq.com`.

### Redirect the old URLs when this replaces the live site

The current `stadium1bbq.com` has pages indexed by Google under different
addresses. If they are left to 404, that search traffic is thrown away.
Point them at the new equivalents:

| Old URL | Send to |
|---|---|
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
