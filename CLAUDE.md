# CLAUDE.md — Vanilla Concept

Context for Claude Code working in this repo. Read `README.md` first for structure and tokens.

## What this is

A static marketing site for a UAE home bakery taking bespoke commissions. Plain HTML/CSS/JS, no build step, no dependencies, no backend. Its job is to showcase the client's photographed work and push enquiries to WhatsApp.

## Non-negotiables

**No framework, no bundler.** Don't introduce React, Tailwind, Vite, npm, or a component library. The client needs to edit HTML directly. If a task seems to need a build step, it almost certainly doesn't.

**Five files repeat the header and footer.** There is no templating. Any nav, footer, or `<head>` change must be applied to `index.html`, `gallery.html`, `order.html`, `about.html`, and `contact.html` — all five, identically. Verify with grep afterwards.

**Every new string needs `data-ar`.** The site is bilingual EN/Arabic. Text without a `data-ar` attribute stays English when the user switches to Arabic. Inputs need `data-ar-ph` for placeholders. This is the single easiest thing to get wrong.

**Use logical CSS properties.** `inset-inline-start`, `margin-inline-end`, `padding-inline` — never `left`/`right`/`margin-left`. RTL mirroring depends on it.

**Don't touch the reveal-animation fallbacks.** In `styles.css`, `.reveal` is visible by default and only hidden once JS adds `.anim-ready` to `<html>`; `app.js` layers an IntersectionObserver, an in-view sweep, and a 2.2s force-visible timeout. This looks redundant and isn't — a simpler version previously shipped with content stuck invisible. Leave the layers in place.

## Conventions

- CSS is written compact: one-line rules, grouped by component with `/* comment */` dividers. Match that style.
- Colours come from the `:root` custom properties. Don't hardcode hex values.
- Layout uses flex/grid with `gap`. Don't space siblings with margins or source whitespace.
- Most edges are square. The design uses `border-radius` sparingly and deliberately — don't round things by reflex.
- Fonts load from Google Fonts in each page's `<head>`. Adding a family means editing all five links.

## Placeholders to replace

`971500000000` (WhatsApp, in `app.js` and every footer) and `instagram.com/vanillaconcept`. Grep before assuming they're done.

## Ordering flow

No cart, no payments. `order.html?product=<name>` pre-fills the form; submitting composes a message and opens `wa.me` in a new tab for the customer to send. Keep it this way unless explicitly asked — it's a deliberate fit for the business, not a limitation to solve.

## Content guidance

Product names are descriptive rather than brand names (the makeup-themed cake is "The Glam Box"). Preserve that. Prices were intentionally removed; the site sells capability, not SKUs.

## Before finishing any task

- Check the page in both EN and Arabic (`ع` toggle, top right).
- Check at 1440px, 900px, and 375px.
- Confirm no console errors.
