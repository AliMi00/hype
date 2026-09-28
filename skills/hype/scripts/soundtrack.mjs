#!/usr/bin/env node
// Generate a royalty-free music bed + sound effects for a video, from scratch.
// No samples, no downloads: everything is synthesized, so the output is yours
// to post anywhere.
//
//   node soundtrack.mjs --duration 18 --mood upbeat --out music.wav \
//     [--bpm 120] [--key C] [--seed 7] \
//     [--sfx "whoosh@2.4,pop@3.1,impact@6,riser@4.2-6,ding@9,typing@10-11.5"] \
//     [--no-music] [--no-ending] [--beats beats.json]
//
// Moods: upbeat, playful, chill, lofi, corporate, epic, tense, hype
// SFX:   whoosh, swipe, pop, click, impact, riser (a range: start-end), ding,
//        typing (a range), boom, sparkle
//
// Print the beat grid (for cutting on the beat) with --beats <file.json>.

import { writeFileSync } from 'node:fs';
import { die, parseArgs } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('usage: node soundtrack.mjs --duration 18 --mood upbeat --out music.wav [--sfx "whoosh@2.4,impact@6"]');
  process.exit(0);
}
const SR = 44100;
const duration = Number(args.duration);
if (!duration || duration <= 0) die('--duration <seconds> is required');
const out = args.out || 'music.wav';

// ---------- moods ----------
// Chords are [semitones from the key root, quality].
const MOODS = {
  upbeat:    { bpm: 118, minor: false, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], kick: 'four', clap: true, hats: '8off', arp: 16, pad: 0.5, bass: '8' },
  playful:   { bpm: 124, minor: false, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [5, 'M']], kick: 'half', clap: true, hats: '8', arp: 8, pad: 0.3, bass: 'bounce' },
  chill:     { bpm: 92,  minor: false, prog: [[2, 'm7'], [7, 'D7'], [0, 'M7'], [9, 'm7']], kick: 'soft', clap: false, rim: true, hats: '8swing', arp: 0, pad: 0.7, bass: '4' },
  lofi:      { bpm: 80,  minor: false, prog: [[0, 'M7'], [9, 'm7'], [2, 'm7'], [7, 'D7']], kick: 'soft', clap: true, hats: '8swing', arp: 0, pad: 0.8, bass: '4', vinyl: true, swing: 0.16 },
  corporate: { bpm: 110, minor: false, prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], kick: 'four', clap: false, hats: '8off', arp: 8, pad: 0.6, bass: '8' },
  epic:      { bpm: 96,  minor: true,  prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], kick: 'toms', clap: false, hats: 'late', arp: 8, pad: 1.0, bass: 'long' },
  tense:     { bpm: 128, minor: true,  prog: [[0, 'm'], [0, 'm'], [8, 'M'], [7, 'M']], kick: 'half', clap: false, hats: '16', arp: 16, pad: 0.6, bass: '16' },
  hype:      { bpm: 136, minor: false, prog: [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']], kick: 'four', clap: true, hats: '16', arp: 16, pad: 0.5, bass: 'bounce' },
};
const moodName = String(args.mood || 'upbeat').toLowerCase();
const mood = MOODS[moodName] || MOODS[{ cinematic: 'epic', energetic: 'hype', calm: 'chill', fun: 'playful', dramatic: 'epic' }[moodName]];
if (!mood) die(`unknown mood "${moodName}" — try: ${Object.keys(MOODS).join(', ')}`);

const bpm = Number(args.bpm) || mood.bpm;
const beat = 60 / bpm;
const bar = beat * 4;
const KEYS = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };
const keyOff = KEYS[String(args.key || (mood.minor ? 'a' : 'c')).toLowerCase().replace(/m(inor)?$/, '')] ?? 0;
const QUAL = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], D7: [0, 4, 7, 10] };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// ---------- deterministic randomness ----------
let seed = (Number(args.seed) || 1) >>> 0;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rand() * 2 - 1;

