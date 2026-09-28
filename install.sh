#!/usr/bin/env bash
# Install the /hype skill and its render dependencies.
#
#   curl -fsSL https://raw.githubusercontent.com/AliMi00/hype/main/install.sh | bash
#   ./install.sh                     # from a clone
#   ./install.sh --dir ~/my/skills   # somewhere else (any agent's skills folder)
#   ./install.sh --project           # into ./.claude/skills of the current project
#   ./install.sh --no-deps           # copy the skill only, skip Playwright/Chromium
#   ./install.sh --voice             # also install the voiceover engine (~700 MB)
#
# Default target: ~/.claude/skills/hype (Claude Code, all projects).

set -euo pipefail

REPO="https://github.com/AliMi00/hype"
TARGET_ROOT="${HOME}/.claude/skills"
DEPS=1
VOICE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) TARGET_ROOT="$2"; shift 2 ;;
    --project) TARGET_ROOT="$(pwd)/.claude/skills"; shift ;;
    --no-deps) DEPS=0; shift ;;
    --voice) VOICE=1; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

say() { printf '\033[1m%s\033[0m\n' "$*"; }

command -v node >/dev/null 2>&1 || { echo "Node.js 18+ is required: https://nodejs.org" >&2; exit 1; }

# Use the local checkout when run from one, otherwise fetch the repo.
SRC=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/skills/hype/SKILL.md" ]; then
  SRC="$SCRIPT_DIR/skills/hype"
else
  command -v git >/dev/null 2>&1 || { echo "git is required to download /hype" >&2; exit 1; }
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  say "Downloading /hype…"
  git clone --depth 1 --quiet "$REPO" "$TMP/hype"
  SRC="$TMP/hype/skills/hype"
fi

DEST="$TARGET_ROOT/hype"
say "Installing /hype → $DEST"
mkdir -p "$TARGET_ROOT"
if [ -d "$DEST" ]; then
  # Keep installed dependencies (and the downloaded voice model) across updates.
  if [ -d "$DEST/scripts/node_modules" ]; then mv "$DEST/scripts/node_modules" "$TARGET_ROOT/.hype-node_modules"; fi
  if [ -d "$DEST/scripts/voice/node_modules" ]; then mv "$DEST/scripts/voice/node_modules" "$TARGET_ROOT/.hype-voice-node_modules"; fi
  rm -rf "$DEST"
fi
mkdir -p "$DEST"
(cd "$SRC" && tar cf - --exclude node_modules --exclude .DS_Store .) | (cd "$DEST" && tar xf -)
if [ -d "$TARGET_ROOT/.hype-node_modules" ]; then mv "$TARGET_ROOT/.hype-node_modules" "$DEST/scripts/node_modules"; fi
if [ -d "$TARGET_ROOT/.hype-voice-node_modules" ]; then mv "$TARGET_ROOT/.hype-voice-node_modules" "$DEST/scripts/voice/node_modules"; fi

if [ "$DEPS" = 1 ]; then
  say "Setting up the renderer (Playwright + Chromium, one time)…"
  if [ "$VOICE" = 1 ]; then
    node "$DEST/scripts/doctor.mjs" --fix --voice || true
  else
    node "$DEST/scripts/doctor.mjs" --fix || true
  fi
fi

cat <<EOF

Done. Restart your agent, then in any project try:

  /hype
  /hype https://your-site.com --aspect 9:16,1:1
  /hype a 15s reel where my app roasts a messy desk

EOF
