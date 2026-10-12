# Graphcent — Temporary brand experience

A standalone, single-page "coming soon" site for Graphcent, built to sit at
`www.graphcent.com` while the full Graphcent website is finished and deployed.

This is a **separate project** from the main Graphcent website codebase. It
does not touch, replace, or depend on it — it only reuses the same real
brand assets (logo, wordmark, colors, type) pulled directly from it, listed
below.

## What's here

- `index.html` — the whole page (top bar, hero, interactive mark, CTA, footer)
- `assets/css/style.css` — styles, using the same color tokens and type
  stack as the main site (`--ink`, `--paper`, `--volt`, `--sky`, Archivo /
  Inter Tight)
- `assets/js/script.js` — the typed headline, the countdown and the
  physics-driven mark
- `assets/vendor/matter.min.js` — matter.js 0.20.0, the same file the main
  Graphcent site already ships (no new dependency, served locally)
- `assets/logo/` — the actual Graphcent mark and wordmark SVGs, copied
  unmodified from the main site's `assets/logos/`

No build step. No framework.

## Sticky header

The top bar (wordmark + "Coming Soon") sticks to the top while scrolling,
on a solid background so nothing shows through. A hairline fades in under
it once the page has scrolled. Its height never changes, so the page
doesn't jump when it sticks. It sits above the mark's pieces, so a piece
thrown upward passes underneath it.

## The hero

Desktop: headline, intro and countdown on the left, the mark on the right,
filling the first screen. Tablet and phone: one column, mark below the
countdown. The headline is sized from its own column's width, so the
longest typed phrase always stays on one line at every screen size.

### Looping typed headline

"WE'RE BUILDING" stays put; the second line types a phrase, holds it,
deletes it and types the next. Phrases live in `index.html`, on the
`#typed` element:

```html
data-phrases='["WHAT’S NEXT.","BOLD BRANDS.","DIGITAL HOMES.","SHARP VISUALS."]'
```

Edit that list to change the copy. Keep each phrase around 14 characters or
fewer so it fits on one line on small phones. Screen readers get the
fixed sentence "We're building what's next." instead of the animation.
With reduced motion turned on, the line stays on "WHAT'S NEXT."

## The interactive mark

The mark is made of its 10 original facets (straight from the brand SVG,
not redrawn). Each facet is its own SVG layer placed in the exact same
spot, so on load they line up into the real mark.

Each facet is also a rigid body in a small physics world (matter.js) with
its true triangle shape, and **the whole hero section is that world**: its
sides are the walls and its bottom edge is the floor.

- **Grab** a facet (mouse, touch or pen) and it hangs from your pointer on
  an elastic tether, so it swings and rotates rather than snapping 1:1.
- **Let go** and it keeps its momentum, tumbles, rotates, collides with the
  other facets and collapses all the way down to the bottom of the hero.
- **It comes apart like a real stack.** Every facet knows which facets it
  rests on. Pull one out and the facets sitting on it fall too, so pulling
  a bottom piece collapses the stack above it. A facet moving fast enough
  knocks loose any resting facet it hits.
- **Reset arrangement** (a real, keyboard-reachable button) flies every
  piece home along a smooth curve to the exact original mark.
- Speeds are capped and the walls are thick, so nothing tunnels through the
  floor, gets flung off-screen or causes horizontal scroll.
- On phones, a touch that starts on a facet grabs the facet instead of
  scrolling the page. This is enforced in JavaScript (not just CSS
  `touch-action`, which iOS Safari ignores on SVG shapes). Swiping anywhere
  else still scrolls the page normally.
- The world rebuilds itself whenever the layout changes (rotation, window
  resize, fonts loading), so the floor always matches the section.
- With reduced motion turned on there is no gravity: you can still move
  pieces, but nothing falls or collapses.

## Launch countdown

A live days/hours/minutes/seconds countdown sits under the hero copy,
counting down to the real launch date. The date itself is never printed
anywhere in the page — only the ticking numbers — so it's set once, near
the top of `assets/js/script.js`:

```js
var TARGET = new Date('2026-10-26T00:00:00+01:00').getTime();
```

Change that line (and only that line) if the launch date moves. When it
hits zero, the label switches to "Launching now" and the timer stops.

## Social sharing preview

`og-image.jpg` (1200×630, in the site root) is the card shown when the link
is shared on WhatsApp, X, LinkedIn, Slack etc. The Open Graph and
`twitter:card` tags in `index.html` point to it at
`https://graphcent.com/og-image.jpg`, so it must stay in the root folder.
Replace the file (same name, same size) to change the card.

## Real contact details used

Pulled from the live site's footer partial, not invented:

- Email: `hello@graphcent.com`
- Instagram: `https://instagram.com/graphcent`
- Location: Kano, Nigeria

No phone number, fake stats or analytics were added.

## Deploying

This folder is ready to deploy to Netlify as its **own, separate** site
(drag-and-drop the folder, or connect it to its own Netlify project — do
not point it at the same Netlify project as the main Graphcent website
repo, so the two stay independent).

Once it's deployed and you have its Netlify URL, point `www.graphcent.com`
at it by updating the domain's DNS yourself (or asking your host to) —
nothing here touches DNS or your existing deployment automatically, and
the main website project's source and config are completely untouched.

When the full site is ready, repoint the domain to that deployment and
this temporary project can be retired.