// ---------- buffers ----------
const N = Math.ceil(duration * SR);
const mk = () => [new Float32Array(N), new Float32Array(N)];
const drums = mk();
const music = mk();
const sfx = mk();
const verbSend = mk();
const duckEnv = new Float32Array(N).fill(1);

const add = (buf, i, l, r = l) => {
  if (i < 0 || i >= N) return;
  buf[0][i] += l;
  buf[1][i] += r;
};

// A two-pole state-variable filter; returns a per-sample processor.
function svf() {
  let low = 0, band = 0;
  return (x, cutoff, q = 0.7, mode = 'low') => {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff, SR / 6)) / SR);
    low += f * band;
    const high = x - low - (1 / q) * band;
    band += f * high;
    return mode === 'low' ? low : mode === 'band' ? band : high;
  };
}

// ---------- instruments ----------
function kick(t, gain = 1, pitch = 1) {
  const s = Math.floor(t * SR);
  const len = Math.floor(0.45 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR;
    const f = (45 + 110 * Math.exp(-x * 30)) * pitch;
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-x * 7) * (i < 40 ? i / 40 : 1);
    const click = i < 200 ? noise() * 0.15 * (1 - i / 200) : 0;
    add(drums, s + i, (Math.sin(ph) * env + click) * 0.9 * gain);
  }
  // Pump everything else under the kick.
  const dl = Math.floor(0.22 * SR);
  for (let i = 0; i < dl && s + i < N; i++) {
    const k = 1 - 0.55 * gain * Math.pow(1 - i / dl, 2);
    duckEnv[s + i] = Math.min(duckEnv[s + i], k);
  }
}

function snare(t, gain = 1, kind = 'clap') {
  const s = Math.floor(t * SR);
  const len = Math.floor(0.25 * SR);
  const hp = svf();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR;
    let env;
    if (kind === 'clap') {
      // three quick bursts then a tail
      const burst = x < 0.03 ? Math.exp(-((x % 0.01) * 300)) : Math.exp(-(x - 0.03) * 22);
      env = burst;
    } else if (kind === 'rim') env = Math.exp(-x * 60);
    else env = Math.exp(-x * 18);
    ph += (2 * Math.PI * (kind === 'rim' ? 420 : 190)) / SR;
    const body = Math.sin(ph) * (kind === 'clap' ? 0.15 : 0.4) * Math.exp(-x * 30);
    const n = hp(noise(), kind === 'rim' ? 2500 : 1400, 0.8, 'band') * 2.2;
    const v = (n * env + body) * 0.45 * gain;
    const w = 0.15 * noise() * env * gain; // a touch of width
    add(drums, s + i, v + w, v - w);
    if (i % 2 === 0) add(verbSend, s + i, v * 0.3);
  }
}

function hat(t, gain = 1, open = false) {
  const s = Math.floor(t * SR);
  const len = Math.floor((open ? 0.22 : 0.06) * SR);
  const f = svf();
  const pan = 0.3 * (rand() - 0.5);
  for (let i = 0; i < len; i++) {
    const x = i / SR;
    const env = Math.exp(-x * (open ? 14 : 70));
    const v = f(noise(), 9000, 0.9, 'high') * env * 0.16 * gain;
    add(drums, s + i, v * (1 - pan), v * (1 + pan));
  }
}

function tom(t, gain = 1, midi = 45) {
  const s = Math.floor(t * SR);
  const len = Math.floor(0.9 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const x = i / SR;
    ph += (2 * Math.PI * hz(midi) * (1 + 0.6 * Math.exp(-x * 18))) / SR;
    const v = (Math.sin(ph) + 0.25 * noise() * Math.exp(-x * 40)) * Math.exp(-x * 4) * 0.8 * gain;
    add(drums, s + i, v);
    add(verbSend, s + i, v * 0.35);
  }
}

