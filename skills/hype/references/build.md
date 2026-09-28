# Step 4 — Build the composition

A composition is one HTML page. `hype.js` turns it into a timeline: every
frame is a pure function of time, so the renderer can seek to any frame and
screenshot it. You write normal HTML/CSS/JS; the runtime handles timing.

## Scaffold

```bash
node <skill-dir>/scripts/new.mjs hype-output/<slug>/composition --aspect 9:16 --duration 15
```

This writes `index.html` (a starter to replace), `hype.js`, `components.css`
and an `assets/` folder. Copy images/videos/fonts you use into `assets/`.

## Units and layout

- **1rem = 1% of the stage's short side.** Write all sizes in rem; the same
  page renders correctly at 1080×1920, 1920×1080, 1080×1080, 1080×1350…
- The stage (`#stage`) has `data-orientation="portrait|landscape|square"`.
  Use it for layout switches:

  ```css
  .split { display: flex; flex-direction: column; gap: 4rem; }
  [data-orientation="landscape"] .split { flex-direction: row; }
  ```
- CSS variables on the stage: `--t` (time, s), `--duration`, `--w`, `--h`,
  `--aspect`. On each scene: `--p` (0→1 progress through the scene),
  `--local` (seconds since scene start). Use them in `calc()`:

  ```css
  .bg { scale: calc(1 + var(--p) * 0.08); }               /* slow push-in */
  .orb { translate: calc(sin(var(--t) * 1rad) * 10rem) 0; } /* drifting */
  ```

## Declarative timeline

```html
<section class="scene" data-start="0" data-end="3.2" data-out="fade">
  <h1 data-split="words" data-in="up" data-at="0.1" data-stagger="0.08">Stop doing this by hand</h1>
  <img src="assets/before.png" data-in="zoom" data-at="0.6">
</section>
```

| Attribute | Meaning |
|---|---|
| `data-start`, `data-end` | Scene is visible in [start, end). Overlap scenes for transitions. |
| `data-in` | Entrance: `fade up down left right zoom pop blur wipe wipe-up wipe-down drop spin` |
| `data-at` | Entrance time, **relative to the scene start** (default 0) |
| `data-dur` | Entrance duration (default 0.6) |
| `data-ease` | Override ease: `outCubic outExpo outBack outElastic inOutCubic linear …` |
| `data-out` | Exit type (same names). Default time: scene end − 0.4s |
| `data-out-at`, `data-out-dur` | Exit time (relative to scene) and duration |
| `data-split="words\|chars"` | Split text; each piece gets the entrance, staggered |
| `data-stagger` | Delay between pieces (default 0.07 words, 0.03 chars) |
| `<video data-start data-offset>` | Video synced to the timeline (muted; use the soundtrack for audio) |

The runtime animates with the individual `translate`, `scale`, `rotate`
properties plus `opacity`/`filter`/`clip-path`, so your own `transform` on the
same element is kept. CSS `@keyframes` animations are also seeked to the
timeline automatically (they start at t=0 — use `animation-delay` for timing).

## Script API

```js
hype
  .config({ width: 1080, height: 1920, fps: 30, duration: 15, background: '#0b0b12', audio: 'music.m4a' })
  .update((t, h) => {
    // runs every frame; t = seconds. Make everything a pure function of t.
    h.typewriter(el, 'prompt: make me a logo', t, 2.0, 22);          // text, start, chars/sec
    h.count(num, 0, 4800, t, 5, 6.5);                                // from, to, t0, t1
    cursor.style.left = h.tween(t, 3, 3.8, 20, 64, 'inOutCubic') + 'rem';
    card.style.setProperty('--tap', h.progress(t, 3.8, 4.3));        // 0..1
    if (t > 4) toggle.classList.add('on'); else toggle.classList.remove('on');
  })
  .start();
```

