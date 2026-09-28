/*!
 * hype.js — a tiny timeline runtime for social videos made of HTML.
 *
 * Every frame is a pure function of time: the renderer calls hype.seek(t) and
 * takes a screenshot. Open the page in a normal browser and it plays itself
 * (space = play/pause, ←/→ = step, click = play with sound).
 *
 * Units: 1rem = 1% of the stage's short side, so a layout written in rem
 * scales to 1080x1920, 1920x1080 and 1080x1080 alike. The stage also gets
 * data-orientation="portrait|landscape|square" for layout switches in CSS.
 *
 * Declarative animation (all times in seconds):
 *   <section data-start="0" data-end="3.5">          a scene, visible in [start, end)
 *   <h1 data-in="up" data-at="0.3" data-dur="0.6">  enter at scene time 0.3
 *   <p data-out="fade" data-out-at="3">              leave (default: at scene end)
 *   <h2 data-split="words" data-in="up" data-stagger="0.08">  per-word entrance
 *   <video data-start="2" data-end="6" src=...>      video synced to the timeline
 *
 * Enter/exit types: fade up down left right zoom pop blur wipe wipe-up
 *                   wipe-down drop spin
 *
 * Script API: hype.config({...}), hype.update((t, h) => ...), hype.start(),
 *             hype.ease.*, hype.progress, hype.tween, hype.lerp, hype.clamp,
 *             hype.typewriter, hype.count, hype.local(el, t)
 */
