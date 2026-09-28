# Platforms

Practical defaults for where the video will be posted. Platforms change their
limits often; these values are safe choices, not the maximums. When the user
names a size or length, use theirs.

## Sizes and lengths

| Platform | Default aspect | Pixels | Sweet-spot length | Notes |
|---|---|---|---|---|
| TikTok | 9:16 | 1080×1920 | 12–30s | Hook in <1s. Loops well = more watch time. |
| Instagram Reels | 9:16 | 1080×1920 | 10–30s | Grid crops the cover to ~3:4 — keep the poster's key text centered. |
| YouTube Shorts | 9:16 | 1080×1920 | 15–40s | Title matters; loops count. |
| Instagram feed | 4:5 | 1080×1350 | 10–30s | 1:1 also fine. Tallest feed format = most screen. |
| Facebook feed | 4:5 or 1:1 | 1080×1350 | 10–30s | Mostly watched on mute. |
| X (Twitter) | 16:9 or 1:1 | 1920×1080 / 1080×1080 | 10–45s | First frame is the thumbnail in the timeline. |
| LinkedIn | 1:1 or 4:5 (16:9 fine) | 1080×1080 | 20–60s | Professional tone, captions essential, value-first. |
| YouTube (long-form, ads, trailers) | 16:9 | 1920×1080 | 15–90s | Also good for landing pages and Product Hunt. |
| Stories (IG/FB) | 9:16 | 1080×1920 | ≤15s per story | Put the link/CTA in the sticker, keep text high. |

`--platform all` → render 9:16 + 1:1 + 16:9 from one responsive composition.

Anything else is fine too: `21:9` banner, `4:3`, `2:3` Pinterest, `1080x1350`.
The renderer accepts any ratio or pixel size.

## Safe zones (9:16)

Platform UI covers parts of a vertical video. Keep all text and key visuals
inside the safe area:

- **Top ~12%**: status bar, "Following / For You", search.
- **Bottom ~22%**: caption, username, music ticker, CTA button.
- **Right ~12%**: like / comment / share / profile column.
- **Left ~6%**: margin.

`components.css` has `.safe` with these insets, and portrait scenes in the
template already pad for them. For 1:1, 4:5 and 16:9 feeds, a 5–6% margin is enough.

## Captions and hashtags (for `captions.md`)

| Platform | Caption style | Hashtags |
|---|---|---|
| TikTok | 1–2 punchy lines + a question or CTA. Keywords matter (TikTok is a search engine). | 3–5 specific tags; one broad at most |
| Instagram (Reels/feed) | Hook line first (it's what shows before "more"), short value, CTA. Line breaks OK. | 3–5 relevant tags |
| YouTube Shorts | Title ≤ 60 chars with the keyword; description 1–2 lines. | 2–3 tags incl. `#shorts` |
| X | ≤ 280 chars, one idea, no hashtag spam. Link in the post or first reply. | 0–2 |
| LinkedIn | Hook line, 2–4 short lines of value or story, soft CTA, link in comments if reach matters. | 3–5 professional tags |
| Facebook | Friendly, 1–3 lines, clear CTA. | 0–3 |

Also write: **alt text** (one sentence describing the video for screen
readers), **cover text** (the words on the poster frame), and for TikTok/Reels
an **on-screen text** check (the video must make sense without sound).

## Burned-in captions

Short-form is watched on mute. If the video has spoken words (a user-supplied
voiceover), burn in captions. Otherwise the on-screen text *is* the caption:
large, high-contrast, 1–7 words per beat.