function bassNote(t, len, midi, gain = 1) {
  const s = Math.floor(t * SR);
  const n = Math.floor(len * SR);
  const f = svf();
  const freq = hz(midi);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / SR;
    ph += freq / SR;
    const saw = 2 * (ph % 1) - 1;
    const sub = Math.sin(2 * Math.PI * ph);
    const env = Math.min(1, i / 200) * Math.min(1, (n - i) / 600) * (0.75 + 0.25 * Math.exp(-x * 8));
    const cut = 220 + 900 * Math.exp(-x * 10);
    const v = (f(saw, cut, 1.1) * 0.5 + sub * 0.55) * env * 0.42 * gain;
    add(music, s + i, v);
  }
}

function padChord(t, len, notes, gain = 1) {
  const s = Math.floor(t * SR);
  const n = Math.floor(len * SR);
  const voices = [];
  for (const m of notes) {
    for (const d of [-0.07, 0.07]) voices.push({ f: hz(m + d * 0.5), ph: rand(), pan: d * 6 });
  }
  const fl = svf(), fr = svf();
  const atk = Math.min(0.35, len * 0.3) * SR;
  for (let i = 0; i < n; i++) {
    let l = 0, r = 0;
    for (const v of voices) {
      v.ph += v.f / SR;
      const saw = 2 * (v.ph % 1) - 1;
      l += saw * (0.5 - v.pan * 0.4);
      r += saw * (0.5 + v.pan * 0.4);
    }
    const env = Math.min(1, i / atk) * Math.min(1, (n - i) / (0.25 * SR));
    const cut = 1400 + 500 * Math.sin((2 * Math.PI * (t + i / SR)) / (bar * 2));
    const k = (0.06 * gain * env) / Math.sqrt(voices.length);
    const L = fl(l, cut, 0.8) * k, R = fr(r, cut, 0.8) * k;
    add(music, s + i, L, R);
    if (i % 2 === 0) add(verbSend, s + i, (L + R) * 0.5);
  }
}

function pluck(t, midi, gain = 1, pan = 0) {
  // Karplus–Strong string.
  const s = Math.floor(t * SR);
  const period = Math.max(2, Math.round(SR / hz(midi)));
  const buf = new Float32Array(period).map(() => noise());
  const len = Math.floor(0.6 * SR);
  let idx = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = buf[idx];
    const next = 0.497 * (cur + prev);
    prev = cur;
    buf[idx] = next;
    idx = (idx + 1) % period;
    const v = cur * 0.18 * gain * Math.min(1, (len - i) / 2000);
    add(music, s + i, v * (1 - pan), v * (1 + pan));
    if (i % 2 === 0) add(verbSend, s + i, v * 0.4);
  }
}

// ---------- sound effects ----------
function envBell(x, a, d) {
  return x < a ? x / a : Math.exp(-(x - a) / d);
}

