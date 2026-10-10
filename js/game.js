
'use strict';

const T = 32, VW = 960, VH = 540, ROWS = 17;
const GRAV = 1900, JUMP = 640, RUN = 200, MAXFALL = 900;
const SERIF = '"Lora", Georgia, "Times New Roman", serif';
const SANS = '"Nunito", "Segoe UI", system-ui, sans-serif';

const PAL = {
  dusk:    { sky: ['#1f2a48', '#6b5a7a', '#d99a7c'], hill1: '#3b4467', hill2: '#2a3150', ground: '#1c2236', top: '#d8b98a', edge: '#2a3352', text: '#f8eedc', accent: '#ffd38a', sun: '#f6c58e', stars: 0.4 },
  warm:    { sky: ['#33406b', '#8a7391', '#f2c48f'], hill1: '#5a5f86', hill2: '#3c4266', ground: '#2b3049', top: '#f0d39a', edge: '#3a405e', text: '#fff6e6', accent: '#ffd38a', sun: '#ffe1a8', stars: 0 },
  focused: { sky: ['#1d2f52', '#3f6290', '#9bbbd9'], hill1: '#35507a', hill2: '#253a5c', ground: '#1d2840', top: '#cfe0f2', edge: '#2a3858', text: '#f2f7fc', accent: '#ffd38a', sun: '#e8f1fb', stars: 0 },
  playful: { sky: ['#2e2452', '#7a4f84', '#eaa79f'], hill1: '#5b3f78', hill2: '#3f2c5c', ground: '#2a2140', top: '#ffcf8a', edge: '#3b2f58', text: '#fff3ea', accent: '#ffd36b', sun: '#ffc7a8', stars: 0.2 },
  hollow:  { sky: ['#24262f', '#3d404c', '#646876'], hill1: '#3a3d48', hill2: '#2c2e37', ground: '#202229', top: '#8d909c', edge: '#2d3039', text: '#eceef2', accent: '#c9b98f', sun: '#9a9caa', stars: 0 },
  chase:   { sky: ['#211a36', '#4c3a63', '#9a7590'], hill1: '#45365e', hill2: '#30264a', ground: '#1f1930', top: '#e2b98f', edge: '#2e2546', text: '#faeef3', accent: '#ffd38a', sun: '#e9b9b0', stars: 0.3 },
  night:   { sky: ['#070b17', '#0e1628', '#1b2945'], hill1: '#142038', hill2: '#0d1529', ground: '#0b1222', top: '#3f5378', edge: '#141e36', text: '#f6ecd6', accent: '#ffd38a', moon: '#e9e4d2', stars: 1 },
  night2:  { sky: ['#080c18', '#121a2e', '#2b2a40'], hill1: '#181f36', hill2: '#10162a', ground: '#0c1222', top: '#4a5476', edge: '#151d34', text: '#f6ecd6', accent: '#ffd38a', moon: '#efe7cf', stars: 1 },
  dawn:    { sky: ['#5d7fb8', '#b9a8c4', '#ffd6a0'], hill1: '#7c86b0', hill2: '#5a6491', ground: '#343d5c', top: '#ffe2b0', edge: '#454f72', text: '#fffaf0', accent: '#ffcf7a', sun: '#fff0c8', stars: 0 }
};


const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }


const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const darkC = document.createElement('canvas'); darkC.width = VW; darkC.height = VH;
const dctx = darkC.getContext('2d');
let scale = 1, cssScale = 1;
function resize() {
  cssScale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = Math.floor(VW * cssScale) + 'px';
  canvas.style.height = Math.floor(VH * cssScale) + 'px';
  canvas.width = Math.floor(VW * cssScale * dpr);
  canvas.height = Math.floor(VH * cssScale * dpr);
  scale = cssScale * dpr;
}
window.addEventListener('resize', resize); resize();


const keys = {}, pressed = {};
const mouse = { x: -1, y: -1, click: false };
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  Sound.unlock();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width * VW; mouse.y = (e.clientY - r.top) / r.height * VH;
});
canvas.addEventListener('mousedown', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width * VW; mouse.y = (e.clientY - r.top) / r.height * VH;
  mouse.click = true; Sound.unlock();
});
const was = (...codes) => codes.some(c => pressed[c]);
const held = (...codes) => codes.some(c => keys[c]);
const IN = {
  left: () => held('ArrowLeft', 'KeyA'),
  right: () => held('ArrowRight', 'KeyD'),
  jumpHeld: () => held('Space', 'ArrowUp', 'KeyW'),
  jump: () => was('Space', 'ArrowUp', 'KeyW'),
  act: () => was('KeyE', 'Enter'),
  ok: () => was('Enter', 'Space', 'KeyE'),
  back: () => was('Escape'),
  up: () => was('ArrowUp', 'KeyW'),
  down: () => was('ArrowDown', 'KeyS')
};


const SAVE_KEY = 'shortcut-save-v1';
function freshSave() { return { v: 1, started: false, unlocked: 0, chapter: 0, room: 0, stones: [], cards: [], notes: [], finished: false, best: null, sound: true }; }
let save = freshSave();
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) save = Object.assign(freshSave(), s); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
Sound.setEnabled(save.sound);


function parseTerrain(s) {
  const out = [];
  for (const tok of s.trim().split(/\s+/)) {
    const [h, n] = tok.split('*');
    const v = h === '.' ? 0 : parseInt(h, 10);
    for (let i = 0; i < (n ? +n : 1); i++) out.push(v);
  }
  return out;
}
function parseItems(s) {
  return (s || '').trim().split(/\s+/).filter(Boolean).map(tok => {
    const m = /^([A-Za-z0-9]):([\d.]+)(?:@([\d.]+))?(?:r([\d.]+))?$/.exec(tok);
    if (!m) throw new Error('bad item ' + tok);
    return { ch: m[1], col: +m[2], h: m[3] != null ? +m[3] : null, r: m[4] != null ? +m[4] : null };
  });
}

function normRoom(id) {
  const d = ROOMS[id];
  if (!d.mirror) {
    return { id, def: d, hs: parseTerrain(d.t), plats: (d.plats || []).map(p => p.slice()), items: parseItems(d.items), wind: d.wind || [], ceil: d.ceil };
  }
  const src = normRoom(d.mirror), w = src.hs.length;
  const hs = src.hs.slice().reverse();
  const plats = src.plats.map(([x, s, len, ty]) => [w - x - len, s, len, ty]);
  const items = [];
  for (const it of src.items) {
    let ch = it.ch;
    if (ch === 'N' || ch === 'S') continue;
    if (ch === 'P') ch = 'E'; else if (ch === 'E') ch = 'P'; else if (/[0-9]/.test(ch)) ch = 'Z';
    items.push({ ch, col: w - 1 - it.col, h: it.h, r: it.r });
  }
  const start = items.find(i => i.ch === 'P');
  items.push({ ch: 'H', col: start.col + d.shadowAt, h: null, r: null });
  const wind = src.wind.map(([a, b]) => [w - 1 - b, w - 1 - a]);
  return { id, def: Object.assign({}, src.def, { doors: {}, notes: [], script: null, lines: d.lines, taunts: d.taunts, passTo: null }), hs, plats, items, wind, ceil: src.ceil };
}


let G = null;       
let scene = 'boot';
let card = null, compose = null, menu = null, fade = { a: 0, dir: 0, cb: null };
let titleT = 0, galleryTab = 0, returnTo = 'title';

const TILE_CODE = { '#': 1, '-': 2, 'x': 3, 'p': 4 };

function feetY(h) { return (ROWS - h) * T; }

function buildRoom(ci, ri) {
  const CH = CHAPTERS[ci], id = CH.rooms[ri], N = normRoom(id), def = N.def;
  const w = N.hs.length, tiles = new Uint8Array(w * ROWS), meta = new Map();
  const set = (c, k, code) => { const r = ROWS - 1 - k; if (c < 0 || c >= w || r < 0 || r >= ROWS) return; tiles[r * w + c] = code; return r * w + c; };
  N.hs.forEach((h, c) => { for (let k = 0; k < h; k++) set(c, k, 1); });
  if (N.ceil) for (let c = 0; c < w; c++) for (let k = N.ceil; k < ROWS; k++) set(c, k, 1);
  const crumbles = [], groups = {};
  N.plats.forEach(([x, s, len, ty = '-'], pi) => {
    for (let i = 0; i < len; i++) {
      let code = TILE_CODE[ty];
      if (code == null) code = 5;
      const idx = set(x + i, s - 1, code);
      if (idx == null) continue;
      if (code === 3) { const m = { state: 'idle', t: 0, idx }; meta.set(idx, m); crumbles.push(m); }
      if (code === 4 || code === 5) {
        const g = code === 4 ? 'p' + pi : ty;
        const m = { on: false, glow: 0, group: g, idx }; meta.set(idx, m);
        (groups[g] = groups[g] || []).push(m);
      }
    }
  });
  const R = {
    id, ci, ri, def, CH, w, tiles, meta, crumbles, groups, wind: N.wind,
    pal: PAL[ROOMS[id].pal || CH.pal], speed: def.speed || CH.speed || 1, dark: !!CH.dark
  };
  return { R, items: N.items, hs: N.hs };
}

function tileAt(c, r) { if (r < 0 || r >= ROWS || c < 0 || c >= G.R.w) return 0; return G.R.tiles[r * G.R.w + c]; }
function isSolid(c, r) {
  if (c < 0 || c >= G.R.w) return true;
  if (r < 0 || r >= ROWS) return false;
  const t = G.R.tiles[r * G.R.w + c];
  if (t === 1) return true;
  if (t === 3) return G.R.meta.get(r * G.R.w + c).state !== 'gone';
  if (t === 4) return G.R.meta.get(r * G.R.w + c).on;
  return false;
}
function isOneWay(c, r) {
  const t = tileAt(c, r);
  if (t === 2) return true;
  if (t === 5) return G.R.meta.get(r * G.R.w + c).on;
  return false;
}
function surfaceY(x, fromY) {
  const c = Math.floor(x / T);
  if (c < 0 || c >= G.R.w) return null;
  for (let r = Math.max(1, Math.floor(fromY / T) - 4); r < ROWS; r++) {
    if ((isSolid(c, r) || isOneWay(c, r)) && !isSolid(c, r - 1)) return r * T;
  }
  return null;
}

