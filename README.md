# /hype

**You made something. Now make people care.**

[![/hype — "You shipped it. Nobody saw it."](examples/hype-about-hype/hype-about-hype-16x9.jpg)](examples/hype-about-hype/hype-about-hype-16x9.mp4)

`/hype` is an agent skill that turns anything you want to promote (a project,
a website, an app, a product, an event, a sale) into **ready-to-post social
media videos**: TikTok, Reels, Shorts, X, LinkedIn, YouTube.

- **No idea yet?** It reads what you're promoting, works out who it's for, and
  pitches 3–5 video ideas (hook, format, platform, length) for you to pick.
- **Already have an idea?** Describe it in a sentence and it builds it.
- **Any size.** 9:16, 16:9, 1:1, 4:5, or any ratio you ask for. Several at
  once, from one composition.
- **Finished, not a draft.** Motion design, a royalty-free soundtrack
  generated for the exact cut, sound effects on the beats, a poster frame, and
  post copy + hashtags written for each platform.

The video above was made by `/hype` about itself. See
[`examples/hype-about-hype`](examples/hype-about-hype) for the brief, ideas,
storyboard, captions and source.

## Install

**Claude Code (plugin):**

```bash
/plugin marketplace add AliMi00/hype
/plugin install hype@hype
```

**Any agent** (Claude Code, Codex, Cursor, Copilot, Gemini CLI, opencode, …)
via the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add https://github.com/AliMi00/hype --skill hype
```

Add `-g` to install it for every project.

**Or the one-liner** (copies to `~/.claude/skills/hype` and sets up the renderer):

```bash
curl -fsSL https://raw.githubusercontent.com/AliMi00/hype/main/install.sh | bash
```

<details>
<summary>Manual install</summary>

```bash
git clone https://github.com/AliMi00/hype
cp -R hype/skills/hype ~/.claude/skills/hype        # or your agent's skills folder
node ~/.claude/skills/hype/scripts/doctor.mjs --fix  # Playwright + Chromium, one time
```

Restart your agent afterwards. More agents: [`docs/other-agents.md`](docs/other-agents.md).
</details>

### Requirements

- An agent that supports Agent Skills (or custom instructions)
- Node.js 18+
- ffmpeg on `PATH` (`brew install ffmpeg` / `sudo apt install ffmpeg` / `winget install ffmpeg`)
- Chromium for rendering, installed by `doctor.mjs --fix` (≈150 MB, one time)

Check everything with `node <skill-dir>/scripts/doctor.mjs`. On first run the
skill checks this itself.

## Use it

```text
/hype
```
Promote the project you're in. It reads the code, writes a brief, pitches
ideas, and asks which one to make.

```text
/hype https://my-bakery.com weekend croissant sale, for Instagram
/hype our AI meetup this Friday 7pm at the library --aspect 9:16,1:1
/hype a 15s before/after reel: messy spreadsheet → my app's dashboard
/hype --ideas 8                     just brainstorm
/hype --auto --platform all         pick the best idea and render every size
/hype --tone "90s infomercial"      any tone you can describe
```

| Option | What it does |
|---|---|
| `--aspect 9:16,1:1,16:9` | Output sizes: any `W:H` or `WxH`. Plain words work too ("vertical", "square"). |
| `--platform tiktok,linkedin` | Pick formats, lengths and caption style per platform (`all` = 9:16 + 1:1 + 16:9). |
| `--ideas [n]` | Only pitch ideas. |
| `--auto` | Don't ask, build the recommended idea. |
| `--count n` | Build n different videos. |
| `--duration 20` | Target length in seconds. |
| `--tone bold` | `bold` `clean` `playful` `ugc` `cinematic` `deadpan` `infomercial` `corporate`, or freeform. |
| `--goal signups` | `launch` `signups` `sales` `downloads` `event` `awareness` `feature` `hiring` `community` |
| `--audience "…"` `--cta "…"` `--lang es` | Steer who it's for, what they should do, and the language. |
| `--no-music` `--no-sfx` | Silence. |

You get:

```
hype-output/
  brief.md                  who it's for and why they'd care
  ideas.md                  the pitched ideas
  <video>/
    plan.md                 script + storyboard
    <video>-9x16.mp4 / .jpg one per aspect, poster baked in as frame 0
    captions.md             post copy per platform, hashtags, alt text
    composition/            the editable source, to re-cut any scene
```

## How it works

1. **Understand.** Reads your project, site, files or description and writes a brief:
   audience, pain, promise, proof, CTA, brand.
2. **Pitch.** Generates candidate ideas across 20 marketing angles (pain → fix,
   POV, before/after, speed demo, myth vs fact, countdown, …), scores them for
   hook, clarity, fit and makeability, and shows you the best few.
3. **Storyboard.** Beat-by-beat script with readable on-screen text, timing
   and sound cues, planned for mute autoplay and platform safe zones.
4. **Build.** The agent writes the video as an HTML page on top of `hype.js`,
   a tiny timeline runtime where every frame is a pure function of time and
   layouts adapt to any aspect ratio. It reuses your real UI, colors and fonts.
5. **Score.** `soundtrack.mjs` synthesizes a music bed (8 moods) and sound
   effects timed to the cuts. No samples, so it's all royalty-free.
6. **Render & check.** `render.mjs` screenshots every frame in headless
   Chromium into ffmpeg. The agent reviews contact sheets of every scene in every
   aspect before the final render.

You can use the tools without an agent too:

```bash
node skills/hype/scripts/new.mjs my-video/composition --aspect 9:16 --duration 15
node skills/hype/scripts/preview.mjs my-video/composition          # live preview in the browser
node skills/hype/scripts/soundtrack.mjs --duration 15 --mood upbeat --sfx "whoosh@2,impact@8" --out my-video/composition/music.m4a
node skills/hype/scripts/render.mjs my-video/composition --aspect 9:16,1:1 --poster 2 --out my-video/video.mp4
```

## What's in this repo

- `skills/hype/`: the skill (`SKILL.md`, references, runtime, template, scripts)
- `examples/`: example runs with every intermediate file
- `docs/`: install notes for other agents
- `.claude-plugin/`: Claude Code plugin + marketplace manifest
- `.claude/skills/hype`, `.agents/skills/hype`, `.opencode/skills/hype`: symlinks for agent discovery
- `install.sh`: one-line installer

## Inspiration

Inspired by [/brag](https://github.com/latent-spaces/brag), which makes a launch
video for a project you built. `/hype` is for marketing anything, on every
platform, and starts from ideas.

## Contributing

Ideas, new formats, moods, components and example videos are welcome. Open an
issue or a PR. Run `node scripts/check.mjs` before sending one.

## License

[MIT](LICENSE)
