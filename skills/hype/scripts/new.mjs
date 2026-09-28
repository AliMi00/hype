#!/usr/bin/env node
// Scaffold a composition folder: the starter template + the hype.js runtime.
//
//   node new.mjs <dir> [--aspect 9:16] [--duration 15] [--force]
//
// Re-running with --runtime-only refreshes hype.js + components.css without
// touching index.html.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SCRIPTS_DIR, die, parseArgs, resolveSize } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const dir = args._[0] && resolve(args._[0]);
if (!dir) die('usage: node new.mjs <composition-dir> [--aspect 9:16] [--duration 15]');

const assets = join(SCRIPTS_DIR, '..', 'assets');
mkdirSync(join(dir, 'assets'), { recursive: true });
for (const f of ['hype.js', 'components.css']) copyFileSync(join(assets, 'runtime', f), join(dir, f));

if (!args['runtime-only']) {
  const target = join(dir, 'index.html');
  if (existsSync(target) && !args.force) die(`${target} already exists (use --force to overwrite)`);
  let html = readFileSync(join(assets, 'template', 'index.html'), 'utf8');
  const size = resolveSize(args.aspect || '9:16');
  html = html
    .replace(/width: 1080, height: 1920/, `width: ${size.width}, height: ${size.height}`)
    .replace(/duration: 14/, `duration: ${Number(args.duration) || 14}`);
  writeFileSync(target, html);
}

console.log(`composition ready → ${dir}`);
console.log(`preview: open ${join(dir, 'index.html')} in a browser (or: node ${join(SCRIPTS_DIR, 'preview.mjs')} ${dir})`);