function loadRoom(ci, ri) {
  const { R, items, hs } = buildRoom(ci, ri);
  const def = R.def, CH = R.CH;
  G = {
    R, time: 0, ents: [], movers: [], parts: [], lines: [], line: null, toasts: [],
    cam: { x: 0, y: 0 }, flags: {}, fails: 0, inputLock: false, triggered: new Set(),
    hasShadow: !CH.noShadow, lantern: !!CH.lantern || R.id === 'c4r2', darkAlpha: R.dark ? 0.86 : 0,
    still: 0, fillT: 0
  };
  const surf = it => it.h != null ? feetY(it.h) : feetY(hs[clamp(Math.round(it.col), 0, hs.length - 1)]);
  const px = it => (it.col + 0.5) * T;
  const byX = ch => items.filter(i => i.ch === ch).sort((a, b) => a.col - b.col);
  let start = null;
  const mentorPts = [];
  for (const it of items) {
    const x = px(it), y = surf(it), ch = it.ch;
    if (ch === 'P') start = { x, y };
    else if (ch === 'E') G.ents.push({ kind: 'exit', x, y, locked: false });
    else if (ch === 'M') mentorPts.push({ x, y });
    else if (ch === 'S') G.ents.push({ kind: 'stone', x, y, id: R.id });
    else if (ch === 'K') G.ents.push({ kind: 'check', x, y, on: false });
    else if (/[1-9]/.test(ch)) G.ents.push({ kind: 'door', x, y, type: def.doors[ch], used: false, a: 1 });
    else if (ch === 'Z') G.ents.push({ kind: 'zdoor', x, y });
    else if (ch === 'G') G.ents.push({ kind: 'gdoor', x, y });
    else if (ch === 'B' || ch === 'V') {
      G.movers.push({ axis: ch === 'B' ? 'h' : 'v', cx: x, cy: y, range: (it.r || 3) * T, period: 4.6, t: 0, x: x - 48, y, w: 96, h: 12, dx: 0, dy: 0 });
    }
    else if (ch === 'R' && CH.rival) G.ents.push({ kind: 'rival', x, y, state: 'wait', a: 1, said: false });
    else if (ch === 'H') G.ents.push({ kind: 'shadow', x, y, mode: def.script === 'signs' ? 'signs' : 'flee', face: 1, sign: -1, a: 1, tauntI: 0, tauntT: 1.5, run: 0 });
    else if (ch === 'O') G.ents.push({ kind: 'bench', x, y, done: false });
    else if (ch === 'L') G.ents.push({ kind: 'lantern', x, y });
    else if (ch === 'Y') G.ents.push({ kind: 'podium', x, y });
    else if (ch === 'T') G.ents.push({ kind: 'trophy', x, y: y - 40, taken: false });
    else if (ch === 'Q') G.ents.push({ kind: 'crowd', x, y, ang: 0, tipped: false, back: true });
    else if (ch === 'A') G.ents.push({ kind: 'mentorFinal', x, y, lit: false });
    else if (ch === 'U') G.ents.push({ kind: 'pillar', x, y, used: false });
  }
  byX('N').forEach((it, i) => G.ents.push({ kind: 'note', x: px(it), y: surf(it), id: R.id + '#' + i, text: (def.notes || [])[i] || '' }));
  byX('F').forEach((it, i) => G.ents.push({ kind: 'frag', x: px(it), y: surf(it), text: def.compose ? def.compose.tiles[i % def.compose.tiles.length][0] : '', got: false }));
  if (mentorPts.length && CH.mentor) {
    const m0 = mentorPts[0];
    G.ents.push({ kind: 'mentor', x: m0.x, y: m0.y, pts: mentorPts, idx: 0, mode: CH.mentor, a: 1, face: 1, fading: false });
  }
  const exit = G.ents.find(e => e.kind === 'exit');
  if (exit && (def.compose || def.script === 'podium' || def.script === 'signs')) exit.locked = true;
  G.start = start; G.respawn = { x: start.x, y: start.y };
  G.p = newPlayer(start.x, start.y);
  if (SCRIPTS[def.script] && SCRIPTS[def.script].init) SCRIPTS[def.script].init();
  snapCamera();
  if (!CH.extra) { save.started = true; save.chapter = ci; save.room = ri; save.unlocked = Math.max(save.unlocked, ci); }
  persist();
  Sound.setMood(CH.mood); Sound.setThin(false);
}

function newPlayer(x, y) {
  return { x: x - 10, y: y - 28, w: 20, h: 28, vx: 0, vy: 0, ground: false, face: 1, coyote: 0, buf: 0, run: 0, sit: 0,
    onMover: null, fx: { flip: 0, sit: 0, reverse: 0, heavy: 0, dark: 0 }, flipping: false, landT: 0, hidden: 0 };
}


function startChapter(ci, ri = 0) {
  loadRoom(ci, ri);
  const CH = CHAPTERS[ci];
  const showTitle = () => showCard({ title: CH.extra ? '' : 'Chapter ' + ci, sub: CH.title, auto: 3.2, cb: () => { scene = 'play'; } });
  if (ci === 0 && ri === 0) showCard({ lines: OPENING_NOTE, sig: true, stagger: 1.6, cb: showTitle });
  else if (ri === 0) showTitle();
  else scene = 'play';
}
function nextRoom() {
  if (G.leaving) return;
  G.leaving = true;
  const { ci, ri, CH } = G.R;
  if (CH.extra) { practiceDone(); return; }
  if (ri + 1 < CH.rooms.length) fadeTo(() => { loadRoom(ci, ri + 1); scene = 'play'; });
  else endChapter();
}
function endChapter() {
  const ci = G.R.ci;
  if (ci >= 8) {
    save.finished = true; save.unlocked = 9; save.chapter = 8; save.room = 2; persist();
    fadeTo(() => showCard({ lines: ENDING, sig: true, stagger: 2.6, cb: () => showCard({ lines: ['The Gallery and the Practice Yard are now open from the title screen.'], cb: toTitle }) }));
    return;
  }
  save.unlocked = Math.max(save.unlocked, ci + 1); save.chapter = ci + 1; save.room = 0; persist();
  fadeTo(() => startChapter(ci + 1, 0));
}
function toTitle() { fadeTo(() => { scene = 'title'; menu = null; Sound.setMood('quiet'); Sound.setThin(false); }); }
function fadeTo(cb) { if (fade.dir === 1) return; fade.dir = 1; fade.cb = cb; }


function say(text, opts = {}) { G.lines.push({ text, cb: opts.cb, style: opts.style || 'line' }); }
function toast(text) { G.toasts.push({ text, t: 0 }); }
function lineDur(l) { return (l.style === 'stone' ? 2.8 : 1.6) + l.text.length * 0.05; }
function updateLines(dt) {
  if (!G.line && G.lines.length) G.line = Object.assign(G.lines.shift(), { t: 0 });
  if (G.line) {
    G.line.t += dt;
    if (G.line.t > lineDur(G.line) + 1.0) { const cb = G.line.cb; G.line = null; if (cb) cb(); }
  }
  for (const t of G.toasts) t.t += dt;
  G.toasts = G.toasts.filter(t => t.t < 4);
}
function linesIdle() { return !G.line && !G.lines.length; }


function burst(x, y, n, color, spd = 120, life = 0.9, size = 3, grav = 200) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life, max: life, color, size, grav });
  }
}
function updateParts(dt) {
  for (const p of G.parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 600) G.parts.splice(0, G.parts.length - 600);
}


function moveX(p, dx) {
  if (!dx) return false;
  p.x += dx;
  const r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.01) / T);
  if (dx > 0) {
    const c = Math.floor((p.x + p.w - 0.01) / T);
    for (let r = r0; r <= r1; r++) if (isSolid(c, r)) { p.x = c * T - p.w; p.vx = 0; return true; }
  } else {
    const c = Math.floor(p.x / T);
    for (let r = r0; r <= r1; r++) if (isSolid(c, r)) { p.x = (c + 1) * T; p.vx = 0; return true; }
  }
  return false;
}
function moveY(p, dy) {
  if (!dy) return 0;
  const prevBot = p.y + p.h;
  p.y += dy;
  const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T);
  if (dy > 0) {
    const r = Math.floor((p.y + p.h) / T);
    for (let c = c0; c <= c1; c++) {
      if (isSolid(c, r) || (isOneWay(c, r) && prevBot <= r * T + 0.5)) { p.y = r * T - p.h; return 1; }
    }
  } else {
    const r = Math.floor(p.y / T);
    for (let c = c0; c <= c1; c++) if (isSolid(c, r)) { p.y = (r + 1) * T; return -1; }
  }
  return 0;
}
function overlapsCell(p, idx) {
  const c = idx % G.R.w, r = Math.floor(idx / G.R.w);
  return p.x < (c + 1) * T && p.x + p.w > c * T && p.y < (r + 1) * T && p.y + p.h > r * T;
}
function windAt(p) {
  if (!G.R.wind.length) return 0;
  const c = Math.floor((p.x + p.w / 2) / T);
  if (!G.R.wind.some(([a, b]) => c >= a && c <= b)) return 0;
  return windGust() ? -1 : 0;
}
function windGust() { return (G.time % 4.2) < 1.9; }

function updatePlayer(dt) {
  const p = G.p, fx = p.fx;
  for (const k in fx) if (fx[k] > 0) fx[k] = Math.max(0, fx[k] - dt);
  if (p.flipping && fx.flip === 0) { p.flipping = false; respawn(false); toast('Back where I was. More or less.'); }
  const g = fx.flip > 0 ? -1 : 1;
  const locked = G.inputLock || p.hidden > 0;
  if (p.hidden > 0) p.hidden -= dt;
  let dir = locked ? 0 : (IN.right() ? 1 : 0) - (IN.left() ? 1 : 0);
  if (fx.reverse > 0) dir = -dir;
  if (p.sit > 0) { p.sit -= dt; dir = 0; }
  const spd = RUN * G.R.speed;
  p.vx = approach(p.vx, dir * spd, (p.ground ? 2400 : 1500) * dt);
  if (dir) p.face = dir;

  p.coyote = p.ground ? 0.1 : Math.max(0, p.coyote - dt);
  if (!locked && IN.jump()) p.buf = 0.13; else p.buf = Math.max(0, p.buf - dt);
  if (p.buf > 0 && p.coyote > 0 && p.sit <= 0) {
    p.buf = 0;
    if (fx.sit > 0) { p.sit = 0.8; p.vx = 0; }
    else {
      p.vy = -g * JUMP * (fx.heavy > 0 ? 0.6 : 1); p.ground = false; p.coyote = 0; p.onMover = null;
      Sound.play('jump');
    }
  }
  const rising = p.vy * g < 0;
  const mult = rising && !(IN.jumpHeld() && !locked) ? 2.4 : 1;
  p.vy = clamp(p.vy + g * GRAV * mult * dt, -MAXFALL, MAXFALL);

  
  if (p.onMover) { const m = p.onMover; moveX(p, m.dx); p.y = m.y - p.h; }
  const wasGround = p.ground;
  p.ground = false;
  const prevBot = p.y + p.h;
  const w = windAt(p);
  const steps = 2;
  for (let i = 0; i < steps; i++) {
    moveX(p, (p.vx + w * (wasGround ? 125 : 165)) * dt / steps);
    const hit = moveY(p, p.vy * dt / steps);
    if (hit) { if (hit === g) p.ground = true; p.vy = 0; }
  }
  
  p.onMover = null;
  if (g > 0 && p.vy >= 0) {
    for (const m of G.movers) {
      if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2 && prevBot <= m.y - m.dy + 3 && p.y + p.h >= m.y - 1) {
        p.y = m.y - p.h; p.vy = 0; p.ground = true; p.onMover = m; break;
      }
    }
  }
  if (p.ground && !wasGround) { Sound.play('land'); p.landT = 0.12; }
  p.landT = Math.max(0, p.landT - dt);
  if (Math.abs(p.vx) > 5 && p.ground) p.run += dt * 14 * G.R.speed;

  
  if (p.ground && !p.onMover && g > 0) {
    const r = Math.floor((p.y + p.h + 1) / T);
    for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - 0.01) / T); c++) {
      if (tileAt(c, r) === 3) { const m = G.R.meta.get(r * G.R.w + c); if (m.state === 'idle') { m.state = 'shake'; m.t = 0.42; } }
    }
  }
  
  const pg = Object.entries(G.R.groups).filter(([k, cells]) => k[0] === 'p' && cells.some(m => !m.on));
  if (pg.length) {
    if (p.ground && dir === 0 && Math.abs(p.vx) < 1 && !IN.jumpHeld()) G.still += dt; else G.still = 0;
    if (G.still > 1.0) {
      G.fillT -= dt;
      if (G.fillT <= 0) {
        G.fillT = 0.11;
        const px = p.x + p.w / 2;
        let best = null, bd = 1e9;
        for (const [, cells] of pg) for (const m of cells) if (!m.on) { const d = Math.abs(((m.idx % G.R.w) + 0.5) * T - px); if (d < bd) { bd = d; best = m; } }
        if (best && bd < 6 * T) { best.on = true; best.glow = 1; Sound.play('tick'); }
      }
    }
  }

  
  if (p.y > ROWS * T + 80 || p.y < -260) {
    if (p.flipping) { p.flipping = false; fx.flip = 0; respawn(false); toast('Back where I was. More or less.'); }
    else respawn(true);
  }
}
function respawn(counted) {
  const p = G.p;
  if (counted) { G.fails++; Sound.play('fail'); }
  const np = newPlayer(G.respawn.x, G.respawn.y);
  np.face = p.face; np.fx = { flip: 0, sit: p.fx.sit, reverse: p.fx.reverse, heavy: p.fx.heavy, dark: 0 };
  G.p = np;
  burst(G.respawn.x, G.respawn.y - 14, 14, G.R.pal.accent, 90, 0.7, 2.5, 0);
}
function skipAhead() {
  const cur = G.respawn.x;
  const cps = G.ents.filter(e => e.kind === 'check' && e.x > cur + T).sort((a, b) => a.x - b.x);
  let target = null;
  if (cps.length) { target = cps[0]; target.on = true; }
  else {
    const ex = G.ents.find(e => e.kind === 'exit');
    if (ex && !ex.locked) { const sx = ex.x - 2 * T; const sy = surfaceY(sx, ex.y - T); target = { x: sx, y: sy != null ? sy : ex.y }; }
  }
  if (!target) return;
  G.respawn = { x: target.x, y: target.y };
  G.fails = 0;
  respawn(false);
  toast('Skipped ahead. No shame in that one.');
}


