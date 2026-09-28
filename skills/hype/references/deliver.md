# Step 5 — Render and deliver

## Render

```bash
node <skill-dir>/scripts/render.mjs hype-output/<slug>/composition \
  --aspect 9:16,1:1,16:9 --poster 6.2 --out hype-output/<slug>/<slug>.mp4
```

- One `.mp4` per aspect (`<slug>-9x16.mp4`, …), H.264 + AAC, `faststart`,
  30fps — accepted by every platform.
- `--poster <s>`: the strongest *settled* frame (text fully in, not
  mid-transition, ideally the hook or the product at its best). It's saved as
  `<slug>-<aspect>.jpg` and baked in as frame 0, so every platform's thumbnail
  shows it without changing duration or audio sync.
- For one aspect the file is exactly `--out`.
- Rendering is roughly real-time ×3–5; tell the user it's running.

After rendering, sanity-check one output: `ffprobe` duration and size, and
pull a frame or two to confirm audio + video are right.

## `captions.md`

```markdown
# <Title> — post copy

## TikTok
<hook line>
<1 line of value / a question>
<CTA>
#tag1 #tag2 #tag3

## Instagram Reels
…

## YouTube Shorts
**Title:** …
**Description:** …

## X
…

## LinkedIn
…

**Cover text:** words on the poster frame
**Alt text:** one sentence describing the video
**Voiceover script:** the narration lines (only when the video has a voice)
**First comment / pin:** link + one line
**Best practice:** e.g. "post the 9:16 to TikTok/Reels/Shorts, the 1:1 to LinkedIn/X"
```

Only include the platforms that fit the request (all of them for `--platform
all`). Write each natively — don't paste the same caption everywhere. Hashtags
are specific (the niche and the audience), never a wall of generic tags. No
"excited to share". Match the video's language and tone.

## Tell the user

Short and useful:

1. Where the files are (videos per aspect, posters, captions).
2. The angle in one sentence.
3. Anything they should check or replace (a placeholder, a link, a claim).
4. Next moves: *another idea from the list*, *a different tone*, *more sizes*,
   *re-cut one scene*, or *a series* (3 variants of the hook for A/B testing).

Keep `hype-output/` as the record of the work; don't delete the composition —
it's how scenes get re-cut quickly.
