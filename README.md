# Vanilla Concept — Website

Bespoke homemade cakes, cupcakes and iced cookies. UAE.

A **static site**: plain HTML, one CSS file, one JS file. No build step, no framework, no dependencies. Open `index.html` and it runs.

---

## Run locally

Any static server (needed so relative asset paths resolve):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Structure

```
index.html          Home — hero slider, occasion tiles, 3 collection rows, values, story, newsletter
gallery.html        Filterable grid of all 12 designs
order.html          Enquiry form that composes a WhatsApp message
about.html          Story + values
contact.html        WhatsApp / Instagram / delivery areas
styles.css          Entire design system (CSS custom properties at :root)
app.js              Language toggle, hero slider, nav, filters, form handlers
assets/
  logo-cake.png     Gold geometric tiered-cake mark (transparent background)
  photos/*.jpg      12 product photographs
```

Every page is self-contained and repeats the header/footer markup inline. There is no templating layer — **if you change the nav or footer, change it in all five files.**

---

## Before going live

Three placeholders must be replaced:

| What | Where | Current value |
|---|---|---|
| WhatsApp number | `app.js` line 3, `window.VC_WHATSAPP` | `971500000000` |
| WhatsApp number | `contact.html`, `index.html`/all footers — `wa.me/971500000000` links | same |
| Instagram handle | footers + `contact.html` — `instagram.com/vanillaconcept` | verify handle |

Search for `971500000000` across the repo to catch them all.

The newsletter form (`#news-form` in `app.js`) currently only shows a thank-you message — **it does not persist the email anywhere.** Wire it to Mailchimp/Klaviyo/a form endpoint before promoting it.

---

## How ordering works

There is no cart or payment. Product cards link to `order.html?product=<name>`, which pre-fills the enquiry form. On submit, `app.js` composes a formatted message and opens `https://wa.me/<number>?text=<encoded>` in a new tab. The customer reviews and sends it themselves.

This is deliberate — it suits a homemade business taking bespoke commissions, and it means no backend.

---

## Bilingual EN / ع

Handled entirely client-side in `app.js` via `applyLang()`.

- Any element with a `data-ar="…"` attribute has its `textContent` swapped. The English original is cached into `data-en` on first run.
- Inputs use `data-ar-ph="…"` for placeholder translation.
- The toggle sets `<html lang>` and `<html dir>`; `dir="rtl"` drives all mirroring.
- Choice persists to `localStorage` under `vc-lang`.

**When adding any new copy, add its `data-ar` twin.** Untranslated text silently stays English.

Layout uses logical properties (`inset-inline-start`, `margin-inline-end`, `padding-inline`) so RTL mirrors automatically — keep using these rather than `left`/`right`.

---

## Design tokens

All in `:root` in `styles.css`.

**Colour**

| Token | Hex | Use |
|---|---|---|
| `--cream` | `#fdf8f5` | page background |
| `--cream-2` | `#f9efe9` | alternating section tint |
| `--blush` | `#f3c9d4` | script accent on dark |
| `--blush-soft` | `#fbe6ea` | chip / icon backgrounds |
| `--rose` | `#e8b9c6` | — |
| `--mauve` | `#c98da0` | script accent on light, focus ring |
| `--gold` | `#c4a05c` | hairline borders, icons |
| `--gold-deep` | `#a9863f` | eyebrow text, links, primary button |
| `--gold-soft` | `#e7d4a8` | accents on dark |
| `--ink` | `#3a2b28` | body text, dark sections, primary button |
| `--ink-soft` | `#7b6862` | secondary text |
| `--line` | `#ecdfd9` | all borders |

**Type**

- `--script` — Parisienne (Aref Ruqaa in Arabic). Logotype and headline accents only.
- `--display` — Jost (El Messiri in Arabic). Headings, buttons, labels, nav.
- `--body` — Mulish (Tajawal in Arabic). Paragraphs, inputs, product names.

Arabic overrides live in the `html[lang="ar"]` block, which reassigns all three variables plus a few size/line-height corrections. Parisienne has no Arabic glyphs, hence the swap — don't remove it.

Eyebrows: 11px, uppercase, `letter-spacing:.36em` (reduced to `.1em` in Arabic).
Buttons: 11.5px, uppercase, `letter-spacing:.14em`.

**Other**

- `--radius: 14px` (used sparingly — most edges are square by design)
- `--shadow: 0 18px 44px -30px rgba(90,55,50,.5)`
- `--maxw: 1380px` container, `28px` gutter (`18px` under 560px)
- Section padding: `clamp(52px, 7vw, 88px)`
- Breakpoints: `1040px` (nav → burger), `900px` (splits stack), `560px` (mobile)

---

## Components worth knowing

**Hero slider** (`.hero`) — absolutely-positioned `.slide` elements cross-faded via the `.on` class, 6.5s autoplay, arrows and dots. Advancing is `go(n)` in `app.js`. Adding a slide = add the markup and a dot button; the JS counts them.

**Collection rows** (`.prod-row`) — CSS grid with `grid-auto-flow: column` and `scroll-snap-type: x mandatory`. Native horizontal scroll, no JS.

**Reveal-on-scroll** — elements with `.reveal` fade up. Content is **visible by default**; the hiding rule only applies once JS adds `.anim-ready` to `<html>`. There's also an IntersectionObserver, an in-view sweep, and a 2.2s hard fallback. This belt-and-braces approach exists because the animation previously got stuck with content invisible — **don't simplify it to a plain `opacity:0` default**, and respect `prefers-reduced-motion`, which skips the entrance entirely.

---

## Content notes

- Product names are descriptive, not brand names — the photo of the makeup-themed cake is "The Glam Box", not the retailer's name. Keep it that way; the designs are custom commissions referencing themes the client requested.
- Prices were deliberately removed. The site showcases capability and drives enquiries. If prices return, add a `.price` div under `.prod h3` (the class still exists in `styles.css`).
- Photos are the client's own work. Preserve `loading="lazy"` on everything below the fold and keep `alt` text descriptive.

---

## Deploy

Static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages. No build command; publish directory is the repo root.

Worth doing before launch: compress the JPEGs (several are 200KB+), add a `favicon.ico`, and add real Open Graph images per page.