function updateWorld(dt) {
  for (const m of G.movers) {
    m.t += dt;
    const off = Math.sin(m.t / m.period * Math.PI * 2) * m.range;
    const nx = m.axis === 'h' ? m.cx - 48 + off : m.cx - 48;
    const ny = m.axis === 'v' ? m.cy - off : m.cy;
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
  }
  for (const m of G.R.crumbles) {
    if (m.state === 'shake') { m.t -= dt; if (m.t <= 0) { m.state = 'gone'; m.t = 2.6; const c = m.idx % G.R.w, r = Math.floor(m.idx / G.R.w); G.parts.push({ x: c * T + 16, y: r * T + 6, vx: 0, vy: 40, life: 1.2, max: 1.2, color: '#b98b5e', size: 0, plank: true, grav: 900 }); Sound.play('crumble'); } }
    else if (m.state === 'gone') { m.t -= dt; if (m.t <= 0 && !overlapsCell(G.p, m.idx)) m.state = 'idle'; }
  }
  for (const [, cells] of Object.entries(G.R.groups)) for (const m of cells) if (m.glow > 0) m.glow = Math.max(0, m.glow - dt * 0.8);
  
  if (G.R.wind.length && windGust() && Math.random() < 0.7) {
    const [a, b] = G.R.wind[0];
    const x = G.cam.x + VW + 20, y = G.cam.y + rnd(60, VH - 40);
    if (x / T > a && (G.cam.x) / T < b) G.parts.push({ x, y, vx: -rnd(500, 700), vy: 0, life: 2, max: 2, color: 'rgba(255,255,255,0.35)', size: 0, streak: true, grav: 0 });
  }
}


function near(e, rx = 34, ry = 60) {
  const p = G.p, px = p.x + p.w / 2, pf = p.y + p.h;
  return Math.abs(px - e.x) < rx && Math.abs(pf - e.y) < ry;
}
const INTERACT = {
  stone: { label: e => save.stones.includes(e.id) ? 'Read again' : 'Read', use(e) {
    say(STONES[e.id], { style: 'stone' });
    if (!save.stones.includes(e.id)) { save.stones.push(e.id); persist(); toast('Lesson stone ' + save.stones.length + ' of 6'); }
    Sound.play('chime'); e.lit = 1.5;
  } },
  note: { label: () => 'Read', use(e) {
    say(e.text, { style: 'note' });
    if (!save.notes.includes(e.id)) { save.notes.push(e.id); persist(); toast('Hidden note found'); }
    Sound.play('page');
  } },
  door: { label: e => e.type === 'pass' || e.type === 'shadow' ? 'Take the shortcut' : 'Shortcut?', ok: e => !e.used, use: useDoor },
  zdoor: { label: () => 'Boarded up', use() { if (linesIdle()) say('Boarded up. Good.'); } },
  gdoor: { label: () => 'Locked', use() { if (linesIdle()) say('Locked. Good.'); } },
  bench: { label: e => e.done ? '' : 'Sit down', ok: e => !e.done, use: openCompose },
  lantern: { label: () => 'Pick up', use(e) {
    G.inputLock = true;
    say('His lantern. He isn\'t here.', { cb: () => {
      G.ents = G.ents.filter(x => x !== e); G.lantern = true; Sound.play('chime');
      say('I took it with me.', { cb: () => { G.inputLock = false; const ex = G.ents.find(x => x.kind === 'exit'); ex.locked = false; } });
    } });
  } },
  podium: { label: () => 'Step up', use() { if (linesIdle()) { say('It\'s cardboard. It bends when I stand on it.'); Sound.play('crumble'); } } },
  trophy: { label: () => 'Pick up the trophy', ok: e => !e.taken, use(e) {
    e.taken = true; say('I won.'); say(CARDS.trophy.line); awardCard('trophy');
  } },
  mentorFinal: { label: () => 'Give back the lantern', ok: e => !e.lit, use: e => SCRIPTS.apology.give(e) },
  pillar: { label: () => 'Remember', ok: e => !e.used, use: e => SCRIPTS.finale.use(e) },
  shadow: { label: e => e.mode === 'signs' && e.sign >= 0 && !e.merging ? 'Accept' : '', ok: e => e.mode === 'signs' && e.sign >= 0 && !e.merging, use: e => SCRIPTS.signs.accept(e) }
};

function awardCard(type) {
  if (!save.cards.includes(type)) { save.cards.push(type); persist(); toast('Backfire card: ' + CARDS[type].name); }
}

function useDoor(e) {
  const p = G.p, type = e.type;
  e.used = true; Sound.play('door');
  burst(e.x, e.y - 28, 24, G.R.pal.accent, 160, 0.8, 3, 0);
  if (type === 'pass' || type === 'shadow') {
    const tx = (G.R.def.passTo + 0.5) * T, ty = surfaceY(tx, 2 * T);
    G.respawn = { x: tx, y: ty };
    G.p = newPlayer(tx, ty); G.p.hidden = 0.5;
    if (type === 'shadow') {
      G.hasShadow = false;
      G.ents.push({ kind: 'shadowStay', x: e.x - 18, y: e.y, t: 0 });
      awardCard('shadow');
      say(CARDS.shadow.line);
    }
    if (SCRIPTS[G.R.def.script] && SCRIPTS[G.R.def.script].onPass) SCRIPTS[G.R.def.script].onPass();
    return;
  }
  awardCard(type);
  setTimeout(() => Sound.play('backfire'), 350);
  say(CARDS[type].line);
  const fx = p.fx;
  switch (type) {
    case 'loop':
      G.respawn = { x: G.start.x, y: G.start.y }; G.ents.forEach(x => { if (x.kind === 'check') x.on = false; });
      respawn(false); G.p.hidden = 0.4; break;
    case 'flip': fx.flip = 4.2; p.flipping = true; p.vy = 0; p.ground = false; break;
    case 'sit': fx.sit = 7; break;
    case 'reverse': fx.reverse = 7; break;
    case 'heavy': fx.heavy = 8; break;
    case 'closet': fx.dark = 3.4; G.p.vx = 0; break;
    case 'coins': G.ents.push({ kind: 'coins', x: e.x + 22, y: e.y, t: 0 }); break;
    case 'ladder': p.vy = -420; p.ground = false; break;
  }
}

function updateEnts(dt) {
  const p = G.p, px = p.x + p.w / 2, pf = p.y + p.h;
  for (const e of G.ents) {
    switch (e.kind) {
      case 'exit':
        if (!e.locked && Math.abs(px - e.x) < 22 && Math.abs(pf - e.y) < 50) {
          if (SCRIPTS[G.R.def.script] && SCRIPTS[G.R.def.script].onExit) SCRIPTS[G.R.def.script].onExit();
          else nextRoom();
        } else if (e.locked && Math.abs(px - e.x) < 40 && Math.abs(pf - e.y) < 60 && linesIdle() && !G.flags.lockSaid) {
          G.flags.lockSaid = true;
          say(G.R.def.compose ? 'Not yet. I should sit down for a minute first.' : 'Not yet.');
        }
        break;
      case 'check':
        if (!e.on && Math.abs(px - e.x) < 24 && Math.abs(pf - e.y) < 60) {
          G.ents.forEach(x => { if (x.kind === 'check') x.on = x === e || (x.on && x.x < e.x); });
          e.on = true; G.respawn = { x: e.x, y: e.y }; G.fails = 0; Sound.play('tick');
        }
        break;
      case 'frag':
        if (!e.got && Math.abs(px - e.x) < 24 && Math.abs(pf - e.y) < 60) {
          e.got = true; toast('Picked up: "' + e.text + '"'); Sound.play('collect');
          burst(e.x, e.y - 30, 10, G.R.pal.accent, 70, 0.8, 2, -30);
        }
        break;
      case 'door': if (e.used) e.a = Math.max(0, e.a - dt * 1.2); break;
      case 'stone': if (e.lit > 0) e.lit -= dt; break;
      case 'mentor': updateMentor(e, dt); break;
      case 'rival': updateRival(e, dt); break;
      case 'shadow': updateShadow(e, dt); break;
      case 'shadowStay': e.t += dt; break;
      case 'coins': e.t += dt; break;
      case 'crowd':
        if (!e.tipped && px > e.x - 7 * T) { e.tipped = true; e.fall = 0; G.flags.crowdT = 0; }
        if (e.tipped && e.ang < Math.PI / 2) {
          e.fall += dt * 2.2; e.ang = Math.min(Math.PI / 2, e.ang + e.fall * dt * 2.2);
          if (e.ang >= Math.PI / 2) { Sound.play('thud'); burst(e.x, e.y - 4, 30, '#8d909c', 160, 1, 3, 300); say('The crowd was painted on.'); }
        }
        break;
    }
  }
  G.ents = G.ents.filter(e => !(e.kind === 'door' && e.used && e.a <= 0) && !(e.kind === 'coins' && e.t > 4) && !e.dead);
}

function updateMentor(e, dt) {
  const p = G.p, px = p.x + p.w / 2;
  if (e.fading) { e.a = Math.max(0, e.a - dt * 0.5); if (e.a <= 0) e.dead = true; }
  let tx = e.x;
  if (e.mode === 'lead') {
    if (e.idx < e.pts.length - 1 && px > e.x - 5 * T && Math.abs(px - e.x) < 4.5 * T) e.idx++;
    tx = e.pts[e.idx].x;
  } else if (e.mode === 'walk') {
    tx = px - 46 * p.face;
    if (Math.abs(tx - e.x) < 30) tx = e.x;
  }
  const sp = e.mode === 'walk' ? 260 : 150;
  const prev = e.x;
  e.x = approach(e.x, tx, sp * dt);
  if (Math.abs(e.x - prev) > 0.1) e.face = Math.sign(e.x - prev);
  else e.face = Math.sign(px - e.x) || e.face;
  e.walk = Math.abs(e.x - prev) > 0.1 ? (e.walk || 0) + dt * 8 : 0;
  const s = surfaceY(e.x, e.y);
  if (s != null) e.y += (s - e.y) * Math.min(1, dt * 7);
}
function updateRival(e, dt) {
  const p = G.p, px = p.x + p.w / 2;
  if (e.state === 'wait') { if (px > e.x + 2 * T || G.time > 2) e.state = 'run'; }
  else if (e.state === 'run') {
    e.x += 255 * dt; e.run = (e.run || 0) + dt * 16;
    const s = surfaceY(e.x, e.y); if (s != null) e.y += (s - e.y) * Math.min(1, dt * 10);
    if (!e.said && e.x > px + 20) { e.said = true; const L = G.R.def.rivalLines; if (L) say(L[0]); }
    if (e.x > (G.R.w - 2) * T) e.state = 'gone';
  } else e.a = Math.max(0, e.a - dt);
}
function updateShadow(e, dt) {
  const p = G.p, px = p.x + p.w / 2, def = G.R.def;
  if (e.mode === 'flee') {
    const exit = G.ents.find(x => x.kind === 'exit');
    const limit = exit ? exit.x - T : (G.R.w - 2) * T;
    const d = e.x - px;
    let sp = 0;
    if (d < 7 * T) sp = RUN * 1.15;
    else if (d > 11 * T) sp = 0;
    else sp = e.lastSp || 0;
    e.lastSp = sp;
    const prev = e.x;
    e.x = Math.min(limit, e.x + sp * dt);
    e.run += Math.abs(e.x - prev) > 0.1 ? dt * 16 : 0;
    e.face = 1;
    const s = surfaceY(e.x, e.y); if (s != null) e.y += (s - e.y) * Math.min(1, dt * 10);
    if (e.x >= limit - 1 && px > limit - 4 * T) e.a = Math.max(0, e.a - dt * 2);
    e.tauntT -= dt;
    if (def.taunts && e.tauntT <= 0 && e.tauntI < def.taunts.length && Math.abs(d) < 14 * T) {
      e.say = { text: def.taunts[e.tauntI++], t: 3.2 }; e.tauntT = 8;
    }
  } else if (e.mode === 'signs') {
    e.face = Math.sign(px - e.x) || -1;
    if (e.sign < 0 && Math.abs(px - e.x) < 7 * T) { e.sign = 0; Sound.play('page'); }
    if (e.merging) {
      e.x = approach(e.x, px, 90 * dt); e.run += dt * 8;
      if (Math.abs(e.x - px) < 4) {
        e.dead = true; G.hasShadow = true; Sound.play('merge');
        burst(px, p.y + 14, 40, G.R.pal.accent, 140, 1.2, 3, 0);
        G.inputLock = true;
        say('There you are.', { cb: () => say('Okay. The long way back, then.', { cb: () => { G.inputLock = false; G.ents.find(x => x.kind === 'exit').locked = false; } }) });
      }
    }
  }
  if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
}