(function () {
  'use strict';

  const render = window.__HYPE_RENDER__ || null;
  const cfg = { width: 1080, height: 1920, fps: 30, duration: 15, background: '#000', audio: null };
  const updaters = [];
  let animated = [];
  let scenes = [];
  let videos = [];
  let stage = null;
  let current = 0;
  let isReady = false;

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) =>
      x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
    outElastic: (x) =>
      x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };
  const pickEase = (name, fallback) => ease[name] || ease[fallback] || ease.outCubic;

  // 0..1 progress of t through [t0, t1], eased.
  const progress = (t, t0, t1, e = 'linear') => {
    const fn = typeof e === 'function' ? e : pickEase(e);
    return fn(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
  };
  const tween = (t, t0, t1, from, to, e = 'outCubic') => lerp(from, to, progress(t, t0, t1, e));

  // ---------- helpers for update() callbacks ----------
  const typewriter = (el, text, t, t0, cps = 18, caret = true) => {
    const n = Math.floor(clamp((t - t0) * cps, 0, text.length));
    const blink = caret && (n < text.length || Math.floor(t * 2) % 2 === 0);
    el.textContent = text.slice(0, n) + (caret && blink ? '▍' : '');
  };
  const count = (el, from, to, t, t0, t1, fmt = (v) => Math.round(v).toLocaleString('en-US'), e = 'outExpo') => {
    el.textContent = fmt(tween(t, t0, t1, from, to, e));
  };

  // ---------- setup ----------
  function config(opts) {
    Object.assign(cfg, opts || {});
    if (render && render.width) cfg.width = render.width;
    if (render && render.height) cfg.height = render.height;
    return api;
  }

  function sceneStartOf(el) {
    const host = el.hasAttribute('data-start') ? el : el.parentElement && el.parentElement.closest('[data-start]');
    return host ? { start: num(host.dataset.start, 0), end: num(host.dataset.end, cfg.duration) } : { start: 0, end: cfg.duration };
  }
  const num = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v));

  function splitText(root) {
    root.querySelectorAll('[data-split]').forEach((el) => {
      if (el.dataset.splitDone) return;
      const mode = el.dataset.split;
      const stagger = num(el.dataset.stagger, mode === 'chars' ? 0.03 : 0.07);
      const at = num(el.dataset.at, 0);
      const inType = el.dataset.in || 'up';
      const dur = el.dataset.dur;
      const easeName = el.dataset.ease;
      el.removeAttribute('data-in');
      let i = 0;
      const wrap = (text) => {
        const frag = document.createDocumentFragment();
        const parts = mode === 'chars' ? Array.from(text) : text.split(/(\s+)/);
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            continue;
          }
          const span = document.createElement('span');
          span.textContent = part;
          span.style.display = 'inline-block';
          span.dataset.in = inType;
          span.dataset.at = String(at + i * stagger);
          if (dur) span.dataset.dur = dur;
          if (easeName) span.dataset.ease = easeName;
          if (el.dataset.out) {
            span.dataset.out = el.dataset.out;
            if (el.dataset.outAt) span.dataset.outAt = el.dataset.outAt;
          }
          i++;
          frag.appendChild(span);
        }
        return frag;
      };
      // Keep inline markup (e.g. <em>) by splitting text nodes in place.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => n.parentNode.replaceChild(wrap(n.textContent), n));
      if (el.dataset.out) el.removeAttribute('data-out');
      el.dataset.splitDone = '1';
    });
  }

  function collect() {
    splitText(stage);
    scenes = Array.from(stage.querySelectorAll('[data-start]')).filter((el) => el.tagName !== 'VIDEO' && el.tagName !== 'AUDIO');
    animated = Array.from(stage.querySelectorAll('[data-in],[data-out]')).map((el) => {
      const sc = sceneStartOf(el);
      const own = el.hasAttribute('data-start');
      const at = sc.start + (own ? 0 : num(el.dataset.at, 0));
      const dur = num(el.dataset.dur, 0.6);
      const outDur = num(el.dataset.outDur, 0.4);
      const outAt = el.dataset.outAt !== undefined ? sc.start + num(el.dataset.outAt, 0) : sc.end - outDur;
      return {
        el,
        inType: el.dataset.in || null,
        outType: el.dataset.out || null,
        t0: at,
        t1: at + dur,
        o0: outAt,
        o1: outAt + outDur,
        inEase: el.dataset.ease || null,
      };
    });
    videos = Array.from(stage.querySelectorAll('video')).map((v) => {
      v.muted = true;
      v.preload = 'auto';
      v.playsInline = true;
      v.pause();
      const sc = sceneStartOf(v);
      return { v, start: v.hasAttribute('data-start') ? num(v.dataset.start, 0) : sc.start, offset: num(v.dataset.offset, 0) };
    });
  }

  // Map an enter/exit type + visibility amount (0 hidden .. 1 shown) to style parts.
  function look(type, p, raw) {
    const q = 1 - p;
    switch (type) {
      case 'fade': return { o: p };
      case 'up': return { o: p, y: q * 6 };
      case 'down': return { o: p, y: -q * 6 };
      case 'left': return { o: p, x: -q * 10 };
      case 'right': return { o: p, x: q * 10 };
      case 'zoom': return { o: p, s: 0.85 + 0.15 * p };
      case 'pop': return { o: clamp(raw * 3), s: 0.4 + 0.6 * p };
      case 'blur': return { o: p, b: q * 2, s: 1.04 - 0.04 * p };
      case 'drop': return { o: clamp(raw * 3), y: -q * 30 };
      case 'spin': return { o: p, r: -q * 90, s: 0.6 + 0.4 * p };
      case 'wipe': return { clip: `inset(0 ${(q * 100).toFixed(2)}% 0 0)` };
      case 'wipe-up': return { clip: `inset(${(q * 100).toFixed(2)}% 0 0 0)` };
      case 'wipe-down': return { clip: `inset(0 0 ${(q * 100).toFixed(2)}% 0)` };
      default: return { o: p };
    }
  }

  function apply(a, t) {
    let o = 1, x = 0, y = 0, s = 1, r = 0, b = 0, clip = null;
    const merge = (l) => {
      if (l.o !== undefined) o *= l.o;
      x += l.x || 0;
      y += l.y || 0;
      if (l.s !== undefined) s *= l.s;
      r += l.r || 0;
      b += l.b || 0;
      if (l.clip) clip = l.clip;
    };
    if (a.inType) {
      const raw = clamp((t - a.t0) / (a.t1 - a.t0));
      const fallback = a.inType === 'pop' || a.inType === 'spin' ? 'outBack' : a.inType === 'drop' ? 'outElastic' : 'outCubic';
      merge(look(a.inType, pickEase(a.inEase, fallback)(raw), raw));
    }
    if (a.outType) {
      const raw = 1 - clamp((t - a.o0) / (a.o1 - a.o0));
      merge(look(a.outType, ease.inCubic(raw), raw));
    }
    const st = a.el.style;
    st.opacity = o.toFixed(4);
    st.translate = x || y ? `${x.toFixed(3)}rem ${y.toFixed(3)}rem` : '';
    st.scale = s !== 1 ? s.toFixed(4) : '';
    st.rotate = r ? `${r.toFixed(2)}deg` : '';
    st.filter = b > 0.001 ? `blur(${b.toFixed(3)}rem)` : '';
    st.clipPath = clip || '';
  }

  // ---------- the frame function ----------
  async function seek(t) {
    t = clamp(t, 0, cfg.duration);
    current = t;
    stage.style.setProperty('--t', t.toFixed(4));
    for (const el of scenes) {
      const s = num(el.dataset.start, 0);
      const e = num(el.dataset.end, cfg.duration);
      const on = t >= s && t < e;
      el.classList.toggle('is-active', on);
      el.style.visibility = on ? '' : 'hidden';
      el.style.setProperty('--p', clamp((t - s) / Math.max(1e-6, e - s)).toFixed(4));
      el.style.setProperty('--local', Math.max(0, t - s).toFixed(4));
    }
    for (const a of animated) apply(a, t);
    // CSS animations/transitions follow the timeline too.
    if (document.getAnimations) {
      for (const anim of document.getAnimations()) {
        try {
          anim.pause();
          anim.currentTime = t * 1000;
        } catch (e) {}
      }
    }
    for (const fn of updaters) fn(t, api);
    if (render) {
      const waits = [];
      for (const { v, start, offset } of videos) {
        const want = Math.max(0, t - start + offset);
        const target = v.duration ? Math.min(want, v.duration - 0.001) : want;
        if (Math.abs(v.currentTime - target) > 0.0005) {
          waits.push(new Promise((ok) => {
            const done = () => { v.removeEventListener('seeked', done); ok(); };
            v.addEventListener('seeked', done);
            v.currentTime = target;
            setTimeout(done, 3000);
          }));
        }
      }
      await Promise.all(waits);
      // Two frames so layout, images and decoded video are painted.
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    }
  }

  function applyStageSize() {
    const short = Math.min(cfg.width, cfg.height);
    document.documentElement.style.fontSize = short / 100 + 'px';
    const orient = cfg.width === cfg.height ? 'square' : cfg.width > cfg.height ? 'landscape' : 'portrait';
    Object.assign(stage.style, {
      width: cfg.width + 'px',
      height: cfg.height + 'px',
      position: 'relative',
      overflow: 'hidden',
      background: cfg.background,
      transformOrigin: '0 0',
    });
    stage.dataset.orientation = orient;
    document.documentElement.dataset.orientation = orient;
    stage.style.setProperty('--w', cfg.width + 'px');
    stage.style.setProperty('--h', cfg.height + 'px');
    const aspect = cfg.width / cfg.height;
    stage.style.setProperty('--aspect', aspect.toFixed(4));
  }

  async function waitForAssets() {
    const imgs = Array.from(document.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null));
    const vids = videos.map(({ v }) =>
      v.readyState >= 1 ? null : new Promise((ok) => {
        v.addEventListener('loadedmetadata', ok, { once: true });
        v.addEventListener('error', ok, { once: true });
        setTimeout(ok, 8000);
      })
    );
    await Promise.all([document.fonts ? document.fonts.ready : null, ...imgs, ...vids]);
  }

  async function start() {
    stage = document.getElementById('stage') || document.body;
    config({});
    Object.assign(document.body.style, { margin: '0', background: render ? cfg.background : '#111' });
    applyStageSize();
    collect();
    await waitForAssets();
    await seek(0);
    isReady = true;
    if (!render) preview();
    return api;
  }

  // ---------- live preview in a normal browser ----------
  function preview() {
    document.body.style.overflow = 'hidden';
    const fit = () => {
      const k = Math.min((innerWidth - 20) / cfg.width, (innerHeight - 60) / cfg.height);
      Object.assign(stage.style, {
        position: 'absolute',
        top: '10px',
        left: (innerWidth - cfg.width * k) / 2 + 'px',
        transform: `scale(${k})`,
      });
    };
    const bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;height:40px;display:flex;gap:12px;align-items:center;padding:0 14px;font:13px system-ui;color:#ddd;background:#000c;z-index:99999';
    bar.innerHTML =
      '<button style="all:unset;cursor:pointer;width:24px">❚❚</button><input type="range" min="0" step="0.001" style="flex:1"><span style="font-variant-numeric:tabular-nums;min-width:90px;text-align:right"></span>';
    const [btn, range, label] = bar.children;
    range.max = cfg.duration;
    document.documentElement.appendChild(bar);
    let audio = null;
    if (cfg.audio) {
      audio = new Audio(cfg.audio);
      audio.preload = 'auto';
    }
    let playing = true;
    let origin = performance.now();
    let from = 0;
    const setPlaying = (p) => {
      playing = p;
      btn.textContent = p ? '❚❚' : '▶';
      origin = performance.now();
      from = current;
      if (audio) {
        if (p) {
          audio.currentTime = current;
          audio.play().catch(() => {});
        } else audio.pause();
      }
      videos.forEach(({ v }) => (p ? v.play().catch(() => {}) : v.pause()));
    };
    const tick = () => {
      if (playing) {
        let t = from + (performance.now() - origin) / 1000;
        if (t >= cfg.duration) {
          from = 0;
          origin = performance.now();
          t = 0;
          if (audio) audio.currentTime = 0;
        }
        seekPreview(t);
      }
      requestAnimationFrame(tick);
    };
    const seekPreview = (t) => {
      seek(t);
      for (const { v, start, offset } of videos) {
        const want = t - start + offset;
        if (!playing || Math.abs(v.currentTime - want) > 0.3) v.currentTime = Math.max(0, want);
      }
      range.value = t;
      label.textContent = `${t.toFixed(2)} / ${cfg.duration.toFixed(2)}s`;
    };
    btn.onclick = () => setPlaying(!playing);
    stage.addEventListener('click', () => setPlaying(!playing));
    range.oninput = () => {
      setPlaying(false);
      seekPreview(Number(range.value));
    };
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        setPlaying(false);
        const step = (e.shiftKey ? 1 : 1 / cfg.fps) * (e.code === 'ArrowRight' ? 1 : -1);
        seekPreview(clamp(current + step, 0, cfg.duration));
      }
    });
    addEventListener('resize', fit);
    fit();
    requestAnimationFrame(tick);
  }

  function info() {
    return {
      width: cfg.width,
      height: cfg.height,
      fps: cfg.fps,
      duration: cfg.duration,
      audio: cfg.audio,
      scenes: scenes
        .filter((el) => !el.parentElement.closest('[data-start]'))
        .map((el, i) => ({ id: el.id || `scene-${i + 1}`, start: num(el.dataset.start, 0), end: num(el.dataset.end, cfg.duration) })),
    };
  }

  const api = {
    config,
    start,
    seek,
    info,
    update: (fn) => (updaters.push(fn), api),
    local: (el, t) => t - sceneStartOf(el).start,
    get isReady() { return isReady; },
    get time() { return current; },
    get width() { return cfg.width; },
    get height() { return cfg.height; },
    get orientation() { return stage && stage.dataset.orientation; },
    ease,
    clamp,
    lerp,
    progress,
    tween,
    typewriter,
    count,
  };
  window.hype = api;
})();
