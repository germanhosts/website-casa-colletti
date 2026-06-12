# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static two-page holiday rental website for Casa Colletti (casacolletti.com), deployed via GitHub Pages. No build tools, no package manager, no framework — just two self-contained HTML files.

## Previewing the site

Open `index.html` or `de.html` directly in a browser. No server required for most features; the availability calendar and hero slider work without one.

## File structure

- `index.html` — English version (canonical, served at `/`)
- `de.html` — German version (served at `/de/`)
- `images/` — all photos referenced by both pages
- `CNAME` — GitHub Pages custom domain (`casacolletti.com`)

## Dual-language rule

Both HTML files are near-identical in structure. **Every content, CSS, or JavaScript change must be applied to both files.** The CSS design tokens, layout classes, and JavaScript logic are duplicated — there is no shared stylesheet or shared script.

## Design tokens

CSS custom properties are defined in `:root` at the top of each `<style>` block:

```css
--lava: #2C2C2C    /* primary dark / text */
--mist: #F5F3EE    /* page background */
--limestone: #E8E4DC
--terracotta: #C4744A  /* accent / labels */
--forest: #4A5C3E  /* CTA / booking buttons */
--sea: #8BA8B5     /* range selection in calendar */
--light: #6B6B6B   /* body text */
```

## Updating availability (bookings)

The calendar is driven by a manually maintained `BOOKED` array near the bottom of each HTML file's `<script>` block. Both files must be updated when a booking is added or removed:

```js
const BOOKED = [
  { from: '2026-09-14', to: '2026-09-21' },
  { from: '2026-10-05', to: '2026-10-12' },
];
```

Format is `YYYY-MM-DD`. Both `from` and `to` are shown as booked (inclusive). The calendar will not allow guests to select a range that crosses a booked period.

## Pricing constants

Also in the `<script>` block of each file:

```js
const BASE_PRICE = 80;   // per night
const PER_GUEST = 10;    // extra per guest per night
// cleaning fee of €100 is added in the enquiry email body
```

## Section image sliders

Each content section has a `.sec-slider` div with `.sec-slide` children, arrow buttons (`data-dir="-1"` / `data-dir="1"`), and a dots container. These are initialized by JavaScript at the bottom of each file and driven by the `data-slider` attribute that matches the slider's `id`.

## Known issue — orphaned HTML in index.html

Lines 467–475 of `index.html` contain a floating `<div>` fragment (two stray `.sec-slide` elements and duplicated `.sec-arrows`/`.sec-dots` divs) outside any container. This is copy-paste residue from the house slider and has no effect on rendering, but it should be removed when editing that area.

## Contact and booking

- Email: `stefanie@germanhosts.com`
- The "Enquire for these dates" button generates a `mailto:` link pre-filled with dates, nights, guests, and estimated total.
- Airbnb link in the booking section points to `https://airbnb.com` (not a specific listing URL).
