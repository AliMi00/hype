# You shipped it. Nobody saw it.

**Angle:** the silent launch, fixed in one line. **Format:** Pain → fix **Tone:** bold **Length:** 16s **Aspects:** 9:16, 16:9, 1:1
**Palette / type:** #0c0a14, #ff3d71, #ffc53d, #8b5cf6 · Space Grotesk, JetBrains Mono
**Sound:** `upbeat`, 118 bpm, scenes cut on downbeats; final hit at 14.75s.

| # | Time | Visual | On-screen text | Motion | Sound |
|---|---|---|---|---|---|
| 1 | 0.00–2.54 | Dark, drifting light | "You shipped it." / "Nobody saw it." | words rise, second line pops; slow push-in | — |
| 2 | 2.54–6.10 | Terminal | "Type one line." · `/hype my indie app` + 3 status lines | typing, lines slide in | whoosh on cut, typing, pops, ding |
| 3 | 6.10–10.17 | Three idea cards | "Get ideas that fit." · "…or bring your own idea." | cards stagger up, cursor taps #1 | whoosh, pops, click |
| 4 | 10.17–12.71 | Frame morphing 9:16 → 1:1 → 16:9 | "Every size." | frame resizes on the beat | swipes, riser |
| 5 | 12.71–16.00 | Logo type + pill | "/hype" · "Marketing videos from one line. Free & open source." · github.com/AliMi00/hype | blur in, pill pops | impact, sparkle |

**Per-aspect notes:** cards stack in 9:16/1:1 and sit in a row in 16:9; hook never wraps.
**CTA:** on screen from 13.4s to the end (2.6s).

## Commands

```bash
node skills/hype/scripts/soundtrack.mjs --duration 16 --mood upbeat --out composition/music.m4a \
  --sfx "whoosh@2.54,typing@2.9-3.8*0.7,pop@4.1*0.4,pop@4.5*0.5,ding@4.9*0.7,whoosh@6.1,pop@6.5*0.5,pop@6.65*0.5,pop@6.8*0.5,click@8.4,whoosh@10.17,swipe@10.9,swipe@11.6,riser@11.3-12.71,impact@12.71,sparkle@13.4"
node skills/hype/scripts/render.mjs composition --aspect 9:16,16:9,1:1 --poster 1.6 --out hype-about-hype.mp4
```
