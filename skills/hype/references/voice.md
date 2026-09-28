# Voiceover (`--voice`)

Voice is **off by default**. Turn it on only when the user asks: `--voice`,
"add a voiceover", "narrate it", "with a voice". The user can also bring their
own recording (`--voice-file vo.mp3`), which needs no setup.

## Setup (one time)

```bash
node <skill-dir>/scripts/doctor.mjs --voice          # check
node <skill-dir>/scripts/doctor.mjs --voice --fix    # install (~700 MB, a few minutes)
```

The engine is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), an
open-weight (Apache-2.0) TTS model that runs locally. No API key, nothing is
sent anywhere. The model (~90 MB) downloads on first use. Tell the user
before installing, since it's large.

## Writing narration

- **Complement, don't read.** The voice adds what the screen doesn't say. If
  the screen says "You shipped it. Nobody saw it.", the voice says "Launch
  day. Crickets."
- **Short lines.** 2–8 words each, one per beat. Talk like a person: contractions, rhythm, the audience's words.
- **Speech is slower than you think.** Kokoro speaks ~2.5–3 words/second.
  Budget ~0.4s per word and leave ≥ 0.15s between lines.
- **First line within the first second.** The hook works in sound too.
- **End on the CTA,** said plainly ("Hype. Free and open source."), while it's on screen.
- Keep numbers and names easy to say. Write them how they're spoken
  ("twenty-four seven", "v two") if the model stumbles.
- The on-screen text still has to work on mute.

Pick a voice that fits the tone (`node <skill-dir>/scripts/voice.mjs --list-voices`):

| Tone | Voices |
|---|---|
| bold / hype | `am_michael`, `af_bella`, `am_puck` |
| clean / corporate | `af_heart` (default), `af_sarah`, `bm_george` |
| playful | `am_puck`, `af_bella`, `af_nova` |
| cinematic | `am_fenrir`, `am_onyx`, `bm_fable` |
| ugc / casual | `af_heart`, `am_eric`, `af_river` |
| deadpan | `bm_lewis`, `am_adam` |

English voices (US `a*`, UK `b*`). For other languages, ask the user for a
recording (`--voice-file`) instead.

## The narration file

Put the lines in the storyboard (`plan.md` gets a **Voice** column), then write
`hype-output/<slug>/vo.json`, with times on the video timeline:

```json
[
  { "at": 0.15, "text": "Launch day. Crickets." },
  { "at": 2.7,  "text": "So give it one line." },
  { "at": 13.0, "text": "Hype. Free and open source.", "voice": "am_michael" }
]
```

## Generate, mix, caption

```bash
# 1. speech → voice.wav + voice.json (real timings, word timings for captions)
node <skill-dir>/scripts/voice.mjs --script hype-output/<slug>/vo.json \
  --out hype-output/<slug>/composition/voice.wav --voice am_michael --duration <s>

# 2. music + sfx + voice in one track; music ducks under the voice
node <skill-dir>/scripts/soundtrack.mjs --duration <s> --mood <mood> --sfx "<cues>" \
  --voice hype-output/<slug>/composition/voice.wav --out hype-output/<slug>/composition/audio.m4a
```

`voice.mjs` prints each line's real start–end and **warns when a line runs
into the next one or past the end**. Fix every warning by shortening the text
(best) or moving the next line later (and the scene with it), then run it
again. Don't speed the voice up past `--speed 1.15`; it starts sounding rushed.

With a user recording, skip step 1 and pass it as `--voice their-vo.mp3` to
step 2. For captions, write `voice.json` yourself with the lines' times
(`{"lines":[{"at":0.2,"end":1.6,"text":"…","words":[{"w":"…","start":0.2,"end":0.5},…]}]}`),
or leave captions to the on-screen text.

Then in the composition:

```js
hype.config({ …, audio: 'audio.m4a', captions: 'voice.json' })
```

```html
<div class="vo-captions" data-captions="chunk" data-chunk="3"></div>
```

Caption modes: `chunk` (a few words at a time, the short-form default),
`line` (the whole line with spoken words lit), `word` (one huge word at a time,
for high-energy edits). The word being spoken gets `.now` (accent color). Style
it via `.vo-captions` in the composition's CSS.

Captions sit in the lower safe area by default. **Check the review stills:**
captions must not cover the product or on-screen text. Move them
(`.vo-captions { bottom: … }`) or trim on-screen text the voice now says.

`--duck 0.65` (default) sets how far the music dips under speech,
`--voice-gain` the voice level. The final track is loudness-normalized to
-14 LUFS.
