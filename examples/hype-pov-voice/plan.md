# POV: your launch video took one line

**Angle:** idea #2 from [`../hype-about-hype/ideas.md`](../hype-about-hype/ideas.md). A native-looking POV post where the punchline is the finished video playing on a phone.
**Format:** POV · **Tone:** ugc · **Length:** 15s · **Aspects:** 9:16, 1:1, 16:9
**Palette / type:** cream #fff3e4, ink #1d1712, orange #ff6a3d · Inter 900, JetBrains Mono
**Voice:** `af_heart` (warm US female), captions in white/orange boxes, 3 words at a time
**Sound:** `playful`, 124 bpm, music ducked under the voice, -14 LUFS

| # | Time | Visual | On-screen text | Voice | Sound |
|---|---|---|---|---|---|
| 1 | 0.0–3.0 | Cream background | "POV:" / "your launch video" / "took one line" | "Okay. No video editor this time." | pops per box |
| 2 | 3.0–7.0 | Terminal | "literally just this" · `/hype --voice` + status lines | "I typed one line," · "and it pitched me five ideas." | whoosh, typing, pops |
| 3 | 7.0–11.5 | Phone playing a real /hype video | "it made this" | "Then it made the whole thing." · "Music, captions, every size." | whoosh, pop |
| 4 | 11.5–15.0 | Logo type + pill | "/hype" · "free · open source" · github.com/AliMi00/hype | "It's free. Go hype your thing." | impact, sparkle |

**Per-aspect notes:** tag sits beside the phone in 1:1/16:9 and above it in 9:16; the phone shrinks in 1:1 to stay clear of the captions.

## Commands

```bash
node skills/hype/scripts/voice.mjs --script vo.json --out composition/voice.wav --voice af_heart --duration 15
node skills/hype/scripts/soundtrack.mjs --duration 15 --mood playful --voice composition/voice.wav --out composition/audio.m4a \
  --sfx "pop@0.02*0.5,pop@0.37*0.5,pop@0.82*0.6,whoosh@3,typing@3.35-4.2*0.5,pop@4.9*0.4,pop@5.3*0.4,whoosh@7,pop@7.2*0.5,whoosh@11.5,impact@11.6*0.7,sparkle@12.3*0.8"
node skills/hype/scripts/render.mjs composition --aspect 9:16,1:1,16:9 --poster 1.5 --out hype-pov-voice.mp4
```