const SIGNS = ['You cheated.', 'He trusted you.', 'You let him down.', 'It was wrong.'];
const SCRIPTS = {
  wallEnd: {
    update() {
      if (!G.flags.done && G.p.x > 26 * T) {
        G.flags.done = true; G.inputLock = true; Sound.setThin(true);
        say('It was too high.');
        say('I had trained for this. It still wasn\'t enough.');
        say('And then I saw it.', { cb: endChapter });
      }
    }
  },
  firstShortcut: {
    init() { Sound.setThin(true); },
    onPass() {
      const m = G.ents.find(e => e.kind === 'mentor'); if (m) m.fading = true;
      Sound.setThin(false);
      say('It worked.'); say('That was the problem.');
    }
  },
  podium: {},
  signs: {
    accept(e) {
      Sound.play('chime');
      if (e.sign < SIGNS.length - 1) e.sign++;
      else { e.sign = -2; e.merging = true; }
    }
  },
  apology: {
    give(m) {
      m.lit = true; G.inputLock = true; G.lantern = false;
      G.flags.lanternFly = { t: 0, from: { x: G.p.x + G.p.w / 2 + 10 * G.p.face, y: G.p.y + 12 }, to: { x: m.x + 13 * (m.x > G.p.x ? -1 : 1), y: m.y - 22 } };
      Sound.play('chime');
      setTimeout(() => { if (G && G.R.id === 'c7r1') showCard({ lines: APOLOGY, stagger: 3.4, hold: 4, cb: endChapter }); }, 3600);
    },
    update(dt) {
      const f = G.flags.lanternFly;
      if (f) { f.t = Math.min(1, f.t + dt * 0.8); G.darkAlpha = lerp(0.86, 0.35, f.t); }
    }
  },
  finale: {
    init() { G.flags.steps = 0; },
    use(e) {
      e.used = true;
      const order = ['a', 'b', 'c', 'd', 'e', 'f'];
      const g = order[G.flags.steps];
      say(STONES[STONE_ORDER[G.flags.steps]], { style: 'stone' });
      G.flags.steps++;
      for (const m of G.R.groups[g]) { m.on = true; m.glow = 1; const c = m.idx % G.R.w, r = Math.floor(m.idx / G.R.w); burst(c * T + 16, r * T, 10, G.R.pal.accent, 80, 0.8, 2.5, 0); }
      Sound.play('chime');
      if (G.flags.steps === 6) say('The moves were there the whole time.');
    }
  },
  practice: {
    init() { G.flags.clock = 0; G.flags.running = false; },
    update(dt) {
      if (!G.flags.running && !G.flags.finished && (Math.abs(G.p.vx) > 1 || !G.p.ground)) G.flags.running = true;
      if (G.flags.running) G.flags.clock += dt;
    }
  }
};
function practiceDone() {
  const t = G.flags.clock;
  G.flags.running = false; G.flags.finished = true;
  const best = save.best == null || t < save.best;
  if (best) { save.best = t; persist(); }
  showCard({ lines: ['Time: ' + t.toFixed(1) + ' s', best ? 'A new best.' : 'Best: ' + save.best.toFixed(1) + ' s', 'No shortcuts were taken.'], stagger: 0.8, prompt: 'Enter to go again, Esc for the title screen',
    cb: () => fadeTo(() => { loadRoom(9, 0); scene = 'play'; }) });
}


function openCompose(bench) {
  const def = G.R.def.compose;
  compose = { bench, tiles: def.tiles.map(([text, ord]) => ({ text, ord, gone: false, shake: 0, crumble: 0 })), placed: [], msg: '', msgT: 0, done: false, doneT: 0, excuse: 0, rects: [] };
  compose.need = compose.tiles.filter(t => t.ord > 0).length;
  scene = 'compose'; Sound.play('page');
}
function composePick(tile) {
  if (compose.done || tile.gone || tile.crumble > 0) return;
  if (tile.ord === 0) {
    tile.crumble = 0.7; Sound.play('crumble');
    compose.msg = EXCUSE_LINES[compose.excuse++ % EXCUSE_LINES.length]; compose.msgT = 3;
  } else if (tile.ord === compose.placed.length + 1) {
    compose.placed.push(tile); tile.gone = true; Sound.play('collect');
    if (compose.placed.length === compose.need) { compose.done = true; Sound.play('chime'); }
  } else {
    tile.shake = 0.4; compose.msg = 'Not that one yet. Where does it start?'; compose.msgT = 2.5; Sound.play('tick');
  }
}
function updateCompose(dt) {
  const c = compose;
  for (const t of c.tiles) { if (t.shake > 0) t.shake -= dt; if (t.crumble > 0) { t.crumble -= dt; if (t.crumble <= 0) t.gone = true; } }
  if (c.msgT > 0) c.msgT -= dt;
  if (c.done) {
    c.doneT += dt;
    if (c.doneT > 2.8) {
      const sentence = c.placed.map(t => t.text).join(' ');
      c.bench.done = true; scene = 'play';
      const ex = G.ents.find(e => e.kind === 'exit'); if (ex) ex.locked = false;
      say(sentence); compose = null;
    }
    return;
  }
  const visible = c.tiles.filter(t => !t.gone);
  for (let i = 0; i < visible.length; i++) if (was('Digit' + (i + 1), 'Numpad' + (i + 1))) composePick(visible[i]);
  if (mouse.click) for (const r of c.rects) if (mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > r.y && mouse.y < r.y + r.h) composePick(r.tile);
  if (IN.back()) { scene = 'play'; compose = null; }
}


function updatePlay(dt) {
  G.time += dt;
  if (IN.back()) { openPause(); return; }
  updateWorld(dt);
  updatePlayer(dt);
  updateEnts(dt);
  const sc = SCRIPTS[G.R.def.script];
  if (sc && sc.update) sc.update(dt);
  
  const pc = (G.p.x + G.p.w / 2) / T;
  (G.R.def.lines || []).forEach(([col, text], i) => { if (!G.triggered.has(i) && pc >= col) { G.triggered.add(i); say(text); } });
  
  G.focus = null;
  if (!G.inputLock && G.p.hidden <= 0) {
    let best = null, bd = 1e9;
    for (const e of G.ents) {
      const I = INTERACT[e.kind];
      if (!I || (I.ok && !I.ok(e))) continue;
      if (!I.label(e)) continue;
      const rx = e.kind === 'crowd' ? 0 : (e.kind === 'shadow' ? 60 : 34);
      if (near(e, rx, 64)) { const d = Math.abs(G.p.x + G.p.w / 2 - e.x); if (d < bd) { bd = d; best = e; } }
    }
    G.focus = best;
    if (best && IN.act()) INTERACT[best.kind].use(best);
  }
  if (G.fails >= 3 && was('KeyK')) skipAhead();
  updateLines(dt);
  updateParts(dt);
  updateCamera(dt);
}
function snapCamera() { updateCamera(1, true); }
function updateCamera(dt, snap) {
  const p = G.p, maxX = Math.max(0, G.R.w * T - VW), maxY = Math.max(0, ROWS * T - VH);
  const tx = clamp(p.x + p.w / 2 - VW * 0.42 + p.face * 40, 0, maxX);
  const ty = clamp(p.y - VH * 0.55, 0, maxY);
  if (snap) { G.cam.x = tx; G.cam.y = ty; return; }
  G.cam.x = lerp(G.cam.x, tx, Math.min(1, dt * 4));
  G.cam.y = lerp(G.cam.y, ty, Math.min(1, dt * 3));
}