const SFX = {
  whoosh(t, _end, g = 1) {
    // peaks at t
    const pre = 0.35, post = 0.3;
    const s = Math.floor((t - pre) * SR);
    const n = Math.floor((pre + post) * SR);
    const f = svf();
    for (let i = 0; i < n; i++) {
      const x = i / SR;
      const k = x < pre ? Math.pow(x / pre, 2) : Math.exp(-(x - pre) * 10);
      const cut = 400 + 3500 * k;
      const pan = Math.tanh((x - pre) * 5) * 0.6;
      const v = f(noise(), cut, 1.8, 'band') * k * 0.55 * g;
      add(sfx, s + i, v * (1 - pan), v * (1 + pan));
      add(verbSend, s + i, v * 0.3);
    }
  },
  swipe(t, _e, g = 1) {
    const s = Math.floor((t - 0.08) * SR);
    const n = Math.floor(0.22 * SR);
    const f = svf();
    for (let i = 0; i < n; i++) {
      const x = i / SR;
      const k = envBell(x, 0.08, 0.05);
      const v = f(noise(), 2000 + 5000 * (x / 0.22), 1.5, 'band') * k * 0.45 * g;
      add(sfx, s + i, v);
    }
  },
  pop(t, _e, g = 1) {
    const s = Math.floor(t * SR);
    const n = Math.floor(0.12 * SR);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const x = i / SR;
      ph += (2 * Math.PI * (380 + 900 * Math.exp(-x * 60))) / SR;
      add(sfx, s + i, Math.sin(ph) * Math.exp(-x * 35) * 0.35 * g);
    }
  },
  click(t, _e, g = 1) {
    const s = Math.floor(t * SR);
    const f = svf();
    for (let i = 0; i < 0.03 * SR; i++) {
      const x = i / SR;
      add(sfx, s + i, f(noise(), 4000, 2, 'band') * Math.exp(-x * 250) * 0.5 * g);
    }
  },
  typing(t, end, g = 1) {
    let x = t;
    while (x < (end || t + 1)) {
      SFX.click(x, 0, g * (0.5 + 0.5 * rand()));
      x += 0.05 + rand() * 0.09;
    }
  },
  impact(t, _e, g = 1) {
    kickInto(sfx, t, g * 1.2);
    const s = Math.floor(t * SR);
    const n = Math.floor(1.4 * SR);
    const f = svf();
    for (let i = 0; i < n; i++) {
      const x = i / SR;
      const v = f(noise(), 300 + 3000 * Math.exp(-x * 6), 0.7) * Math.exp(-x * 3.2) * 0.5 * g;
      add(sfx, s + i, v, v * 0.9);
      add(verbSend, s + i, v * 0.6);
    }
  },
  boom(t, _e, g = 1) {
    const s = Math.floor(t * SR);
    let ph = 0;
    for (let i = 0; i < 2 * SR; i++) {
      const x = i / SR;
      ph += (2 * Math.PI * (32 + 40 * Math.exp(-x * 4))) / SR;
      add(sfx, s + i, Math.sin(ph) * Math.exp(-x * 1.6) * 0.8 * g);
    }
  },
  riser(t, end, g = 1) {
    end = end || t + 2;
    const s = Math.floor(t * SR);
    const n = Math.floor((end - t) * SR);
    const f = svf();
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const p = i / n;
      ph += (hz(48 + keyOff) * (1 + 3 * p * p)) / SR;
      const saw = 2 * (ph % 1) - 1;
      const v = (f(noise(), 300 + 7000 * p * p, 1.2, 'band') * 0.7 + saw * 0.08) * Math.pow(p, 2.2) * 0.45 * g;
      add(sfx, s + i, v, v);
      add(verbSend, s + i, v * 0.4);
    }
  },
  ding(t, _e, g = 1, semis = 0) {
    const s = Math.floor(t * SR);
    const base = hz(84 + keyOff + semis);
    const parts = [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.9, 0.08]];
    for (let i = 0; i < 1.5 * SR; i++) {
      const x = i / SR;
      let v = 0;
      for (const [m, a] of parts) v += Math.sin(2 * Math.PI * base * m * x) * a * Math.exp(-x * (2 + m));
      v *= 0.16 * g * Math.min(1, i / 30);
      add(sfx, s + i, v);
      add(verbSend, s + i, v * 0.5);
    }
  },
  sparkle(t, _e, g = 1) {
    const scale = [0, 4, 7, 11, 12, 16, 19];
    for (let k = 0; k < scale.length; k++) SFX.ding(t + k * 0.045, 0, g * 0.35 * (1 - k * 0.08), scale[k] - 12);
  },
};

function kickInto(buf, t, g) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let i = 0; i < 0.6 * SR; i++) {
    const x = i / SR;
    ph += (2 * Math.PI * (40 + 120 * Math.exp(-x * 25))) / SR;
    add(buf, s + i, Math.sin(ph) * Math.exp(-x * 5) * 0.9 * g);
  }
}

// ---------- arrangement ----------
const withMusic = !args['no-music'];
const ending = !args['no-ending'];
// Last downbeat-ish moment that leaves ~1s of ring-out.
const lastHit = ending ? Math.max(beat * 2, Math.floor((duration - 0.9) / beat) * beat) : duration;
const beats = [];
const downbeats = [];
for (let t = 0; t < duration - 1e-6; t += beat) beats.push(+t.toFixed(4));
for (let t = 0; t < duration - 1e-6; t += bar) downbeats.push(+t.toFixed(4));

