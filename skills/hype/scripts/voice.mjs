#!/usr/bin/env node
// Voiceover: turn timed narration lines into one voice track, locally, with
// Kokoro text-to-speech (no API key, nothing leaves the machine).
//
//   node voice.mjs --script vo.json --out composition/voice.wav [--voice af_heart] [--speed 1] [--duration 16]
//   node voice.mjs --list-voices
//
// vo.json is a list of lines placed on the video timeline (seconds):
//   [ { "at": 0.2, "text": "You shipped it." },
//     { "at": 2.6, "text": "Now type one line.", "voice": "am_michael" } ]
//
// Writes the track (.wav, or .m4a/.mp3 via ffmpeg) plus <out>.json with the
// real start/end of every line and estimated word timings. hype.js reads that
// file to show word-by-word captions. Mix it under music with
// `soundtrack.mjs --voice <track>`.
//
// Needs the optional voice dependencies: node doctor.mjs --voice --fix

import { spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { SCRIPTS_DIR, die, findFfmpeg, parseArgs } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const SR = 44100;

const VOICES = {
  af_heart: 'US female, warm (default)', af_bella: 'US female, bright', af_nicole: 'US female, soft/ASMR',
  af_sarah: 'US female, clear', af_nova: 'US female', af_sky: 'US female', af_alloy: 'US female', af_aoede: 'US female',
  af_jessica: 'US female', af_kore: 'US female', af_river: 'US female',
  am_michael: 'US male, confident', am_fenrir: 'US male, deep', am_puck: 'US male, playful', am_adam: 'US male',
  am_echo: 'US male', am_eric: 'US male', am_liam: 'US male', am_onyx: 'US male, low', am_santa: 'US male, jolly',
  bf_emma: 'UK female', bf_isabella: 'UK female', bf_alice: 'UK female', bf_lily: 'UK female',
  bm_george: 'UK male, classic narrator', bm_fable: 'UK male, storyteller', bm_lewis: 'UK male', bm_daniel: 'UK male',
};

if (args['list-voices']) {
  for (const [id, d] of Object.entries(VOICES)) console.log(`${id.padEnd(12)} ${d}`);
  process.exit(0);
}
if (!args.script || !args.out) die('usage: node voice.mjs --script vo.json --out voice.wav [--voice af_heart]');

let lines;
try {
  lines = JSON.parse(readFileSync(args.script, 'utf8'));
  if (!Array.isArray(lines)) lines = lines.lines;
} catch (e) {
  die(`can't read ${args.script}: ${e.message}`);
}
if (!lines?.length || lines.some((l) => typeof l.text !== 'string' || typeof l.at !== 'number')) {
  die('the script must be a list of { "at": seconds, "text": "…" }');
}
lines.sort((a, b) => a.at - b.at);

const defaultVoice = args.voice || 'af_heart';
for (const v of [defaultVoice, ...lines.map((l) => l.voice).filter(Boolean)]) {
  if (!VOICES[v]) die(`unknown voice "${v}" — see: node voice.mjs --list-voices`);
}

// Kokoro lives in its own optional folder (it's large).
const req = createRequire(join(SCRIPTS_DIR, 'voice', 'package.json'));
let KokoroTTS;
try {
  ({ KokoroTTS } = await import(req.resolve('kokoro-js')));
} catch {
  die('voice is not set up yet. Run: node doctor.mjs --voice --fix  (one time, ~700 MB)');
}

console.error('loading voice model… (first run downloads ~90 MB)');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const speed = Number(args.speed) || 1;

// Linear resample to 44.1 kHz.
function resample(data, from) {
  if (from === SR) return Float32Array.from(data);
  const out = new Float32Array(Math.round((data.length * SR) / from));
  const k = from / SR;
  for (let i = 0; i < out.length; i++) {
    const x = i * k;
    const j = Math.floor(x);
    const f = x - j;
    out[i] = (data[j] || 0) * (1 - f) + (data[j + 1] || 0) * f;
  }
  return out;
}

// Trim leading/trailing silence so "at" means "the first word starts here".
function trim(data) {
  const thr = 0.01;
  let a = 0;
  let b = data.length - 1;
  while (a < b && Math.abs(data[a]) < thr) a++;
  while (b > a && Math.abs(data[b]) < thr) b--;
  a = Math.max(0, a - Math.round(0.01 * SR));
  b = Math.min(data.length, b + Math.round(0.06 * SR));
  return data.subarray(a, b);
}

const clips = [];
for (const l of lines) {
  const voice = l.voice || defaultVoice;
  const audio = await tts.generate(l.text, { voice, speed: l.speed || speed });
  const pcm = trim(resample(audio.audio, audio.sampling_rate));
  clips.push({ ...l, voice, pcm, dur: pcm.length / SR });
  process.stderr.write('.');
}
process.stderr.write('\n');

// Timing report + overlap warnings.
const warnings = [];
for (let i = 0; i < clips.length; i++) {
  const c = clips[i];
  c.end = c.at + c.dur;
  const next = clips[i + 1];
  if (next && c.end > next.at - 0.1) {
    warnings.push(`line ${i + 1} ends at ${c.end.toFixed(2)}s but line ${i + 2} starts at ${next.at}s — move it to ≥ ${(c.end + 0.15).toFixed(2)}s or shorten the text`);
  }
}
const total = Number(args.duration) || Math.max(...clips.map((c) => c.end)) + 0.3;
const last = clips[clips.length - 1];
if (args.duration && last.end > total) warnings.push(`the last line ends at ${last.end.toFixed(2)}s, after the video ends (${total}s)`);

// Mix onto the timeline.
const N = Math.ceil(total * SR);
const mix = new Float32Array(N);
for (const c of clips) {
  const s = Math.round(c.at * SR);
  for (let i = 0; i < c.pcm.length && s + i < N; i++) mix[s + i] += c.pcm[i];
}
let peak = 1e-9;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix[i]));
const norm = 0.89 / peak;