function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function glow(x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function wrap(text, maxW) {
  const words = text.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function textShadow(on) { ctx.shadowColor = on ? 'rgba(8,10,20,0.75)' : 'transparent'; ctx.shadowBlur = on ? 14 : 0; }

function drawSky(pal, camx, camy, t, bg) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, pal.sky[0]); g.addColorStop(0.55, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (pal.stars) {
    for (let i = 0; i < 90; i++) {
      const x = (hash(i) * 2000 - camx * 0.03) % VW, y = hash(i + 50) * VH * 0.6;
      ctx.globalAlpha = pal.stars * (0.35 + 0.35 * Math.sin(t * (0.5 + hash(i + 9)) + i));
      ctx.fillStyle = '#fff'; ctx.fillRect((x + VW) % VW, y, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  const cx = VW * 0.74 - camx * 0.02, cy = 110 - camy * 0.05;
  if (pal.sun) { glow(cx, cy, 160, pal.sun, 0.35); ctx.fillStyle = pal.sun; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 7); ctx.fill(); }
  if (pal.moon) { glow(cx, cy, 120, '#5b6890', 0.4); ctx.fillStyle = pal.moon; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill(); ctx.fillStyle = pal.sky[0]; ctx.beginPath(); ctx.arc(cx + 9, cy - 5, 19, 0, 7); ctx.fill(); }
  const hills = (col, par, base, amp, f, seed) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
    for (let x = 0; x <= VW + 8; x += 8) { const wx = x + camx * par; ctx.lineTo(x, base - camy * par + Math.sin(wx * f + seed) * amp + Math.sin(wx * f * 2.7 + seed * 2) * amp * 0.4); }
    ctx.lineTo(VW, VH); ctx.fill();
  };
  hills(pal.hill1, 0.15, 330, 40, 0.004, 1.3);
  if (bg === 'stadium') {
    const off = -(camx * 0.3) % 520;
    ctx.fillStyle = pal.hill2;
    for (let k = -1; k < 4; k++) {
      const x0 = off + k * 520;
      ctx.beginPath(); ctx.moveTo(x0, VH); ctx.lineTo(x0, 300); ctx.lineTo(x0 + 60, 260); ctx.lineTo(x0 + 400, 260); ctx.lineTo(x0 + 460, 300); ctx.lineTo(x0 + 460, VH); ctx.fill();
      ctx.fillRect(x0 + 470, 170, 6, 400);
      ctx.fillRect(x0 + 452, 160, 42, 16);
      glow(x0 + 473, 168, 60, pal.sun || '#ffffff', 0.15);
      ctx.globalAlpha = 0.18; ctx.fillStyle = pal.top;
      for (let row = 0; row < 4; row++) ctx.fillRect(x0 + 20 + row * 12, 290 + row * 26, 420 - row * 24, 3);
      ctx.globalAlpha = 1; ctx.fillStyle = pal.hill2;
    }
  } else hills(pal.hill2, 0.35, 400, 30, 0.006, 4.1);
}

function drawTiles() {
  const R = G.R, pal = R.pal, cx = G.cam.x, cy = G.cam.y;
  const c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(R.w - 1, Math.floor((cx + VW) / T));
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const t = R.tiles[r * R.w + c]; if (!t) continue;
    const x = c * T - cx, y = r * T - cy;
    if (t === 1) {
      ctx.fillStyle = pal.ground; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      if (hash(c * 31 + r) > 0.8) { ctx.fillStyle = pal.edge; ctx.fillRect(x + hash(c + r * 7) * 20 + 4, y + 10 + hash(c * 3 + r) * 14, 4, 3); }
      if (!isSolid(c, r - 1) && r > 0) { ctx.fillStyle = pal.top; ctx.fillRect(x, y, T + 0.5, 5); ctx.fillStyle = pal.edge; ctx.fillRect(x, y + 5, T + 0.5, 2); }
      if (r < ROWS - 1 && !isSolid(c, r + 1) && tileAt(c, r + 1) !== 1) { ctx.fillStyle = pal.edge; ctx.fillRect(x, y + T - 4, T + 0.5, 4); }
    } else if (t === 2) {
      ctx.fillStyle = pal.edge; ctx.fillRect(x + 4, y + 6, 3, 10); ctx.fillRect(x + T - 7, y + 6, 3, 10);
      ctx.fillStyle = pal.top; rr(x, y, T + 0.5, 7, 2); ctx.fill();
    } else if (t === 3) {
      const m = R.meta.get(r * R.w + c); if (m.state === 'gone') continue;
      const sh = m.state === 'shake' ? rnd(-1.5, 1.5) : 0;
      ctx.fillStyle = '#b98b5e'; ctx.fillRect(x + 1 + sh, y + sh, T - 2, 10);
      ctx.fillStyle = '#8a6440'; ctx.fillRect(x + 1 + sh, y + 8 + sh, T - 2, 2); ctx.fillRect(x + 12 + sh, y + sh, 2, 8);
    } else if (t === 4) {
      const m = R.meta.get(r * R.w + c);
      if (m.on) {
        ctx.fillStyle = pal.ground; ctx.fillRect(x, y, T + 0.5, T + 0.5); ctx.fillStyle = pal.top; ctx.fillRect(x, y, T + 0.5, 5);
        if (m.glow > 0) { ctx.globalAlpha = m.glow; ctx.fillStyle = pal.accent; ctx.fillRect(x, y, T, T); ctx.globalAlpha = 1; }
      } else {
        ctx.strokeStyle = pal.text; ctx.globalAlpha = 0.18 + 0.1 * Math.sin(G.time * 2 + c); ctx.setLineDash([4, 5]);
        ctx.strokeRect(x + 3, y + 3, T - 6, T - 6); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    } else if (t === 5) {
      const m = R.meta.get(r * R.w + c);
      if (m.on) {
        ctx.fillStyle = pal.top; rr(x, y, T + 0.5, 9, 3); ctx.fill();
        if (m.glow > 0) glow(x + 16, y + 4, 30, pal.accent, m.glow);
      } else {
        ctx.fillStyle = pal.text; ctx.globalAlpha = 0.12; ctx.fillRect(x + 4, y + 2, T - 8, 3); ctx.globalAlpha = 1;
      }
    }
  }
}

function drawFigure(x, y, o) {
  const face = o.face || 1, run = o.run || 0, moving = o.moving;
  ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.translate(x, y);
  if (o.flip) ctx.scale(1, -1);
  ctx.scale(face, 1);
  const body = o.body || '#f4ead8', dark = o.limb || '#c9bba4', scarf = o.scarf || '#e07a5f';
  if (o.sit) {
    ctx.fillStyle = dark; ctx.fillRect(-4, -5, 12, 4); ctx.fillRect(1, -5, 12, 4);
    ctx.fillStyle = body; rr(-7, -17, 14, 12, 5); ctx.fill();
    ctx.fillStyle = scarf; ctx.fillRect(-7, -18, 14, 4);
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, -24, 7, 0, 7); ctx.fill();
  } else {
    const sw = moving ? Math.sin(run) * 5 : 0, bob = moving ? Math.abs(Math.cos(run)) * 1.5 : 0;
    ctx.fillStyle = dark;
    if (o.air) { ctx.fillRect(-5, -10, 3, 8); ctx.fillRect(2, -10, 3, 6); }
    else { ctx.save(); ctx.translate(-3, -10); ctx.rotate(sw * 0.08); ctx.fillRect(-1.5, 0, 3, 10); ctx.restore(); ctx.save(); ctx.translate(3, -10); ctx.rotate(-sw * 0.08); ctx.fillRect(-1.5, 0, 3, 10); ctx.restore(); }
    ctx.translate(0, -bob);
    ctx.fillStyle = body; rr(-7, -22, 14, 13, 5); ctx.fill();
    ctx.fillStyle = scarf; ctx.fillRect(-7, -23, 14, 4);
    const fl = Math.sin((o.t || 0) * 6) * 2;
    ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-15 - (moving ? 3 : 0), -19 + fl); ctx.lineTo(-13, -16 + fl); ctx.lineTo(-5, -19); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, -29, 7, 0, 7); ctx.fill();
  }
  if (o.eyes !== false) { ctx.fillStyle = o.eye || '#2b2438'; ctx.fillRect(2.5, o.sit ? -26 : -31 - (moving ? Math.abs(Math.cos(run)) * 1.5 : 0), 2, 3); }
  if (o.lantern) drawLanternAt(o.sit ? 10 : 11, o.sit ? -10 : -14);
  ctx.restore();
}
function drawLanternAt(x, y) {
  ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 4); ctx.stroke();
  ctx.fillStyle = '#3a3040'; ctx.fillRect(x - 4, y - 5, 8, 2); ctx.fillRect(x - 4, y + 6, 8, 2);
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(x - 3, y - 3, 6, 9);
}
function drawMentor(x, y, o) {
  ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha); ctx.translate(x, y); ctx.scale(o.face || 1, 1);
  const sway = o.walk ? Math.sin(o.walk) * 1.5 : 0;
  ctx.fillStyle = '#161b2c';
  ctx.beginPath(); ctx.moveTo(-12 - sway, 0); ctx.lineTo(12 + sway, 0); ctx.lineTo(7, -36); ctx.lineTo(-7, -36); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -40, 9, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,180,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-12 - sway, 0); ctx.lineTo(-7, -36); ctx.arc(0, -40, 9, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(12 + sway, 0); ctx.stroke();
  ctx.fillStyle = '#0b0e18'; ctx.beginPath(); ctx.arc(2.5, -39, 5.5, 0, 7); ctx.fill();
  if (o.lantern !== false) {
    ctx.strokeStyle = '#161b2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -28); ctx.lineTo(13, -22); ctx.stroke();
    drawLanternAt(14, -18);
  }
  ctx.restore();
  if (o.lantern !== false) glow(x + 14 * (o.face || 1), y - 16, 70, '#ffcf7a', 0.55 * (o.alpha == null ? 1 : o.alpha));
}
function keyCap(x, y, label) {
  ctx.font = '600 13px ' + SANS;
  const lw = label ? ctx.measureText(label).width + 10 : 0;
  const w = 22 + lw, x0 = x - w / 2;
  ctx.fillStyle = 'rgba(12,14,26,0.72)'; rr(x0, y - 22, w, 22, 6); ctx.fill();
  ctx.fillStyle = '#fff6e6'; rr(x0 + 3, y - 19, 16, 16, 4); ctx.fill();
  ctx.fillStyle = '#1b1f30'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('E', x0 + 11, y - 11);
  if (label) { ctx.fillStyle = '#fff6e6'; ctx.textAlign = 'left'; ctx.fillText(label, x0 + 24, y - 11); }
}
function bubble(x, y, text) {
  ctx.font = 'italic 15px ' + SERIF;
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(255,248,236,0.92)'; rr(x - w / 2, y - 30, w, 26, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x, y + 4); ctx.fill();
  ctx.fillStyle = '#2b2438'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 17);
}

