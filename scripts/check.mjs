#!/usr/bin/env node
// Repo checks: skill structure, manifests, links, symlinks, and a scan for
// anything that looks like a secret. With --render it also smoke-tests the
// renderer and soundtrack (needs doctor.mjs to pass).
//
//   node scripts/check.mjs [--render]

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skills', 'hype');
const errors = [];
const fail = (m) => errors.push(m);
const read = (p) => readFileSync(join(root, p), 'utf8');

// SKILL.md frontmatter
const skillMd = read('skills/hype/SKILL.md');
const fm = skillMd.match(/^---\n([\s\S]*?)\n---/);
if (!fm) fail('SKILL.md has no frontmatter');
else {
  if (!/^name: hype$/m.test(fm[1])) fail('SKILL.md frontmatter: name must be "hype"');
  const desc = fm[1].match(/^description: (.+)$/m);
  if (!desc) fail('SKILL.md frontmatter: missing description');
  else if (desc[1].length > 1024) fail(`SKILL.md description is ${desc[1].length} chars (max 1024)`);
}

// Relative markdown links in the skill + docs resolve
const mdFiles = ['README.md', 'docs/other-agents.md', 'skills/hype/SKILL.md', ...['understand', 'ideas', 'platforms', 'craft', 'build', 'deliver'].map((n) => `skills/hype/references/${n}.md`)];
for (const f of mdFiles) {
  if (!existsSync(join(root, f))) {
    fail(`missing ${f}`);
    continue;
  }
  for (const [, target] of read(f).matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(join(root, dirname(f), target))) fail(`${f}: broken link → ${target}`);
  }
}

// Manifests
let plugin, market;
try {
  plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  market = JSON.parse(read('.claude-plugin/marketplace.json'));
  if (plugin.name !== 'hype') fail('plugin.json name must be "hype"');
  if (!market.plugins?.some((p) => p.name === plugin.name)) fail('marketplace.json does not list the plugin');
} catch (e) {
  fail(`manifest JSON: ${e.message}`);
}
const pkg = JSON.parse(read('skills/hype/scripts/package.json'));
if (plugin && pkg.version !== plugin.version) fail(`version mismatch: plugin.json ${plugin.version} vs scripts/package.json ${pkg.version}`);

// Discovery symlinks
for (const link of ['.claude/skills/hype', '.agents/skills/hype', '.opencode/skills/hype']) {
  const p = join(root, link);
  try {
    if (!lstatSync(p).isSymbolicLink() || readlinkSync(p) !== '../../skills/hype') fail(`${link} should be a symlink to ../../skills/hype`);
  } catch {
    fail(`${link} is missing`);
  }
}

// Runtime + template present
for (const f of ['assets/runtime/hype.js', 'assets/runtime/components.css', 'assets/template/index.html']) {
  if (!existsSync(join(skill, f))) fail(`missing skills/hype/${f}`);
}

// Secret scan over tracked files
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
} catch {}
const patterns = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/, 'API key (sk-…)'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/[A-Za-z0-9._%+-]+@(?:gmail|yahoo|hotmail|outlook|icloud|proton)\.[a-z]{2,}/i, 'personal email address'],
];
for (const f of tracked) {
  if (/\.(mp4|m4a|mp3|wav|jpg|jpeg|png|gif|webp|woff2?)$/i.test(f)) continue;
  if (/(^|\/)\.env(\.|$)/.test(f)) fail(`${f}: .env files must not be committed`);
  const full = join(root, f);
  if (!existsSync(full) || lstatSync(full).isSymbolicLink()) continue;
  const text = readFileSync(full, 'utf8');
  for (const [re, what] of patterns) if (re.test(text)) fail(`${f}: looks like it contains a secret (${what})`);
}

// Optional: smoke-test the tools end to end
if (process.argv.includes('--render') && !errors.length) {
  const tmp = mkdtempSync(join(tmpdir(), 'hype-check-'));
  const node = (script, args) => {
    const r = spawnSync(process.execPath, [join(skill, 'scripts', script), ...args], { encoding: 'utf8' });
    if (r.status !== 0) fail(`${script} ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
    return r;
  };
  try {
    node('new.mjs', [join(tmp, 'comp'), '--aspect', '9:16', '--duration', '3']);
    node('soundtrack.mjs', ['--duration', '3', '--mood', 'upbeat', '--sfx', 'whoosh@1,pop@2', '--out', join(tmp, 'comp', 'music.wav')]);
    node('render.mjs', [join(tmp, 'comp'), '--aspect', '9:16,1:1', '--stills', '0.5,2', '--out-dir', join(tmp, 'stills'), '--quiet']);
    node('render.mjs', [join(tmp, 'comp'), '--aspect', '16:9', '--audio', join(tmp, 'comp', 'music.wav'), '--poster', '1', '--out', join(tmp, 'v.mp4'), '--quiet']);
    for (const f of ['stills/9x16/sheet.png', 'stills/1x1/t002.00.png', 'v.mp4', 'v.jpg']) if (!existsSync(join(tmp, f))) fail(`smoke test: ${f} was not produced`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ all checks passed${process.argv.includes('--render') ? ' (including render smoke test)' : ''}`);