if (withMusic) {
  const root = 48 + keyOff; // C3-ish
  const swing = mood.swing || (String(mood.hats).includes('swing') ? 0.12 : 0);
  const sw = (i, step) => (i % 2 === 1 ? step * swing : 0);
  const bars = Math.ceil(lastHit / bar);
  const intro = bars > 4 ? 1 : 0; // first bar without drums when there's room

  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    if (t0 >= lastHit) break;
    const [deg, q] = mood.prog[b % mood.prog.length];
    const chordRoot = root + deg;
    const notes = QUAL[q].map((n) => chordRoot + 12 + n);
    const barLen = Math.min(bar, lastHit - t0);

    if (mood.pad) padChord(t0, barLen + 0.05, notes, mood.pad);

    // bass
    const bassMidi = chordRoot - 12 + (chordRoot - 12 < 33 ? 12 : 0);
    const bstep = { '4': beat, '8': beat / 2, '16': beat / 4, long: bar, bounce: beat / 2 }[mood.bass] || beat / 2;
    for (let i = 0, t = t0; t < t0 + barLen - 1e-6; t += bstep, i++) {
      const oct = mood.bass === 'bounce' && i % 2 === 1 ? 12 : 0;
      const l = Math.min(bstep * 0.9, t0 + barLen - t);
      if (b >= intro || mood.bass === 'long') bassNote(t + sw(i, bstep), l, bassMidi + oct, mood.bass === '16' ? 0.8 : 1);
    }

    // arp
    if (mood.arp && b >= intro) {
      const step = mood.arp === 16 ? beat / 4 : beat / 2;
      const seq = [0, 1, 2, 1, 2, 3 % notes.length, 2, 1];
      for (let i = 0, t = t0; t < t0 + barLen - 1e-6; t += step, i++) {
        const n = notes[seq[i % seq.length] % notes.length] + 12;
        pluck(t + sw(i, step), n, i % 4 === 0 ? 1 : 0.7, ((i % 4) - 1.5) * 0.25);
      }
    }

    // drums
    if (b < intro) continue;
    const late = mood.hats === 'late' && b < bars / 2;
    for (let k = 0; k < 4; k++) {
      const t = t0 + k * beat;
      if (t >= lastHit) break;
      if (mood.kick === 'four') kick(t);
      if (mood.kick === 'half' && (k === 0 || k === 2)) kick(t);
      if (mood.kick === 'soft' && (k === 0 || (k === 2 && b % 2 === 1))) kick(t, 0.7);
      if (mood.kick === 'soft' && k === 2 && b % 2 === 0) kick(t + beat / 2, 0.55);
      if (mood.kick === 'toms') {
        if (k === 0) kick(t, 1, 0.8);
        if (k === 3 && b % 2 === 1) { tom(t, 0.6, 43 + keyOff); tom(t + beat / 2, 0.6, 40 + keyOff); }
      }
      if ((mood.clap || mood.rim) && (k === 1 || k === 3)) snare(t, mood.rim ? 0.8 : 1, mood.rim ? 'rim' : 'clap');
      if (!late) {
        const h = mood.hats;
        if (h === '8off' || h === 'late') hat(t + beat / 2, 1, h === '8off' && k === 3);
        if (h === '8' || h === '8swing') { hat(t, 0.8); hat(t + beat / 2 + (h === '8swing' ? (beat / 2) * swing : 0), 0.55); }
        if (h === '16') for (let j = 0; j < 4; j++) hat(t + (j * beat) / 4, j === 2 ? 0.9 : 0.5);
      }
    }
  }

  // ending: one final chord + hit, left to ring
  if (ending) {
    const [deg, q] = mood.prog[0];
    const notes = QUAL[q].map((n) => root + deg + 12 + n);
    padChord(lastHit, duration - lastHit, notes, 1.1);
    bassNote(lastHit, duration - lastHit, root + deg - 12 + (root + deg - 12 < 33 ? 12 : 0), 1.1);
    for (const n of notes) pluck(lastHit, n + 12, 0.8, 0);
    kick(lastHit, 1.1);
    if (mood.clap) snare(lastHit, 0.9, 'clap');
    hat(lastHit, 0.8, true);
  }

  if (mood.vinyl) {
    for (let i = 0; i < N; i++) {
      const c = rand() < 0.0004 ? noise() * 0.25 : 0;
      add(music, i, noise() * 0.004 + c);
    }
  }
}

