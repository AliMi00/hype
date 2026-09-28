// Shared helpers for the hype scripts: arg parsing, ffmpeg/playwright lookup,
// aspect ratio math and a tiny static file server.

import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const SCRIPTS_DIR = resolve(fileURLToPath(import.meta.url), '..', '..');
const require = createRequire(join(SCRIPTS_DIR, 'package.json'));

// --key value / --key=value / --flag / positionals
export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq !== -1) { args[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

export function die(msg, code = 1) {
  console.error(`hype: ${msg}`);
  process.exit(code);
}

// Named platform presets and plain ratios, resolved to even pixel sizes.
export const ASPECTS = {
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '4:3': [1440, 1080],
  '3:4': [1080, 1440],
  '2:3': [1080, 1620],
  '21:9': [2520, 1080],
};

// Accepts "9:16", "9x16", "1080x1920", "portrait", ... Returns { width, height, label }.
export function resolveSize(spec, base = 1080) {
  if (!spec) return null;
  const s = String(spec).trim().toLowerCase();
  const alias = { portrait: '9:16', vertical: '9:16', landscape: '16:9', horizontal: '16:9', square: '1:1', feed: '4:5' };
  const key = (alias[s] || s).replace('x', ':');
  if (ASPECTS[key]) {
    const [width, height] = ASPECTS[key];
    return { width, height, label: key.replace(':', 'x') };
  }
  const m = key.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) die(`can't read aspect/size "${spec}" — use e.g. 9:16, 16:9, 1:1, 4:5 or 1080x1920`);
  let a = Number(m[1]);
  let b = Number(m[2]);
  // Big numbers are already pixels.
  if (a >= 200 && b >= 200) return { width: even(a), height: even(b), label: `${even(a)}x${even(b)}` };
  // Otherwise a ratio: short side = base.
  const width = a >= b ? even((base * a) / b) : base;
  const height = a >= b ? base : even((base * b) / a);
  return { width, height, label: `${m[1]}x${m[2]}` };
}

const even = (n) => Math.round(n / 2) * 2;

export function findFfmpeg() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status === 0) return 'ffmpeg';
  try {
    const p = require('ffmpeg-static');
    if (p && existsSync(p)) return p;
  } catch {}
  return null;
}

export async function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return null;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

// Serve a directory over http so fonts, fetch() and video work like on a real site.
// The runtime (hype.js) is also served at /__hype/hype.js as a fallback.
export function serveDir(root, port = 0) {
  root = resolve(root);
  const runtime = join(SCRIPTS_DIR, '..', 'assets', 'runtime', 'hype.js');
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path === '/__hype/hype.js' ? runtime : normalize(join(root, path));
    if (file !== runtime && !file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    const size = statSync(file).size;
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    // Range support so <video> elements can seek.
    const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => {
    server.listen(port, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
