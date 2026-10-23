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
work on a static site), then in `catering/index.html` and `about/index.html`:

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

Still worth confirming with Shon:

- **Family meals are a "Working Model".** Her own sheet says *"these prices
  are not yet fully cost-engineered"* and lists what still needs verifying
  (meat weights, container sizes, packaging cost). They are live at
  $60/$90/$120 because she asked for them to be, but they are the one set of
  numbers on the site she has not signed off as final.
- **Servers per guest.** $25 a server is hers; one server per 50 guests is
  still the builder's assumption (`guestsPerServer`).
- **Event delivery.** $25–$200 by distance, from the Square catalog, still
  applies to event catering. The new $5–$10 fee is family-meal delivery only
  and appears in the family meals terms.
- **Repast photograph.** Shon asked for fried chicken, mashed potatoes and
  green beans. No such photograph exists in the library yet, so that card
  keeps its current plate — swap it when the photo arrives.

Two things her notes referenced but were not in the folder: the **FAQ** and
the **Hendricks County Winter Market dates**.

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

Serving counts are assumptions, not from the sheet: an entrée half pan feeds
about 12 and a full pan 24; a side half pan about 15 and a full pan 30; a
6 qt pot of chili or chowder about 24 eight-ounce servings.

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

Asset URLs in the HTML carry `?v=10`. If you change a stylesheet or script
and want it to land instantly for everyone — including anyone holding a
stale copy — bump that number everywhere it appears:

```
grep -rl '?v=' */index.html | xargs sed -i '' 's/?v=10/?v=11/g'
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
