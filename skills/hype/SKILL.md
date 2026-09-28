---
name: hype
description: Turn anything you want to promote — a project folder, a website, an app, an event, a product, a sale — into ready-to-post social media marketing videos (TikTok, Reels, Shorts, X, LinkedIn, YouTube) with music, captions and hashtags. Suggests marketing video ideas when you don't have one, or builds your idea directly when you do. Use when someone says "/hype", "make a promo video", "marketing video", "video for TikTok/Reels/Shorts", "promote this", "help me market this", "give me video ideas for …", or wants social content for something they made.
---

# /hype

You made something. Now make people care.

`/hype` is a marketing video studio in one skill. It understands what the user
wants to promote, pitches video ideas that fit the goal and the platform (or
takes the user's own idea), then writes, designs, scores and renders the videos
itself, and hands back post-ready copy for every platform.

## Invocation

```
/hype                                     # promote the current project, suggest ideas first
/hype https://example.com                 # promote a website
/hype my bakery's weekend croissant sale  # promote something described in words
/hype a 15s reel where the app roasts a messy desk --aspect 9:16
/hype --ideas 8                           # only brainstorm, don't render
/hype --auto --platform tiktok,linkedin   # skip the pick step, build the best idea
```

Options may come as flags or plain language ("make it vertical", "for LinkedIn",
"30 seconds", "no music"). Plain language wins over a default, and an explicit
flag wins over plain language.

| Option | Values | Default |
|---|---|---|
| `--aspect` | `9:16`, `16:9`, `1:1`, `4:5`, any `W:H`, or pixels `1080x1920`; comma-separate for several | from `--platform`; else `9:16` |
| `--platform` | `tiktok`, `reels`, `shorts`, `instagram` (feed), `x`, `linkedin`, `youtube`, `facebook`, `all` | inferred from goal + audience |
| `--duration` | seconds | per format (see references/platforms.md) |
| `--ideas [n]` | brainstorm n ideas (default 5) and stop | off |
| `--auto` | build the top idea without asking | off |
| `--count <n>` | build n different videos from the top ideas | 1 |
| `--tone` | preset (below) or freeform ("fake 90s infomercial") | inferred |
| `--goal` | `launch`, `signups`, `sales`, `downloads`, `event`, `awareness`, `feature`, `hiring`, `community` | inferred |
| `--audience` | who it's for | inferred |
| `--cta` | the call to action / link / handle | inferred, else asked |
| `--lang` | language for on-screen text and captions | the user's language |
| `--no-music`, `--no-sfx` | flags | music + sfx on |

**Aspect ratio.** The user decides. `--aspect` (or "vertical", "square",
"landscape", "4:5", "21:9", "1080x1350" in plain words) always wins. Several
values render several files from one composition (`video-9x16.mp4`,
`video-16x9.mp4`, …). Without it, derive from the platform (TikTok/Reels/Shorts
→ 9:16, Instagram feed → 4:5, X/LinkedIn → 1:1 or 16:9, YouTube → 16:9); with no
platform either, use 9:16 and say in one line how to get other sizes.

## Two modes

Decide this first — it determines whether you pitch or build.

**Build mode** — the user already described a video: a concept, a script, a
scene, a format ("a before/after reel", "a fake unboxing", "a countdown to
launch day"). Treat it as the brief. Fill small gaps yourself, do not pitch
alternatives, go straight to step 3. A short description of *the thing to
promote* ("my bakery's sale") is not a video idea; that's suggest mode.

**Suggest mode** — the user said what to promote but not what video to make,
or said nothing. Understand the subject, pitch ideas (step 2), let the user
pick, then build. With `--auto`, build the recommended idea without asking.
With `--ideas`, stop after pitching.

When unsure, it's suggest mode — but keep the pitch fast.

## Skill directory

`<skill-dir>` is the folder holding this `SKILL.md` (Claude Code prints it as
"Base directory for this skill"). Scripts live in `<skill-dir>/scripts/`,
runtime and template in `<skill-dir>/assets/`. Never guess an install path.

**First run on a machine:** `node <skill-dir>/scripts/doctor.mjs`. If anything
fails, `node <skill-dir>/scripts/doctor.mjs --fix` installs Playwright +
Chromium; ffmpeg must come from the OS (the doctor prints the command). Ask
before running installs that need `sudo`.

## Output

Everything goes in `hype-output/` in the current directory
(`hype-output-YYYY-MM-DD-HHmmss/` if it already exists):

```
hype-output/
  brief.md              what we're promoting, for whom, and why they'd care
  ideas.md              the pitched ideas (suggest mode)
  <video-slug>/
    plan.md             script + storyboard
    composition/        index.html, hype.js, components.css, assets/, music.m4a
    <video-slug>-9x16.mp4 / .jpg   one per aspect (poster = .jpg)
    captions.md         post copy per platform, hashtags, alt text
  work/                 stills, downloads, scratch
```

---

## Step 1 — Understand

**Read:** [references/understand.md](references/understand.md)

Work out what is being promoted and what success looks like: the thing, the
audience, the goal, the offer and CTA, the proof you're allowed to use, the
visual identity, and where it will be posted. Read the source material (code,
site, files, images the user gave) instead of asking about it.

Ask only when something blocks good work and can't be inferred (typically:
the CTA/link, or what a described-only product looks like). Ask at most
three short questions in one message; otherwise state your assumptions and go.

**Gate:** `brief.md` written.

## Step 2 — Pitch ideas (suggest mode)

**Read:** [references/ideas.md](references/ideas.md) and [references/platforms.md](references/platforms.md)

Generate a wide set of candidate concepts internally, score them, and pitch the
best 3–5 (or `--ideas n`), each using a different format. Write them to
`ideas.md` and show a compact version: number, title, format + platform +
aspect + length, the hook (the literal first two seconds), a 3-beat outline,
and why it will work for *this* audience. Mark one as recommended.

Then ask the user to pick: a number, several numbers, a mix ("2 with the hook
from 4"), or tweaks. That is the only mandatory question in the workflow.

**Gate:** the user picked (or `--auto` picked the recommended one).

## Step 3 — Script and storyboard

**Read:** [references/craft.md](references/craft.md)

Write `<slug>/plan.md`: angle, hook, beat-by-beat storyboard (on-screen text
verbatim, visuals, motion, timing), sound plan (mood, bpm, sfx cues on cuts),
and per-aspect layout notes. Durations sum to the target length.

**Gate:** storyboard complete; every on-screen line is readable in the time
given (~0.3s per word, counted once the line is fully in).

## Step 4 — Build

**Read:** [references/build.md](references/build.md)

1. `node <skill-dir>/scripts/new.mjs hype-output/<slug>/composition --aspect <first aspect> --duration <s>`
2. Replace the template scenes with the storyboard. Use real material from the
   source (UI, components, screenshots, product photos, copy, colors, fonts).
3. `node <skill-dir>/scripts/soundtrack.mjs --duration <s> --mood <mood> --sfx "<cues>" --out hype-output/<slug>/composition/music.m4a --beats hype-output/work/beats.json`
   (skip with `--no-music`; you may also use a track the user provides).
4. Render review stills for **every** requested aspect:
   `node <skill-dir>/scripts/render.mjs hype-output/<slug>/composition --aspect <list> --stills auto --out-dir hype-output/work/stills`
   Look at them. Fix overflow, collisions, cropped text, low contrast, content
   in platform UI zones, and muddy mid-transition frames. Repeat until clean.

**Gate:** every still, in every aspect, is postable.

## Step 5 — Render and deliver

**Read:** [references/deliver.md](references/deliver.md)

`node <skill-dir>/scripts/render.mjs hype-output/<slug>/composition --aspect <list> --poster <best settled second> --out hype-output/<slug>/<slug>.mp4`

Then write `captions.md` (post copy per platform, hashtags, alt text, the
first-comment/pin text) and tell the user where everything is, the angle in one
sentence, and offer: another idea from the list, a different tone, another
aspect, or a re-cut of one scene.

**Gate:** an `.mp4` and poster `.jpg` per aspect, and `captions.md`.

---

## Tones

| Tone | Feel |
|---|---|
| `bold` | Big type, fast cuts, high contrast. The short-form default. |
| `clean` | Calm, premium, Apple-style restraint. |
| `playful` | Bouncy motion, bright colors, jokes from the product itself. |
| `ugc` | Looks native to the feed: captions on a phone-shot feel, POV text, no polish. |
| `cinematic` | Trailer energy: dark, big claims, dramatic sound. |
| `deadpan` | Dry understatement; the joke is how serious it is. |
| `infomercial` | "But wait, there's more." Loud, earnest, retro. |
| `corporate` | LinkedIn-safe: clear value, credible, still not boring. |

Freeform direction refines or replaces a preset.

## Rules that always apply

- **Hook in the first second.** Text on screen at frame 1 — no logo intros, no fade from black.
- **Clear to a stranger.** After one watch: what it is, who it's for, what to do next.
- **Show the real thing.** Real UI, product, photos and copy beat abstract shapes.
- **Honest.** Never invent numbers, reviews, testimonials, customer logos, awards or press. If proof would help and none exists, use a claim the product can back, or leave a clearly marked placeholder and tell the user.
- **Readable.** Every line stays on screen long enough to read, inside the platform's safe zone, with strong contrast.
- **Works on mute.** Most feeds autoplay silent; the story must land from text and visuals alone.
- **One CTA.** End on a single clear action, on screen long enough to act on.
- **Rights-safe.** Only use assets the user owns or that are free to use; no copyrighted music, no other brands' logos as endorsements.
- **No secrets.** Never put API keys, emails, internal URLs, customer data or anything from `.env` files on screen or in captions.