function drawEnt(e) {
  const pal = G.R.pal, x = e.x - G.cam.x, y = e.y - G.cam.y, t = G.time;
  if (x < -300 || x > VW + 300) return;
  switch (e.kind) {
    case 'exit': {
      const a = e.locked ? 0.15 : 0.5 + 0.15 * Math.sin(t * 2);
      const g = ctx.createLinearGradient(0, y - 160, 0, y);
      g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(1, 'rgba(255,230,170,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(x - 18, y - 160, 36, 160);
      ctx.fillStyle = pal.text; ctx.globalAlpha = e.locked ? 0.25 : 0.85; ctx.fillRect(x - 24, y - 3, 48, 3); ctx.globalAlpha = 1;
      if (!e.locked && Math.random() < 0.1) G.parts.push({ x: e.x + rnd(-14, 14), y: e.y, vx: 0, vy: -rnd(30, 70), life: 1.8, max: 1.8, color: pal.accent, size: 2, grav: 0 });
      break;
    }
    case 'stone': {
      const read = save.stones.includes(e.id);
      ctx.fillStyle = '#7d8296'; rr(x - 13, y - 30, 26, 30, [10, 10, 3, 3]); ctx.fill();
      ctx.fillStyle = '#9ca1b4'; rr(x - 13, y - 30, 26, 7, [10, 10, 0, 0]); ctx.fill();
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.globalAlpha = read ? 0.5 : 0.6 + 0.4 * Math.sin(t * 3);
      ctx.beginPath(); ctx.moveTo(x - 5, y - 18); ctx.lineTo(x, y - 12); ctx.lineTo(x + 5, y - 18); ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 6); ctx.stroke(); ctx.globalAlpha = 1;
      glow(x, y - 14, 40, pal.accent, read ? 0.15 : 0.3 + (e.lit > 0 ? 0.5 : 0));
      break;
    }
    case 'note': {
      const got = save.notes.includes(e.id), b = Math.sin(t * 2 + e.x) * 2;
      ctx.save(); ctx.translate(x, y - 10 + b); ctx.rotate(-0.12);
      ctx.fillStyle = got ? '#cfc6b4' : '#fff7e6'; ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = '#b9ae98'; ctx.fillRect(-5, -2, 10, 1); ctx.fillRect(-5, 1, 7, 1);
      ctx.restore();
      if (!got) glow(x, y - 10, 26, '#fff2cc', 0.3);
      break;
    }
    case 'check': {
      ctx.fillStyle = pal.edge; ctx.fillRect(x - 2, y - 30, 4, 30);
      ctx.fillStyle = e.on ? '#ffd98a' : '#5c6077'; ctx.fillRect(x - 5, y - 38, 10, 9);
      if (e.on) glow(x, y - 34, 50, '#ffcf7a', 0.6);
      break;
    }
    case 'door': case 'zdoor': case 'gdoor': {
      ctx.save(); ctx.globalAlpha = e.a == null ? 1 : e.a;
      const ladder = e.type === 'ladder';
      if (ladder) {
        ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x - 10, y - 150); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y - 150);
        for (let k = 12; k < 150; k += 18) { ctx.moveTo(x - 10, y - k); ctx.lineTo(x + 10, y - k); }
        ctx.stroke();
        neon(x, y - 166, 'SHORTCUT ↑', t);
      } else {
        const z = e.kind !== 'door';
        ctx.fillStyle = z ? '#2a2436' : '#1d1530'; ctx.fillRect(x - 15, y - 54, 30, 54);
        ctx.strokeStyle = z ? '#6b6278' : '#ffd36b'; ctx.lineWidth = 3; ctx.strokeRect(x - 15, y - 54, 30, 54);
        if (!z) { glow(x, y - 27, 70, '#ffc65a', 0.45 + 0.2 * Math.sin(t * 4)); ctx.fillStyle = '#ffe9a8'; ctx.globalAlpha *= 0.4 + 0.2 * Math.sin(t * 5); ctx.fillRect(x - 12, y - 51, 24, 48); ctx.globalAlpha = e.a == null ? 1 : e.a; }
        if (e.kind === 'zdoor') {
          ctx.fillStyle = '#8a6a48'; ctx.save(); ctx.translate(x, y - 27); ctx.rotate(0.5); ctx.fillRect(-22, -4, 44, 8); ctx.rotate(-1); ctx.fillRect(-22, -4, 44, 8); ctx.restore();
          ctx.font = '700 11px ' + SANS; ctx.fillStyle = '#b4aabd'; ctx.textAlign = 'center'; ctx.fillText('CLOSED', x, y - 62);
        } else if (e.kind === 'gdoor') {
          ctx.fillStyle = '#c9b98f'; ctx.fillRect(x - 6, y - 30, 12, 10); ctx.strokeStyle = '#c9b98f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 30, 4, Math.PI, 0); ctx.stroke();
          ctx.font = '700 11px ' + SANS; ctx.fillStyle = '#b4aabd'; ctx.textAlign = 'center'; ctx.fillText('LOCKED', x, y - 62);
        } else neon(x, y - 66, 'SHORTCUT →', t);
      }
      ctx.restore();
      break;
    }
    case 'mentor': drawMentor(x, y, { face: e.face, alpha: e.a, walk: e.walk }); break;
    case 'mentorFinal': drawMentor(x, y, { face: -1, lantern: e.lit && G.flags.lanternFly && G.flags.lanternFly.t >= 1 }); break;
    case 'rival':
      drawFigure(x, y, { face: 1, run: e.run, moving: e.state === 'run', body: '#a9c4e6', limb: '#7f9cc2', scarf: '#3d5a80', alpha: 0.85 * e.a, t });
      break;
    case 'shadow': case 'shadowStay': {
      const ox = e.kind === 'shadowStay' ? Math.sin(e.t * 3) * 1 : 0;
      drawFigure(x + ox, y, { face: e.kind === 'shadowStay' ? 1 : e.face, run: e.run, moving: e.lastSp > 0 || e.merging, body: '#17121f', limb: '#100c16', scarf: '#2a2036', eye: '#f2ecff', alpha: e.a == null ? 0.9 : e.a * 0.9, t });
      if (e.kind === 'shadowStay' && e.t < 6) bubble(x, y - 44, '...');
      if (e.say) bubble(x, y - 44, e.say.text);
      if (e.mode === 'signs' && e.sign >= 0 && !e.merging) {
        ctx.fillStyle = '#efe4cc'; ctx.font = '600 16px ' + SERIF;
        const tw = ctx.measureText(SIGNS[e.sign]).width + 24;
        ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 2, y - 72, 4, 40);
        ctx.fillStyle = '#efe4cc'; rr(x - tw / 2, y - 100, tw, 32, 4); ctx.fill();
        ctx.fillStyle = '#2b2438'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(SIGNS[e.sign], x, y - 84);
      }
      break;
    }
    case 'frag': if (!e.got) {
      ctx.font = 'italic 13px ' + SERIF;
      const tw = Math.min(150, ctx.measureText(e.text).width + 14), b = Math.sin(t * 2 + e.x) * 3;
      glow(x, y - 30 + b, 50, '#ffd98a', 0.35);
      ctx.fillStyle = 'rgba(255,244,220,0.9)'; rr(x - tw / 2, y - 42 + b, tw, 22, 5); ctx.fill();
      ctx.fillStyle = '#3a2f2a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.text.length > 20 ? e.text.slice(0, 18) + '…' : e.text, x, y - 31 + b);
    } break;
    case 'bench':
      ctx.fillStyle = '#6b5440'; ctx.fillRect(x - 24, y - 16, 48, 5); ctx.fillRect(x - 24, y - 28, 48, 4);
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 20, y - 12, 4, 12); ctx.fillRect(x + 16, y - 12, 4, 12); ctx.fillRect(x - 20, y - 28, 3, 14); ctx.fillRect(x + 17, y - 28, 3, 14);
      glow(x, y - 20, 60, '#ffcf7a', e.done ? 0.5 : 0.25);
      break;
    case 'lantern': drawLanternAt(x, y - 8); glow(x, y - 6, 60, '#ffcf7a', 0.6); break;
    case 'podium':
      ctx.fillStyle = '#b08a5a';
      ctx.fillRect(x - 48, y - 26, 32, 26); ctx.fillRect(x - 16, y - 40, 32, 40); ctx.fillRect(x + 16, y - 18, 32, 18);
      ctx.fillStyle = '#8f6c42'; ctx.fillRect(x - 16, y - 40, 32, 3); ctx.fillRect(x - 48, y - 26, 32, 3); ctx.fillRect(x + 16, y - 18, 32, 3);
      ctx.font = '700 14px ' + SANS; ctx.fillStyle = '#6b4e2e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('1', x, y - 20); ctx.fillText('2', x - 32, y - 12); ctx.fillText('3', x + 32, y - 8);
      ctx.strokeStyle = '#8f6c42'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 10, y - 37); ctx.lineTo(x - 4, y - 31); ctx.stroke();
      break;
    case 'trophy': if (!e.taken) {
      ctx.fillStyle = '#e7c35a'; ctx.beginPath(); ctx.moveTo(x - 9, y - 24); ctx.lineTo(x + 9, y - 24); ctx.lineTo(x + 5, y - 10); ctx.lineTo(x - 5, y - 10); ctx.fill();
      ctx.fillRect(x - 2, y - 10, 4, 6); ctx.fillRect(x - 6, y - 4, 12, 4);
      ctx.strokeStyle = '#e7c35a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 10, y - 19, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + 10, y - 19, 4, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      glow(x, y - 16, 30, '#ffe9a0', 0.35);
    } break;
    case 'crowd': {
      ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, 0, Math.cos(e.ang), 0, 0);
      ctx.fillStyle = '#4b4f5e'; ctx.fillRect(-170, -150, 340, 150);
      for (let row = 0; row < 5; row++) for (let k = 0; k < 15; k++) {
        ctx.fillStyle = ['#8d909c', '#6f7382', '#a3a6b0'][(row + k) % 3];
        ctx.beginPath(); ctx.arc(-158 + k * 22 + (row % 2) * 11, -132 + row * 26, 8, 0, 7); ctx.fill();
        ctx.fillRect(-165 + k * 22 + (row % 2) * 11, -124 + row * 26, 14, 10);
      }
      ctx.fillStyle = '#5b5f6e'; ctx.fillRect(-150, -6, 6, 6); ctx.fillRect(144, -6, 6, 6);
      ctx.restore();
      break;
    }
    case 'pillar':
      ctx.fillStyle = '#8b8fa6'; ctx.fillRect(x - 9, y - 40, 18, 40); ctx.fillStyle = '#a9adc2'; ctx.fillRect(x - 12, y - 44, 24, 6);
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.globalAlpha = e.used ? 1 : 0.4 + 0.3 * Math.sin(t * 3);
      ctx.beginPath(); ctx.moveTo(x - 4, y - 28); ctx.lineTo(x, y - 22); ctx.lineTo(x + 4, y - 28); ctx.moveTo(x, y - 22); ctx.lineTo(x, y - 14); ctx.stroke(); ctx.globalAlpha = 1;
      glow(x, y - 24, 46, pal.accent, e.used ? 0.6 : 0.2);
      break;
    case 'coins': {
      const a = clamp(1.2 - e.t * 0.3, 0, 1);
      ctx.globalAlpha = a;
      for (let k = 0; k < 9; k++) { ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.ellipse(x + (k % 3) * 12, y - 2 - Math.floor(k / 3) * 2, 6, e.t > 1 ? 1.2 : 3, 0, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      break;
    }
  }
}
function neon(x, y, text, t) {
  ctx.font = '800 13px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(30,18,40,0.85)'; rr(x - w / 2, y - 11, w, 22, 5); ctx.fill();
  ctx.shadowColor = '#ffc65a'; ctx.shadowBlur = 10 + 4 * Math.sin(t * 6);
  ctx.fillStyle = '#ffe08a'; ctx.fillText(text, x, y + 1); ctx.shadowBlur = 0;
}

function drawPlayer() {
  const p = G.p; if (p.hidden > 0) return;
  const flip = p.fx.flip > 0;
  const x = p.x + p.w / 2 - G.cam.x, y = (flip ? p.y : p.y + p.h) - G.cam.y;
  if (G.hasShadow && p.ground && !flip) { ctx.fillStyle = 'rgba(10,8,20,0.35)'; ctx.beginPath(); ctx.ellipse(x - 3, y, 12, 3, 0, 0, 7); ctx.fill(); }
  drawFigure(x, y, { face: p.face, run: p.run, moving: Math.abs(p.vx) > 5 && p.ground, air: !p.ground, flip, sit: p.sit > 0, lantern: G.lantern, t: G.time });
  if (G.lantern) glow(x + 11 * p.face, y - 14, 80, '#ffcf7a', 0.5);
}

function drawDarkness() {
  let a = G.darkAlpha;
  if (G.p.fx.dark > 0) a = Math.max(a, 0.97);
  if (a <= 0.01) return;
  dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, VW, VH);
  dctx.fillStyle = 'rgba(3,5,12,' + a + ')'; dctx.fillRect(0, 0, VW, VH);
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, s = 1) => { const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + s + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + s * 0.7 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = g; dctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const p = G.p, px = p.x + p.w / 2 - G.cam.x, py = p.y + p.h / 2 - G.cam.y;
  if (G.p.fx.dark > 0) hole(px, py, 40, 0.8);
  else {
    hole(px, py, G.lantern ? 190 + Math.sin(G.time * 7) * 4 : 70, 1);
    for (const e of G.ents) {
      const x = e.x - G.cam.x, y = e.y - G.cam.y;
      if (x < -200 || x > VW + 200) continue;
      if (e.kind === 'check' && e.on) hole(x, y - 34, 90, 0.8);
      if (e.kind === 'bench') hole(x, y - 20, e.done ? 140 : 80, 0.7);
      if (e.kind === 'frag' && !e.got) hole(x, y - 30, 60, 0.6);
      if (e.kind === 'exit' && !e.locked) hole(x, y - 60, 110, 0.6);
      if (e.kind === 'note') hole(x, y - 10, 34, 0.5);
      if (e.kind === 'mentorFinal') hole(x, y - 30, e.lit ? 260 * (G.flags.lanternFly ? G.flags.lanternFly.t : 1) + 60 : 60, e.lit ? 1 : 0.5);
    }
  }
  ctx.drawImage(darkC, 0, 0, VW, VH);
}

