# Step 1 — Understand what we're promoting

Good marketing videos come from understanding, not from templates. Spend the
effort here; everything downstream gets easier.

## Recognize the input

| Input | How to recognize it | Where the material comes from |
|---|---|---|
| Project | No subject given and the current directory is a project, or a path | The code, README, assets |
| Website | An `http(s)://` URL or a bare domain | The live site |
| Files | Images, videos, PDFs, decks, menus the user attached or pointed to | The files themselves |
| Description | Plain words: "my bakery's weekend sale", "our AI meetup on Friday" | The user's words, plus anything they can share |

Inputs combine: "promote this repo, here's our logo" is project + files.

If there's nothing to go on — no subject, not in a project — ask one question:
what should we promote?

### Project

- README, landing page / main route, marketing copy, `package.json` or
  equivalent (name, description, keywords), changelog / release notes.
- Styles: exact brand colors, fonts, logo files, icons, screenshots in the repo.
- The product **in use**: find the 2–3 moments that show it working
  (entry → key action → result). Components, routes and demo data tell you
  what those moments look like.
- If the user points at one part (a new release, a feature), that's the focus.
- **Never** read or reuse `.env*`, credentials, private keys, customer data or
  anything that looks secret. They must never appear in a video or caption.

### Website

Get the site as a visitor sees it. A plain fetch of a JavaScript-heavy site can
return an empty shell; if so, open it with the renderer's Playwright:

```js
// node --input-type=module, run from <skill-dir>/scripts so playwright resolves
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'networkidle' });
// dismiss cookie banners, scroll section by section, screenshot, read copy
```

Collect: headline, tagline, section headings, feature names, pricing/offer,
calls to action, social-preview tags; colors and fonts from the CSS; logo,
product shots, demo videos (download what you'll use into `work/`). Only use
testimonials, stats and logos that are actually on the site.

### Files

Look at every image the user gives you. Product photos become hero shots; a
menu or flyer gives you real copy and prices; a deck gives you claims and
numbers you're allowed to use.

### Description only

You have the least material, so infer a lot and say what you inferred. Build
visuals from typography, color, simple illustration and the user's words. Ask
(one message, max three questions) only for what truly blocks you — usually:

1. The call to action (link, handle, date/place, code).
2. Photos or a logo, if the video would be generic without them.
3. Anything factual the video must say (price, dates) that you'd otherwise invent.

## The brief

Write `hype-output/brief.md`:

```markdown
# Brief — <name>

**What it is:** one plain sentence a stranger understands.
**For whom:** the specific audience (not "everyone"), and what they care about.
**The pain or desire:** what's true in their life before they find this.
**The promise:** what changes for them. In their words, not ours.
**Why this, not the alternatives:** the one differentiator worth a video.
**Proof we can use:** real numbers, quotes, logos, demos — with where each came from. "None yet" is a valid answer.
**Goal of the campaign:** launch / signups / sales / downloads / event / awareness / feature / hiring / community.
**Call to action:** exactly what the viewer should do, and the link/handle/place.
**Voice & tone:** how the brand talks; any words to use or avoid.
**Visual identity:** colors (hex), fonts, logo, textures, reference visuals.
**Platforms & formats:** where this will be posted, aspect ratios requested.
**Material available:** UI screens, photos, videos, copy blocks we can reuse.
**Constraints:** length, language, legal lines, things not to say.
**Assumptions:** anything we inferred rather than read.
```

Keep it short and concrete. A brief full of adjectives ("innovative",
"seamless") has not understood the product yet — go back to the source.
