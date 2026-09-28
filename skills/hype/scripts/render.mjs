#!/usr/bin/env node
// Render a hype composition (an HTML page driven by hype.js) to MP4, PNG stills
// or a poster frame. Every frame is captured by seeking the page to an exact
// time, so the output is deterministic no matter how fast the machine is.
//
//   node render.mjs <composition-dir|index.html> [options]
//
//   --out <file>          output .mp4 (default: <comp>/../video.mp4)
//   --aspect <list>       9:16, 16:9, 1:1, 4:5, W:H or WxH; comma-separate for
//                         several variants (files get a -9x16 style suffix)
//   --fps <n>             override the composition fps
//   --audio <file>        mux this audio track (default: the composition's
//                         `audio` setting, if any)
//   --poster <seconds>    save <out>.jpg from this time and bake it in as frame 0
//   --still <seconds>     render one PNG instead of a video (use with --out)
//   --stills <list|auto>  render several PNGs into --out-dir; "auto" picks the
//                         middle of every scene plus every scene boundary
//   --crf <n>             x264 quality, lower is better (default 18)
//   --quiet               no progress output

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { die, findFfmpeg, loadPlaywright, parseArgs, resolveSize, serveDir } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input || args.help) {
  console.log('usage: node render.mjs <composition-dir|index.html> [--out video.mp4] [--aspect 9:16,16:9] [--poster 3.5] [--still 2 | --stills auto]');
  process.exit(input ? 0 : 1);
}

let compDir = resolve(input);
let page = 'index.html';
if (existsSync(compDir) && !statSync(compDir).isDirectory()) {
  page = basename(compDir);
  compDir = dirname(compDir);
}
if (!existsSync(join(compDir, page))) die(`no ${page} in ${compDir}`);

const playwright = await loadPlaywright();
if (!playwright) die('playwright is not installed. Run: node doctor.mjs --fix');
const ffmpeg = findFfmpeg();
const needsFfmpeg = !args.still && !args.stills;
if (needsFfmpeg && !ffmpeg) die('ffmpeg not found. Install it (brew/apt/winget install ffmpeg) or run: node doctor.mjs --fix');

const log = args.quiet ? () => {} : (...m) => console.error(...m);
const sizes = args.aspect ? String(args.aspect).split(',').map((s) => resolveSize(s)) : [null];

const { server, url } = await serveDir(compDir);
let browser;
try {
  browser = await playwright.chromium.launch({
    executablePath: process.env.HYPE_CHROME || undefined,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-web-security', '--font-render-hinting=none'],
  });
} catch (err) {
  server.close();
  die(`could not start Chromium (${err.message.split('\n')[0]}). Run: node doctor.mjs --fix`);
}

try {
  for (const size of sizes) {
    await renderOne(size, sizes.length > 1);
  }
} finally {
  await browser.close();
  server.close();
}

async function openPage(size) {
  const viewport = size ? { width: size.width, height: size.height } : { width: 1080, height: 1920 };
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.addInitScript((s) => {
    window.__HYPE_RENDER__ = s || {};
  }, size && { width: size.width, height: size.height });
  await p.goto(`${url}/${page}`, { waitUntil: 'load' });
  const ok = await p
    .waitForFunction(() => window.hype && window.hype.isReady, null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    const hint = errors.length ? `\npage errors:\n  ${errors.join('\n  ')}` : '';
    die(`composition never became ready — is hype.js loaded and hype.start() called?${hint}`);
  }
  const info = await p.evaluate(() => window.hype.info());
  if (!size) await p.setViewportSize({ width: info.width, height: info.height });
  if (errors.length) log(`warning: page reported errors:\n  ${errors.join('\n  ')}`);
  return { p, ctx, info };
}

async function seek(p, t) {
  await p.evaluate((t) => window.hype.seek(t), t);
}

function suffixed(file, size, multi) {
  if (!multi || !size) return file;
  const ext = extname(file);
  return `${file.slice(0, file.length - ext.length)}-${size.label}${ext}`;
}