function drawLines() {
  const L = G.line; if (!L) return;
  const d = lineDur(L), a = L.t < 0.5 ? L.t / 0.5 : L.t > d + 0.5 ? Math.max(0, 1 - (L.t - d - 0.5) / 0.5) : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const stone = L.style === 'stone', note = L.style === 'note';
  ctx.font = stone ? '500 32px ' + SERIF : note ? 'italic 22px ' + SERIF : 'italic 25px ' + SERIF;
  const lines = wrap(L.text, 720), lh = stone ? 42 : 34, y0 = (stone ? 150 : 108) - (lines.length - 1) * lh / 2;
  if (note) {
    const w = Math.min(760, Math.max(...lines.map(l => ctx.measureText(l).width)) + 60);
    ctx.fillStyle = 'rgba(255,248,232,0.94)'; rr(VW / 2 - w / 2, y0 - 34, w, lines.length * lh + 36, 6); ctx.fill();
    ctx.fillStyle = '#3a2f2a';
  } else { textShadow(true); ctx.fillStyle = stone ? G.R.pal.accent : G.R.pal.text; }
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, y0 + i * lh));
  ctx.restore(); textShadow(false);
}
function drawHUD() {
  ctx.save(); ctx.textBaseline = 'top'; textShadow(true);
  const CH = G.R.CH;
  ctx.font = '600 13px ' + SANS; ctx.fillStyle = G.R.pal.text; ctx.globalAlpha = 0.65; ctx.textAlign = 'left';
  ctx.fillText(CH.extra ? CH.title : (G.R.ci ? 'Chapter ' + G.R.ci + '  ·  ' : '') + CH.title, 18, 16);
  ctx.textAlign = 'right';
  if (CH.extra) { ctx.globalAlpha = 0.9; ctx.font = '700 18px ' + SANS; ctx.fillText((G.flags.clock || 0).toFixed(1) + ' s', VW - 18, 14); }
  else if (G.R.ci >= 1) ctx.fillText('Stones ' + save.stones.length + '/6   Cards ' + save.cards.length + '/10   Esc menu', VW - 18, 16);
  ctx.globalAlpha = 1;
  
  ctx.textAlign = 'left'; ctx.font = '600 15px ' + SANS;
  G.toasts.forEach((t, i) => {
    const a = t.t < 0.3 ? t.t / 0.3 : t.t > 3.4 ? (4 - t.t) / 0.6 : 1;
    ctx.globalAlpha = a; const w = ctx.measureText(t.text).width + 24, y = VH - 48 - i * 38;
    textShadow(false); ctx.fillStyle = 'rgba(12,14,26,0.72)'; rr(18, y, w, 30, 8); ctx.fill();
    ctx.fillStyle = '#fff3dc'; ctx.textBaseline = 'middle'; ctx.fillText(t.text, 30, y + 15);
  });
  ctx.globalAlpha = 1;
  if (G.fails >= 3 && !G.inputLock) {
    ctx.font = '600 15px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = 'Stuck? Press K to skip ahead.'; const w = ctx.measureText(s).width + 28;
    textShadow(false); ctx.fillStyle = 'rgba(12,14,26,0.72)'; rr(VW / 2 - w / 2, VH - 52, w, 32, 8); ctx.fill();
    ctx.fillStyle = '#ffe1a8'; ctx.fillText(s, VW / 2, VH - 36);
  }
  const fx = G.p.fx, eff = fx.sit > 0 ? 'Jump = sit down' : fx.reverse > 0 ? 'Controls reversed' : fx.heavy > 0 ? 'Heavy pockets' : fx.flip > 0 ? 'Upside down' : '';
  if (eff) {
    const left = Math.max(fx.sit, fx.reverse, fx.heavy, fx.flip);
    ctx.font = '700 14px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = eff + '  ' + left.toFixed(0) + 's'; const w = ctx.measureText(s).width + 26;
    textShadow(false); ctx.fillStyle = 'rgba(60,30,60,0.8)'; rr(VW / 2 - w / 2, 46, w, 28, 14); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillText(s, VW / 2, 60);
  }
  ctx.restore(); textShadow(false);
}

function drawPlay() {
  const R = G.R, pal = R.pal;
  drawSky(pal, G.cam.x, G.cam.y, G.time, R.CH.bg);
  for (const e of G.ents) if (e.back) drawEnt(e);
  drawTiles();
  for (const m of G.movers) {
    const x = m.x - G.cam.x, y = m.y - G.cam.y;
    ctx.fillStyle = pal.top; rr(x, y, m.w, 10, 4); ctx.fill();
    ctx.fillStyle = pal.edge; ctx.fillRect(x + 8, y + 10, m.w - 16, 3);
  }
  for (const e of G.ents) if (!e.back && e.kind !== 'mentor' && e.kind !== 'mentorFinal') drawEnt(e);
  drawPlayer();
  for (const e of G.ents) if (e.kind === 'mentor' || e.kind === 'mentorFinal') drawEnt(e);
  const f = G.flags.lanternFly;
  if (f && f.t < 1) {
    const lx = lerp(f.from.x, f.to.x, f.t) - G.cam.x, ly = lerp(f.from.y, f.to.y, f.t) - G.cam.y - Math.sin(f.t * Math.PI) * 30;
    drawLanternAt(lx, ly); glow(lx, ly, 80, '#ffcf7a', 0.6);
  }
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1), x = p.x - G.cam.x, y = p.y - G.cam.y;
    ctx.globalAlpha = a;
    if (p.streak) { ctx.fillStyle = p.color; ctx.fillRect(x, y, 26, 1.5); }
    else if (p.plank) { ctx.fillStyle = p.color; ctx.fillRect(x - 15, y - 5, 30, 10); }
    else { ctx.fillStyle = p.color; ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size); }
  }
  ctx.globalAlpha = 1;
  drawDarkness();
  if (G.focus && scene === 'play') {
    const e = G.focus, lbl = INTERACT[e.kind].label(e);
    const top = e.kind === 'door' ? (e.type === 'ladder' ? 186 : 86) : e.kind === 'shadow' && e.sign >= 0 ? 108 : e.kind === 'podium' ? 52 : e.kind === 'trophy' ? 34 : 58;
    keyCap(e.x - G.cam.x, e.y - G.cam.y - top, lbl);
  }
  drawLines();
  drawHUD();
}


