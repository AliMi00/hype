# Changelog

## 0.1.0 — first release

`/hype` turns anything you want to promote into ready-to-post social media
videos.

### Added

- **The `/hype` skill.** Understands a project, website, files or a plain
  description, writes a brief, pitches scored video ideas (20 marketing
  angles), or builds your own idea directly. Storyboards, builds, reviews and
  renders the video, then writes post copy per platform.
- **Any aspect ratio.** `--aspect 9:16,1:1,16:9,4:5` or any `W:H` / `WxH`,
  several at once from one composition, with platform safe zones.
- **`hype.js` runtime.** Declarative scenes and enter/exit animations,
  deterministic frame-by-frame timing, rem units that scale to every size,
  synced `<video>`, seeked CSS animations, live browser preview.
- **`components.css`.** Phone, browser and terminal mockups, short-form
  caption boxes, cursor and tap, progress bar, safe area.
- **Renderer.** Headless Chromium → ffmpeg, H.264 + AAC, poster baked in as
  frame 0, review stills with a labelled contact sheet.
- **Soundtrack.** Synthesized, royalty-free music in 8 moods with a beat grid,
  11 sound effects, loudness-normalized to -14 LUFS.
- **Voiceover (optional).** `--voice` narrates locally with Kokoro (28 English
  voices, no API key), with timing warnings, music ducking and word-by-word
  captions. `--voice-file` uses your own recording.
- **Install** as a Claude Code plugin, with `npx skills add`, or with
  `install.sh`. Discovery symlinks for Codex, opencode and Antigravity.
  `doctor.mjs` checks and installs dependencies.
- Three example videos with their briefs, ideas, storyboards and captions.

### Known limitations

- Tested on Linux (Ubuntu) with Claude Code and Antigravity. macOS and Windows
  are untested.
- Built-in voices are English only; use `--voice-file` for other languages.
- Caption word timings are estimated from word length.
- First setup downloads Chromium (~150 MB); voice adds ~700 MB plus a ~90 MB
  model.
