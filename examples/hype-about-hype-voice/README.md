# /hype about /hype — with voiceover

The same video as [`../hype-about-hype`](../hype-about-hype), made with
`/hype --voice af_heart` (Kokoro-82M, warm US female voice). The narration adds to the on-screen text instead
of reading it, and the captions come from the voice timings.

- `vo.json`: the narration lines on the timeline
- `composition/voice.json`: real line and word timings from `voice.mjs` (drives the captions)
- `composition/audio.m4a`: music + sfx + voice, music ducked under speech, -14 LUFS

```bash
node skills/hype/scripts/voice.mjs --script vo.json --out composition/voice.wav --voice af_heart --duration 16
node skills/hype/scripts/soundtrack.mjs --duration 16 --mood upbeat --voice composition/voice.wav --out composition/audio.m4a \
  --sfx "whoosh@2.54,typing@2.9-3.8*0.7,pop@4.1*0.4,pop@4.5*0.5,ding@4.9*0.7,whoosh@6.1,pop@6.5*0.5,pop@6.65*0.5,pop@6.8*0.5,click@8.4,whoosh@10.17,swipe@10.9,swipe@11.6,riser@11.3-12.71,impact@12.71,sparkle@13.4"
node skills/hype/scripts/render.mjs composition --aspect 9:16 --poster 1.6 --out hype-about-hype-voice-9x16.mp4
```