`h.ease.*`, `h.progress(t, t0, t1, ease)`, `h.tween(t, t0, t1, from, to, ease)`,
`h.lerp`, `h.clamp`, `h.local(el, t)`, `h.orientation`, `h.width`, `h.height`.

Rules: no `Date.now()`, no `setTimeout`/`setInterval`, no unseeded
`Math.random()` in visuals, no CSS `transition` for timed effects. Anything
that depends on wall-clock time will render wrong. The renderer overrides
`width`/`height` from `--aspect`, so never hard-code pixel layout from them.

## Components (`components.css`)

- `.phone > .screen` — phone mockup; put real app UI or a screenshot inside.
- `.browser > .bar (i,i,i,span) + .page` — browser window for web products.
- `.terminal` — for CLIs and dev tools; pair with `h.typewriter`.
- `.caption` (`.dark`, `.accent`) — the native short-form text box look.
- `.outline-text` — readable white text over busy footage.
- `.pill`, `.pill.ghost`, `.badge`, `.card`.
- `.cursor`, `.tap` — fake pointer and tap ripple (`--tap` 0→1).
- `.progress` — thin top progress bar that fills over the video.
- `.safe` — the platform safe area per orientation; `.fill`, `.cover`,
  `.center`, `.stack`, `.row`, `.grain`.

Override brand colors with `--c-accent`, `--c-fg`, `--c-bg`, `--c-radius`.

## Using real material

- **From a project:** reuse its real stylesheet, fonts, logo, icons and
  component markup. Copy the CSS/markup into the composition (or `<link>` a
  copied stylesheet from `assets/`) and fill it with demo data. Real UI > a
  drawing of UI.
- **From a site:** download the logo, hero images and screenshots into
  `assets/`; rebuild key sections with its real copy, colors and fonts rather
  than panning over one flat screenshot.
- **Photos:** use `object-fit: cover`, slow push-ins, and crop for each
  orientation with `object-position`.
- **Fonts:** Google Fonts `<link>` with `display=block`, or `@font-face` from
  `assets/`. The runtime waits for fonts before the first frame.

## Soundtrack

```bash
node <skill-dir>/scripts/soundtrack.mjs --duration 15 --mood upbeat \
  --sfx "whoosh@2.0,pop@2.6,pop@3.1*0.6,typing@4-5.2,ding@5.4,riser@9-11,impact@11,sparkle@13" \
  --out hype-output/<slug>/composition/music.m4a --beats hype-output/work/beats.json
```

Moods: `upbeat playful chill lofi corporate epic tense hype`. `--bpm`, `--key`
(`C`, `F#`, `A`…) and `--seed` (a different variation) are optional. It prints
the downbeats — line scene cuts up with them where it reads well. The music
resolves on a final hit ~1s before the end; don't put the CTA's first
appearance after that hit. `--sfx-gain`/`--music-gain` rebalance the mix.

If the user supplies music, use it (set `audio` in `hype.config`) — only if
they have the rights.

## Preview

```bash
node <skill-dir>/scripts/preview.mjs hype-output/<slug>/composition
```

Prints a local URL that plays the video live (space = play/pause, ←/→ = step).
Give it to the user if they want to watch before the final render.

## Review stills — required

```bash
node <skill-dir>/scripts/render.mjs hype-output/<slug>/composition \
  --aspect 9:16,1:1 --stills auto --out-dir hype-output/work/stills
```

`auto` captures the settled middle of every scene plus just before and just
after every cut (mid-transition). Open `sheet.png` — all stills on one
labelled image — then zoom into single stills where needed. Check: text fits
and isn't clipped; nothing important in the platform UI zones; contrast; no
collisions; layout makes sense in every orientation; transitions aren't
muddy. Fix and re-check. With several aspects, each gets its own subfolder.
Use `--still <t> --out file.png` to inspect a single moment.

If the page fails to become ready, the renderer prints page errors — fix those
first (usually a JS error or a missing asset).