// Estimated word timings (by syllable-ish weight) for captions.
const weight = (w) => Math.max(1, w.replace(/[^a-z0-9]/gi, '').length) + (/[,.!?;:]$/.test(w) ? 3 : 0);
const timing = clips.map((c) => {
  const words = c.text.split(/\s+/).filter(Boolean);
  const sum = words.reduce((a, w) => a + weight(w), 0);
  let t = c.at;
  return {
    at: +c.at.toFixed(3),
    end: +c.end.toFixed(3),
    text: c.text,
    voice: c.voice,
    words: words.map((w) => {
      const d = (c.dur * weight(w)) / sum;
      const item = { w, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
      t += d;
      return item;
    }),
  };
});

// Mono 16-bit WAV.
const data = Buffer.alloc(44 + N * 2);
data.write('RIFF', 0);
data.writeUInt32LE(36 + N * 2, 4);
data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(1, 22);
data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 2, 28);
data.writeUInt16LE(2, 32);
data.writeUInt16LE(16, 34);
data.write('data', 36);
data.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * norm)) * 32767), 44 + i * 2);

const out = args.out;
if (/\.wav$/i.test(out)) writeFileSync(out, data);
else {
  const ff = findFfmpeg();
  if (!ff) die('writing .m4a/.mp3 needs ffmpeg — install it or use a .wav output');
  const tmp = `${out}.tmp.wav`;
  writeFileSync(tmp, data);
  const r = spawnSync(ff, ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', /\.mp3$/i.test(out) ? 'libmp3lame' : 'aac', '-b:a', '160k', out], { stdio: 'inherit' });
  unlinkSync(tmp);
  if (r.status !== 0) die(`ffmpeg could not encode ${out}`);
}
const timingFile = out.replace(/\.[a-z0-9]+$/i, '') + '.json';
writeFileSync(timingFile, JSON.stringify({ duration: +total.toFixed(3), lines: timing }, null, 2));

console.log(`${clips.length} lines, ${total.toFixed(2)}s → ${out}`);
console.log(`timings → ${timingFile}`);
for (const t of timing) console.log(`  ${t.at.toFixed(2)}–${t.end.toFixed(2)}s  ${t.text}`);
if (warnings.length) console.log(`\nwarnings:\n  - ${warnings.join('\n  - ')}`);