function showCard(o) { card = Object.assign({ t: 0, stagger: 2.2, hold: 1.5, prompt: 'Press Enter to continue' }, o); scene = 'card'; }
function updateCard(dt) {
  card.t += dt;
  const n = card.lines ? card.lines.length : 0;
  const allAt = n ? (n - 1) * card.stagger + 1 : 0;
  if (card.auto) { if (card.t > card.auto || (card.t > 0.6 && (IN.ok() || mouse.click))) { const cb = card.cb; card = null; cb && cb(); } return; }
  if (card.t < allAt + card.hold) { if (card.t > 0.5 && (IN.ok() || mouse.click)) card.t = allAt + card.hold; return; }
  if (IN.ok() || mouse.click) { const cb = card.cb; card = null; cb && cb(); }
  else if (IN.back() && card.prompt.includes('Esc')) { card = null; toTitle(); }
}
function drawCard() {
  ctx.fillStyle = '#0b0f1c'; ctx.fillRect(0, 0, VW, VH);
  glow(VW / 2, VH * 0.55, 420, '#2a2f4a', 0.6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (card.auto) {
    const a = Math.min(1, card.t / 0.8, Math.max(0, (card.auto - card.t) / 0.6));
    ctx.globalAlpha = a;
    if (card.title) { ctx.font = '600 15px ' + SANS; ctx.fillStyle = '#c9b98f'; ctx.fillText(card.title.toUpperCase().split('').join(' '), VW / 2, VH / 2 - 34); }
    ctx.font = '500 44px ' + SERIF; ctx.fillStyle = '#f6ecd6'; ctx.fillText(card.sub, VW / 2, VH / 2 + 12);
    ctx.globalAlpha = 1; return;
  }
  const n = card.lines.length;
  ctx.font = 'italic 27px ' + SERIF;
  const blocks = card.lines.map(l => wrap(l, 760));
  const lh = 40, total = blocks.reduce((s, b) => s + b.length, 0) * lh + (n - 1) * 10;
  let y = VH / 2 - total / 2 + lh / 2 - 20;
  blocks.forEach((b, i) => {
    const a = clamp((card.t - i * card.stagger) / 1.2, 0, 1);
    ctx.globalAlpha = a;
    const sig = card.sig && i === n - 1;
    ctx.font = sig ? 'italic 24px ' + SERIF : 'italic 27px ' + SERIF;
    ctx.fillStyle = sig ? '#ffd38a' : '#f6ecd6';
    b.forEach(l => { ctx.fillText(sig ? '- ' + l : l, VW / 2, y); y += lh; });
    y += 10;
  });
  const allAt = (n - 1) * card.stagger + 1;
  if (card.t > allAt + card.hold) {
    ctx.globalAlpha = clamp((card.t - allAt - card.hold) / 0.8, 0, 0.7) * (0.75 + 0.25 * Math.sin(card.t * 2.5));
    ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#c9c3d6'; ctx.fillText(card.prompt, VW / 2, VH - 50);
  }
  ctx.globalAlpha = 1;
}


function drawCompose() {
  const c = compose;
  ctx.fillStyle = 'rgba(4,6,14,0.72)'; ctx.fillRect(0, 0, VW, VH);
  const px = 110, py = 90, pw = VW - 220, ph = 360;
  ctx.fillStyle = '#141a2c'; rr(px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,211,138,0.35)'; ctx.lineWidth = 1.5; rr(px, py, pw, ph, 14); ctx.stroke();
  glow(VW / 2, py + 40, 200, '#ffcf7a', 0.12);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 13px ' + SANS; ctx.fillStyle = '#c9b98f'; ctx.fillText('A   R E S T   S T O P', VW / 2, py + 34);
  ctx.font = 'italic 22px ' + SERIF; ctx.fillStyle = '#f6ecd6'; ctx.fillText('Put it together. Only the honest words fit.', VW / 2, py + 66);
  
  const parts = c.placed.map(t => t.text);
  for (let i = c.placed.length; i < c.need; i++) parts.push('________');
  ctx.font = (c.done ? '500 ' : 'italic ') + '26px ' + SERIF; ctx.fillStyle = c.done ? '#ffd38a' : '#f6ecd6';
  const sl = wrap(parts.join(' '), pw - 80);
  sl.forEach((l, i) => ctx.fillText(l, VW / 2, py + 130 + i * 34 - (sl.length - 1) * 17));
  if (c.done) glow(VW / 2, py + 130, 260, '#ffcf7a', 0.25 * Math.min(1, c.doneT));
  
  c.rects = [];
  if (!c.done) {
    ctx.font = 'italic 18px ' + SERIF;
    const vis = c.tiles.filter(t => !t.gone);
    const widths = vis.map(t => ctx.measureText(t.text).width + 40);
    const rows = [[]]; let rowW = 0;
    vis.forEach((t, i) => { if (rowW + widths[i] > pw - 60 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; } rows[rows.length - 1].push(i); rowW += widths[i] + 14; });
    rows.forEach((row, ri) => {
      const tw = row.reduce((s, i) => s + widths[i] + 14, -14);
      let x = VW / 2 - tw / 2;
      row.forEach(i => {
        const t = vis[i], w = widths[i], y = py + 220 + ri * 56;
        const sh = t.shake > 0 ? Math.sin(t.shake * 60) * 5 : 0;
        const hover = mouse.x > x && mouse.x < x + w && mouse.y > y && mouse.y < y + 42;
        ctx.save();
        if (t.crumble > 0) { ctx.globalAlpha = t.crumble / 0.7; ctx.translate(0, (0.7 - t.crumble) * 40); }
        ctx.fillStyle = hover ? '#fff4dc' : '#efe4cc'; rr(x + sh, y, w, 42, 8); ctx.fill();
        ctx.fillStyle = '#2b2438'; ctx.fillText(t.text, x + w / 2 + sh, y + 21);
        ctx.font = '700 11px ' + SANS; ctx.fillStyle = '#8a7f9a'; ctx.fillText(String(i + 1), x + 12 + sh, y + 10);
        ctx.font = 'italic 18px ' + SERIF;
        ctx.restore();
        c.rects.push({ x, y, w, h: 42, tile: t });
        x += w + 14;
      });
    });
    if (c.msgT > 0) { ctx.globalAlpha = Math.min(1, c.msgT); ctx.font = 'italic 17px ' + SERIF; ctx.fillStyle = '#e7a6a1'; ctx.fillText(c.msg, VW / 2, py + ph - 26); ctx.globalAlpha = 1; }
    else { ctx.font = '600 12px ' + SANS; ctx.fillStyle = '#8a8fa6'; ctx.fillText('Click a piece, or press its number.  Esc to stand up.', VW / 2, py + ph - 26); }
  }
}


function runMenu(items, x, y, opts = {}) {
  if (!menu || menu.key !== opts.key) menu = { key: opts.key, sel: items.findIndex(i => !i.disabled) };
  const lh = opts.lh || 44;
  if (IN.down()) { do { menu.sel = (menu.sel + 1) % items.length; } while (items[menu.sel].disabled); Sound.play('tick'); }
  if (IN.up()) { do { menu.sel = (menu.sel - 1 + items.length) % items.length; } while (items[menu.sel].disabled); Sound.play('tick'); }
  let chosen = -1;
  ctx.textBaseline = 'middle'; ctx.textAlign = opts.align || 'left';
  items.forEach((it, i) => {
    const iy = y + i * lh;
    ctx.font = (opts.font || '500 24px ') + SERIF;
    const w = Math.max(220, ctx.measureText(it.label).width + 40);
    const left = opts.align === 'center' ? x - w / 2 : x - 20;
    if (!it.disabled && mouse.x > left && mouse.x < left + w && mouse.y > iy - lh / 2 && mouse.y < iy + lh / 2) {
      if (menu.sel !== i) menu.sel = i;
      if (mouse.click) chosen = i;
    }
    const s = i === menu.sel;
    ctx.globalAlpha = it.disabled ? 0.3 : s ? 1 : 0.62;
    ctx.fillStyle = s ? '#ffd38a' : '#f6ecd6';
    ctx.fillText(it.label, x, iy);
    if (s) { ctx.fillRect(opts.align === 'center' ? x - ctx.measureText(it.label).width / 2 - 22 : x - 22, iy - 1, 10, 2); }
    if (it.note) { ctx.font = '600 13px ' + SANS; ctx.fillStyle = '#a9a3b8'; ctx.globalAlpha = it.disabled ? 0.3 : 0.7; ctx.fillText(it.note, opts.align === 'center' ? x : x + ctx.measureText(it.label).width + 260, iy + 1); }
  });
  ctx.globalAlpha = 1;
  if (IN.ok() && menu.sel >= 0 && !items[menu.sel].disabled) chosen = menu.sel;
  if (chosen >= 0) { Sound.play('tick'); const it = items[chosen]; menu = null; it.action(); }
}

function drawTitleBG(t) {
  drawSky(PAL.dusk, t * 18, 0, t, null);
  ctx.fillStyle = PAL.dusk.ground; ctx.fillRect(0, 430, VW, 110);
  ctx.fillStyle = PAL.dusk.top; ctx.fillRect(0, 430, VW, 5);
  ctx.fillStyle = 'rgba(248,238,220,0.8)'; ctx.fillRect(640, 427, 3, 8);
  ctx.fillRect(626, 433, 30, 2);
  drawFigure(612, 430, { face: 1, t });
  drawMentor(560, 430, { face: 1 });
}
function updateTitle(dt) {
  titleT += dt;
  drawTitleBG(titleT);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; textShadow(true);
  ctx.font = '500 76px ' + SERIF; ctx.fillStyle = '#f8eedc'; ctx.fillText('Shortcut', 90, 150);
  ctx.font = 'italic 21px ' + SERIF; ctx.fillStyle = '#ffd9a8'; ctx.fillText('a small game for Euan', 94, 186);
  textShadow(false);
  if (!Sound.started) {
    ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#f6ecd6'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(titleT * 2.5);
    ctx.fillText('Sound starts after your first key press or click. Headphones help.', 94, 220); ctx.globalAlpha = 1;
  }
  const items = [];
  if (save.started) items.push({ label: 'Continue', note: 'Chapter ' + save.chapter + ': ' + CHAPTERS[save.chapter].title, action: () => fadeTo(() => startChapter(save.chapter, save.room)) });
  items.push({ label: save.started ? 'Start from the beginning' : 'Begin', action: () => fadeTo(() => startChapter(0, 0)) });
  items.push({ label: 'Chapters', disabled: !save.started, action: () => { returnTo = 'title'; scene = 'chapters'; } });
  items.push({ label: 'Gallery', action: () => { returnTo = 'title'; scene = 'gallery'; } });
  if (save.finished) items.push({ label: 'Practice Yard', note: save.best != null ? 'best ' + save.best.toFixed(1) + ' s' : '', action: () => fadeTo(() => startChapter(9, 0)) });
  items.push({ label: 'Sound: ' + (Sound.enabled ? 'on' : 'off'), action: toggleSound });
  ctx.font = '500 24px ' + SERIF;
  runMenu(items, 112, 272, { key: 'title' + items.length });
  ctx.textAlign = 'right'; ctx.font = '600 12px ' + SANS; ctx.fillStyle = '#d8cfe0'; ctx.globalAlpha = 0.65;
  ctx.fillText('Arrows or A/D to walk · Space to jump · E to interact · Esc for the menu', VW - 20, VH - 18); ctx.globalAlpha = 1;
}
function toggleSound() { save.sound = !Sound.enabled; Sound.setEnabled(save.sound); persist(); }

function updateChapters() {
  ctx.fillStyle = '#0d1120'; ctx.fillRect(0, 0, VW, VH); glow(VW * 0.3, VH * 0.4, 500, '#24304f', 0.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '500 40px ' + SERIF; ctx.fillStyle = '#f6ecd6'; ctx.fillText('Chapters', 90, 92);
  const items = CHAPTERS.slice(0, 9).map((c, i) => ({ label: (i === 0 ? 'Prologue' : i) + '   ' + (i <= save.unlocked ? c.title : '· · ·'), disabled: i > save.unlocked, action: () => fadeTo(() => startChapter(i, 0)) }));
  items.push({ label: 'Back', action: () => { scene = returnTo === 'pause' ? 'pause' : 'title'; } });
  runMenu(items, 112, 140, { key: 'chapters', lh: 38, font: '500 22px ' });
  if (IN.back()) { menu = null; scene = returnTo === 'pause' ? 'pause' : 'title'; }
}

function updateGallery() {
  ctx.fillStyle = '#0d1120'; ctx.fillRect(0, 0, VW, VH); glow(VW * 0.7, VH * 0.3, 500, '#2e2452', 0.4);
  const tabs = ['Lesson stones', 'Backfire cards', 'Hidden notes'];
  if (IN.right() && !G_tabLock) { galleryTab = (galleryTab + 1) % 3; G_tabLock = true; }
  else if (IN.left() && !G_tabLock) { galleryTab = (galleryTab + 2) % 3; G_tabLock = true; }
  if (!IN.left() && !IN.right()) G_tabLock = false;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '500 36px ' + SERIF; ctx.fillStyle = '#f6ecd6'; ctx.fillText('Gallery', 70, 60);
  let tx = 70;
  tabs.forEach((t, i) => {
    ctx.font = '700 14px ' + SANS; const w = ctx.measureText(t).width + 28;
    const hover = mouse.x > tx && mouse.x < tx + w && mouse.y > 92 && mouse.y < 124;
    if (hover && mouse.click) galleryTab = i;
    ctx.fillStyle = i === galleryTab ? '#ffd38a' : hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'; rr(tx, 92, w, 32, 16); ctx.fill();
    ctx.fillStyle = i === galleryTab ? '#1b1f30' : '#e8e2f0'; ctx.fillText(t, tx + 14, 108); tx += w + 10;
  });
  ctx.font = '600 12px ' + SANS; ctx.fillStyle = '#8a8fa6'; ctx.textAlign = 'right'; ctx.fillText('← → to switch tabs · Esc to go back', VW - 40, 108);
  ctx.textAlign = 'left';
  if (galleryTab === 0) {
    STONE_ORDER.forEach((id, i) => {
      const got = save.stones.includes(id), y = 168 + i * 56;
      ctx.fillStyle = got ? '#7d8296' : '#2a2f44'; rr(70, y - 18, 28, 34, [10, 10, 3, 3]); ctx.fill();
      ctx.font = got ? 'italic 22px ' + SERIF : '600 14px ' + SANS; ctx.fillStyle = got ? '#f6ecd6' : '#5f6580';
      ctx.fillText(got ? STONES[id] : 'Not found yet (Training Grounds, part ' + (i + 1) + ')', 120, y);
    });
  } else if (galleryTab === 1) {
    CARD_ORDER.forEach((k, i) => {
      const got = save.cards.includes(k), col = i % 2, row = Math.floor(i / 2), x = 70 + col * 420, y = 150 + row * 74;
      ctx.fillStyle = got ? '#241c38' : '#161a2a'; rr(x, y, 400, 62, 10); ctx.fill();
      ctx.strokeStyle = got ? 'rgba(255,211,107,0.5)' : 'rgba(255,255,255,0.06)'; rr(x, y, 400, 62, 10); ctx.stroke();
      ctx.font = '700 15px ' + SANS; ctx.fillStyle = got ? '#ffd36b' : '#4d5370'; ctx.fillText(got ? CARDS[k].name : '?  ?  ?', x + 16, y + 20);
      ctx.font = 'italic 15px ' + SERIF; ctx.fillStyle = got ? '#e8e2f0' : '#3f4560'; ctx.fillText(got ? CARDS[k].text : 'Some shortcut, somewhere.', x + 16, y + 44);
    });
  } else {
    const all = allNotes();
    ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#a9a3b8'; ctx.fillText(save.notes.length + ' of ' + all.length + ' found. They sit in quiet corners.', 70, 156);
    let y = 196;
    all.forEach(n => {
      const got = save.notes.includes(n.id);
      ctx.font = got ? 'italic 17px ' + SERIF : '600 13px ' + SANS; ctx.fillStyle = got ? '#f6ecd6' : '#4d5370';
      ctx.fillText(got ? n.text : '· · ·', 70, y); y += 31;
    });
  }
  if (IN.back() || (mouse.click && mouse.y > VH - 50)) { scene = returnTo === 'pause' ? 'pause' : 'title'; }
  ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#c9c3d6'; ctx.textAlign = 'center'; ctx.fillText('Back', VW / 2, VH - 26);
}
let G_tabLock = false;
function allNotes() {
  const out = [];
  for (const ch of CHAPTERS) for (const id of ch.rooms) { const d = ROOMS[id]; if (d.notes) d.notes.forEach((text, i) => out.push({ id: id + '#' + i, text })); }
  return out;
}

function openPause() { scene = 'pause'; menu = null; }
function updatePause() {
  drawPlay();
  ctx.fillStyle = 'rgba(6,8,16,0.72)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '500 40px ' + SERIF; ctx.fillStyle = '#f6ecd6'; ctx.fillText('Paused', 90, 120);
  const items = [
    { label: 'Resume', action: () => { scene = 'play'; } },
    { label: 'Restart this part', action: () => fadeTo(() => { loadRoom(G.R.ci, G.R.ri); scene = 'play'; }) },
    { label: 'Chapters', disabled: G.R.CH.extra, action: () => { returnTo = 'pause'; scene = 'chapters'; } },
    { label: 'Gallery', action: () => { returnTo = 'pause'; scene = 'gallery'; } },
    { label: 'Sound: ' + (Sound.enabled ? 'on' : 'off'), action: toggleSound },
    { label: 'Title screen', action: toTitle }
  ];
  runMenu(items, 112, 180, { key: 'pause' + Sound.enabled });
  ctx.font = '600 13px ' + SANS; ctx.fillStyle = '#a9a3b8'; ctx.textAlign = 'left';
  ctx.fillText('Progress saves by itself at the start of every part.', 92, VH - 40);
  if (IN.back()) { scene = 'play'; menu = null; }
}


let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  Sound.update();
  try {
    if (fade.dir === 1) { fade.a = Math.min(1, fade.a + dt / 0.45); if (fade.a >= 1) { fade.dir = -1; const cb = fade.cb; fade.cb = null; cb && cb(); } }
    else if (fade.dir === -1) { fade.a = Math.max(0, fade.a - dt / 0.45); if (fade.a <= 0) fade.dir = 0; }
    const busy = fade.dir === 1;
    switch (scene) {
      case 'boot': scene = 'title'; break;
      case 'title': if (busy) drawTitleBG(titleT); else updateTitle(dt); break;
      case 'chapters': updateChapters(); break;
      case 'gallery': updateGallery(); break;
      case 'card': if (!busy) updateCard(dt); if (card) drawCard(); else if (scene === 'play' && G) drawPlay(); break;
      case 'play': if (!busy) updatePlay(dt); else updateParts(dt); drawPlay(); break;
      case 'compose': updateCompose(dt); drawPlay(); if (compose) drawCompose(); break;
      case 'pause': updatePause(); break;
    }
  } catch (err) {}
  if (fade.a > 0) { ctx.fillStyle = 'rgba(8,10,20,' + fade.a + ')'; ctx.fillRect(0, 0, VW, VH); }
  for (const k in pressed) delete pressed[k];
  mouse.click = false;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


window.__shortcut = {
  goto(ci, ri) { startChapter(ci, ri); scene = 'play'; card = null; },
  get state() { return { scene, room: G && G.R.id, x: G && G.p.x, y: G && G.p.y, ground: G && G.p.ground }; },
  get G() { return G; },
  ROOMS, CHAPTERS, normRoom, parseTerrain
};
