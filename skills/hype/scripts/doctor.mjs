#!/usr/bin/env node
// Check (and optionally fix) everything /hype needs to render.
//
//   node doctor.mjs                 report
//   node doctor.mjs --fix           npm install + download Chromium
//   node doctor.mjs --voice [--fix] also check/install the optional voiceover
//                                   engine (Kokoro, ~700 MB on disk)

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { SCRIPTS_DIR, findFfmpeg, loadPlaywright, parseArgs } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const fix = !!args.fix;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let failed = false;

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, hint) => {
  failed = true;
  console.log(`  ✗ ${m}${hint ? `\n      → ${hint}` : ''}`);
};
const run = (cmd, argv, cwd = SCRIPTS_DIR) => spawnSync(cmd, argv, { cwd, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0;

console.log('hype doctor\n');

// Node
const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok(`node ${process.versions.node}`);
else bad(`node ${process.versions.node} is too old`, 'install Node.js 18 or newer from https://nodejs.org');

// npm deps
if (!existsSync(join(SCRIPTS_DIR, 'node_modules', 'playwright')) && fix) {
  console.log('  … installing script dependencies');
  run(npm, ['install', '--no-audit', '--no-fund']);
}
const playwright = await loadPlaywright();
if (playwright) ok('playwright');
else bad('playwright is not installed', `node ${join(SCRIPTS_DIR, 'doctor.mjs')} --fix`);

// Chromium
if (playwright) {
  let exe = process.env.HYPE_CHROME || playwright.chromium.executablePath();
  if (!existsSync(exe) && fix) {
    console.log('  … downloading Chromium (one time, ~150 MB)');
    run(npx, ['playwright', 'install', 'chromium']);
    exe = playwright.chromium.executablePath();
  }
  if (existsSync(exe)) {
    try {
      const b = await playwright.chromium.launch({ executablePath: process.env.HYPE_CHROME || undefined });
      await b.close();
      ok('chromium launches');
    } catch (e) {
      bad('chromium is installed but will not start', process.platform === 'linux' ? `missing system libraries? try: sudo npx playwright install-deps chromium  (in ${SCRIPTS_DIR})` : e.message.split('\n')[0]);
    }
  } else {
    bad('chromium is not downloaded', `node ${join(SCRIPTS_DIR, 'doctor.mjs')} --fix`);
  }
}

// ffmpeg
const ff = findFfmpeg();
if (ff) {
  const v = spawnSync(ff, ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  ok(v.replace(/ Copyright.*/, ''));
} else {
  const how = { darwin: 'brew install ffmpeg', win32: 'winget install ffmpeg', linux: 'sudo apt install ffmpeg  (or your distro\'s package manager)' }[process.platform] || 'install ffmpeg';
  bad('ffmpeg not found on PATH', `${how} — or set FFMPEG_PATH`);
}

// Optional voiceover engine
const voiceDir = join(SCRIPTS_DIR, 'voice');
const hasVoice = () => {
  try {
    createRequire(join(voiceDir, 'package.json')).resolve('kokoro-js');
    return true;
  } catch {
    return false;
  }
};
if (args.voice) {
  if (!hasVoice() && fix) {
    console.log('  … installing the voice engine (one time, ~700 MB, a few minutes)');
    run(npm, ['install', '--no-audit', '--no-fund'], voiceDir);
  }
  if (hasVoice()) ok('voice engine (kokoro) — the model (~90 MB) downloads on first use');
  else bad('voice engine is not installed', `node ${join(SCRIPTS_DIR, 'doctor.mjs')} --voice --fix`);
} else if (hasVoice()) ok('voice engine (kokoro)');
else console.log('  · voice engine not installed (optional — only needed for --voice)');

console.log(failed ? '\nSome checks failed. Fix the items above, then run this again.' : '\nAll good. /hype is ready to render.');
process.exit(failed ? 1 : 0);