// sound effects: "name@time" or "name@start-end", optional "*gain" suffix
if (args.sfx) {
  for (const item of String(args.sfx).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = item.match(/^([a-z-]+)@([\d.]+)(?:-([\d.]+))?(?:\*([\d.]+))?$/i);
    if (!m) die(`can't read sfx "${item}" — use name@seconds, e.g. whoosh@2.4 or riser@4-6`);
    const fn = SFX[m[1].toLowerCase()];
    if (!fn) die(`unknown sfx "${m[1]}" — try: ${Object.keys(SFX).join(', ')}`);
    fn(Number(m[2]), m[3] ? Number(m[3]) : undefined, m[4] ? Number(m[4]) : 1);
  }
}

// ---------- mix ----------
// Small Schroeder reverb on the send bus.
function reverb([inL, inR]) {
  const combs = [1557, 1617, 1491, 1422].map((d, i) => ({ buf: new Float32Array(d + i * 23), i: 0, fb: 0.78, lp: 0 }));
  const aps = [225, 556, 441].map((d) => ({ buf: new Float32Array(d), i: 0 }));
  const outL = new Float32Array(N), outR = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = (inL[n] + inR[n]) * 0.5;
    let y = 0;
    combs.forEach((c, k) => {
      const d = c.buf[c.i];
      c.lp = d * 0.6 + c.lp * 0.4;
      c.buf[c.i] = x + c.lp * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      y += k % 2 ? -d : d;
    });
    for (const a of aps) {
      const d = a.buf[a.i];
      const v = y + d * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      y = d - v * 0.5;
    }
    outL[n] = y * 0.25;
    outR[n] = -y * 0.25 + y * 0.1;
  }
  return [outL, outR];
}

const verb = reverb(verbSend);
const master = mk();
const musicGain = args['music-gain'] !== undefined ? Number(args['music-gain']) : 1;
const sfxGain = args['sfx-gain'] !== undefined ? Number(args['sfx-gain']) : 0.8;
const fadeIn = Math.floor(0.02 * SR);
const fadeOut = Math.floor(Math.min(0.6, duration * 0.1) * SR);
for (let i = 0; i < N; i++) {
  const edge = Math.min(1, i / fadeIn, (N - i) / fadeOut);
  for (let c = 0; c < 2; c++) {
    let v = (drums[c][i] * 0.9 + music[c][i] * duckEnv[i]) * musicGain + sfx[c][i] * sfxGain + verb[c][i];
    master[c][i] = Math.tanh(v * 1.1) * edge;
  }
}

// normalize to about -2 dBFS peak (leaves room for true-peak overs)
let peak = 1e-9;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(master[0][i]), Math.abs(master[1][i]));
const norm = 0.79 / peak;

const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0);
data.writeUInt32LE(36 + N * 4, 4);
data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 4, 28);
data.writeUInt16LE(4, 32);
data.writeUInt16LE(16, 34);
data.write('data', 36);
data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, master[0][i] * norm)) * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, master[1][i] * norm)) * 32767), 46 + i * 4);
}
writeFileSync(out, data);

const grid = { bpm, beat: +beat.toFixed(4), bar: +bar.toFixed(4), mood: moodName, key: args.key || (mood.minor ? 'A minor' : 'C major'), finalHit: +lastHit.toFixed(3), beats, downbeats };
if (args.beats) writeFileSync(args.beats, JSON.stringify(grid, null, 2));
console.log(`${moodName} @ ${bpm} bpm, ${duration}s → ${out}`);
console.log(`downbeats (cut here): ${downbeats.map((t) => t.toFixed(2)).join(', ')}${ending ? ` · final hit ${lastHit.toFixed(2)}s` : ''}`);
