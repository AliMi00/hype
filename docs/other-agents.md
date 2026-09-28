# Using /hype with other agents

`/hype` is a standard [Agent Skill](https://agentskills.io): a `SKILL.md` with
references and scripts. Any agent that can read files and run shell commands
can use it.

## Install

The quickest way for most agents is the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add https://github.com/AliMi00/hype --skill hype      # this project
npx skills add https://github.com/AliMi00/hype --skill hype -g   # every project
```

Or copy the folder into the agent's skills directory:

```bash
./install.sh --dir <agent-skills-dir>
```

Then set up the renderer once:

```bash
node <agent-skills-dir>/hype/scripts/doctor.mjs --fix
```

## Where agents look

| Agent | Discovery |
|---|---|
| Claude Code | `~/.claude/skills/hype/`, `.claude/skills/hype/`, or the plugin |
| Codex CLI | `.agents/skills/hype/` (walks up to the repo root) |
| opencode | `.opencode/skills/hype/` or `.agents/skills/hype/` |
| Google Antigravity | `.agents/skills/hype/` in the project, or its global skills folder |
| Cursor, Copilot, Gemini CLI, … | via `npx skills add`, or custom instructions (below) |

This repo ships symlinks at `.claude/skills/hype`, `.agents/skills/hype` and
`.opencode/skills/hype`, so opening the repo itself in those agents just works.

## Agents without skill support

Add this to the agent's custom instructions / rules file:

```text
When I ask for a marketing, promo or social media video (or run "/hype"),
read <path-to>/skills/hype/SKILL.md and follow it exactly. <skill-dir> in
that file means <path-to>/skills/hype.
```

## Windows

Git needs `git config core.symlinks true` (or `git clone -c core.symlinks=true`)
plus Developer Mode to check out the symlinks. If they don't work, copy
`skills/hype/` to the agent's skills directory instead. The scripts are plain
Node.js and run on Windows; install ffmpeg with `winget install ffmpeg`.
