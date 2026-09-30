**You made something. Now make people care.**

`/hype` is an agent skill that turns whatever you want to promote (a project, a website, an app, an event, a sale) into ready-to-post social media videos for TikTok, Reels, Shorts, X, LinkedIn and YouTube.

### What it does

- **Pitches ideas or builds yours.** Say what to promote and it writes a brief and pitches 3–5 scored video ideas. Describe a video and it builds that.
- **Any size.** `--aspect 9:16,1:1,16:9,4:5`, or any ratio, rendered from one composition.
- **Finished videos.** Motion design, a royalty-free soundtrack generated for the exact cut, sound effects on the beats, a poster frame, and post copy + hashtags for each platform.
- **Optional voiceover.** `--voice` narrates locally with Kokoro (28 English voices, no API key), ducks the music and adds word-by-word captions. `--voice-file` uses your own recording.

### Install

```bash
# Claude Code
/plugin marketplace add AliMi00/hype
/plugin install hype@hype

# Any agent
npx skills add https://github.com/AliMi00/hype --skill hype

# One-liner
curl -fsSL https://raw.githubusercontent.com/AliMi00/hype/main/install.sh | bash
```

Needs Node.js 18+ and ffmpeg. Then just ask your agent: `/hype`

### Known limitations

- Tested on Linux (Ubuntu) with Claude Code and Antigravity. macOS and Windows reports are welcome.
- Built-in voices are English only.
- Caption word timings are estimated.

Full list in [CHANGELOG.md](https://github.com/AliMi00/hype/blob/main/CHANGELOG.md). Feedback, ideas and example videos welcome: open an issue.
