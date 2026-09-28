# Step 3 — Script and storyboard

## The shape

Most short marketing videos follow this shape. Bend it when the idea needs to.

```
Hook (0–2s) → Setup / problem (2–5s) → Payoff: 2–3 beats of the product doing its thing → Proof (optional) → CTA (2–4s)
```

- **Hook**: on screen from frame 1. Words + a visual that creates a question.
- **Setup**: the pain, the "before", the relatable moment. Short.
- **Payoff**: the product delivering, shown not told. This is most of the video.
- **Proof**: a real number, real quote, real result — only if we have it.
- **CTA**: one action. Name/logo + the link/handle/place + a verb. Hold ≥ 2s.

Keep total length to the platform sweet spot. Shorter is almost always better.

## Writing on-screen text

- 1–7 words per beat. One idea per screen.
- Speak like the audience, not like a press release. Concrete nouns, strong verbs.
- Banned: "revolutionary", "seamless", "game-changer", "unlock", "elevate",
  "streamline your workflow", "in today's fast-paced world", "excited to share".
- Numbers beat adjectives ("in 9 seconds" > "blazing fast") — only real numbers.
- Readability: ~0.3s per word + 0.5s, counted from when the line is fully on
  screen. A 5-word line holds ≥ 2s. Pace comes from motion and cuts, not from
  pulling text away early.
- Big: body text ≥ 4rem, headlines 8–14rem (1rem = 1% of the short side).

## The plan file

`<slug>/plan.md`:

```markdown
# <Title>
**Angle:** one sentence. **Format:** … **Tone:** … **Length:** 15s **Aspects:** 9:16, 1:1
**Hook:** exact text + visual.
**Palette / type:** hex colors, fonts (from the brand).
**Sound:** mood, bpm (from soundtrack.mjs), sfx cues.

| # | Time | Visual | On-screen text | Motion / transition | Sound |
|---|---|---|---|---|---|
| 1 | 0.0–2.0 | Messy spreadsheet, zooming in | "Still doing this by hand?" | words pop in, slow push | whoosh @1.9 |
| … |

**Per-aspect notes:** what moves where in 16:9 / 1:1.
**CTA:** exact text, how long it holds.
```

## Tone → pacing → sound

| Tone | Scenes (per 15s) | Transitions | Motion | soundtrack mood |
|---|---|---|---|---|
| bold | 5–7 | hard cuts, zoom punches | fast in, hold | `hype` or `upbeat` |
| clean | 3–4 | soft fades, slides | slow, eased, lots of space | `corporate` or `chill` |
| playful | 4–6 | pops, bounces | outBack / elastic | `playful` |
| ugc | 4–6 | jump cuts | minimal, caption boxes | `lofi` or `upbeat` (low) |
| cinematic | 3–5 | dips to black, wipes | slow push-ins, big type | `epic` |
| deadpan | 3–4 | straight cuts, long holds | almost none | `chill` |
| infomercial | 6–8 | star wipes, zooms | over the top | `playful` or `hype` |
| corporate | 4–5 | slides, fades | smooth, restrained | `corporate` |

## Motion language

- Everything that enters should enter with intent: from the direction it's
  going, eased out (`outCubic`, `outExpo`), 0.3–0.7s.
- Stagger groups (words, cards, list items) by 0.05–0.12s.
- Keep something moving at all times — a slow push-in (scale 1 → 1.06) on a
  held frame is enough.
- Show the product *being used*: a cursor clicking, text being typed, a toggle
  flipping, a number counting up, a phone scrolling. Alive beats static.
- Cut on the beat: use the downbeats printed by `soundtrack.mjs` for scene
  starts where it doesn't hurt readability.
- Transitions between busy layouts: stagger them (out, then in) or dip through
  a solid color. A crossfade of two busy screens looks muddy.

## Sound design

- Music under everything, sfx on the cuts and key moments: `whoosh` into a
  transition, `pop` when a card lands, `click`/`typing` for UI, `ding` for a
  success state, `riser` → `impact` into the big reveal, `sparkle` on the logo.
- Place a whoosh so its peak lands on the cut (whoosh@<cut time>).
- Fewer, better sounds. Repeated little sounds stay quiet (`pop@3*0.5`).
- The video must still work muted.

## Multiple aspects

Design once, lay out per orientation. Use rem units and the stage's
`data-orientation` (`portrait`, `landscape`, `square`) for layout switches:
stack vertically in portrait, side-by-side in landscape, tighter in square.
Plan these in the storyboard's per-aspect notes, and check every aspect's stills.