async function renderOne(size, multi) {
  const { p, ctx, info } = await openPage(size);
  const fps = Number(args.fps) || info.fps;
  const label = `${info.width}x${info.height}`;

  // Single still.
  if (args.still !== undefined) {
    const out = suffixed(resolve(args.out || join(compDir, '..', 'still.png')), size, multi);
    mkdirSync(dirname(out), { recursive: true });
    await seek(p, Number(args.still));
    await p.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png' });
    log(`still ${args.still}s → ${out}`);
    await ctx.close();
    return;
  }

  // Contact sheet of stills, for reviewing layout before a full render.
  if (args.stills !== undefined) {
    const baseDir = resolve(args['out-dir'] || join(compDir, '..', 'work', 'stills'));
    const dir = multi && size ? join(baseDir, size.label) : baseDir;
    mkdirSync(dir, { recursive: true });
    let times;
    if (args.stills === true || args.stills === 'auto') {
      times = [];
      for (const s of info.scenes) {
        // Just before and after each cut (mid-transition), then the settled middle.
        if (s.start > 0) times.push(s.start - 0.15, s.start + 0.25);
        times.push((s.start + s.end) / 2);
      }
      times.push(info.duration - 1 / fps);
      times = times.filter((t) => t >= 0 && t < info.duration);
      times = [...new Set(times.map((t) => +t.toFixed(2)))].sort((a, b) => a - b);
    } else {
      times = String(args.stills).split(',').map(Number);
    }
    const shots = [];
    for (const t of times) {
      await seek(p, t);
      const name = `t${t.toFixed(2).padStart(6, '0')}.png`;
      const buf = await p.screenshot({ path: join(dir, name) });
      shots.push({ t, buf });
    }
    const sheet = await contactSheet(shots, info);
    await writeFile(join(dir, 'sheet.png'), sheet);
    log(`${times.length} stills (${label}) → ${dir}  (overview: ${join(dir, 'sheet.png')})`);
    await ctx.close();
    return;
  }

  // Video.
  const out = suffixed(resolve(args.out || join(compDir, '..', 'video.mp4')), size, multi);
  mkdirSync(dirname(out), { recursive: true });
  const total = Math.round(info.duration * fps);
  let audio = args['no-audio'] ? null : args.audio ? resolve(args.audio) : info.audio ? resolve(compDir, info.audio) : null;
  if (audio && !existsSync(audio)) {
    log(`warning: audio ${audio} not found — rendering silent`);
    audio = null;
  }

  let poster = null;
  if (args.poster !== undefined) {
    await seek(p, Number(args.poster));
    poster = await p.screenshot({ type: 'png' });
    const posterJpg = out.replace(/\.mp4$/i, '') + '.jpg';
    await p.screenshot({ path: posterJpg, type: 'jpeg', quality: 92 });
    log(`poster ${args.poster}s → ${posterJpg}`);
  }

  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) ffArgs.push('-i', audio);
  ffArgs.push(
    '-map', '0:v',
    '-c:v', 'libx264',
    '-preset', args.preset || 'medium',
    '-crf', String(args.crf || 18),
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-movflags', '+faststart',
  );
  if (audio) ffArgs.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad');
  ffArgs.push('-t', (total / fps).toFixed(3), out);

  const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => {
    ff.on('error', fail);
    ff.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`))));
  });
  const write = (buf) =>
    new Promise((ok, fail) => {
      ff.stdin.write(buf, (err) => (err ? fail(err) : ok()));
    });

  const started = Date.now();
  for (let i = 0; i < total; i++) {
    let buf;
    if (i === 0 && poster) buf = poster;
    else {
      await seek(p, i / fps);
      buf = await p.screenshot({ type: 'png' });
    }
    await write(buf);
    if (!args.quiet && process.stderr.isTTY && (i % fps === 0 || i === total - 1)) {
      const pct = Math.round(((i + 1) / total) * 100);
      process.stderr.write(`\rrendering ${label} ${pct}% (${i + 1}/${total})`);
    }
  }
  ff.stdin.end();
  await done;
  await ctx.close();
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  log(`${process.stderr.isTTY ? '\r' : ''}${label} ${info.duration}s @ ${fps}fps${audio ? ' + audio' : ''} → ${out} (${secs}s)`);
}

// One labelled overview image of all stills, so a whole aspect can be
// reviewed at a glance.
async function contactSheet(shots, info) {
  const cols = info.width >= info.height ? 3 : 5;
  const cellW = info.width >= info.height ? 480 : 300;
  const cellH = Math.round((cellW * info.height) / info.width);
  const ctx = await browser.newContext({ viewport: { width: cols * (cellW + 12) + 12, height: 200 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const cells = shots
    .map(({ t, buf }) => {
      const scene = info.scenes.find((s) => t >= s.start && t < s.end);
      return `<figure><img src="data:image/png;base64,${buf.toString('base64')}"><figcaption>${t.toFixed(2)}s · ${scene ? scene.id : ''}</figcaption></figure>`;
    })
    .join('');
  await p.setContent(`<style>
    body{margin:0;padding:12px;background:#222;font:14px system-ui;color:#ddd;display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:12px}
    figure{margin:0} img{display:block;width:${cellW}px;height:${cellH}px;outline:1px solid #444}
    figcaption{padding:4px 2px 0}
  </style>${cells}`);
  const buf = await p.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}
