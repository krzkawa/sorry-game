
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
  const set = (c, k, code) => { const r = ROWS - 1 - k; if (c < 0 || c >= w || r < 0 || r >= ROWS) return; tiles[r.  w + c] = code; return r * w + c; };
  N.hs.forEach((h, c) => { for (let k = 0; k < h; k++) set(c, k, 1); });
  if (N.ceil) for (let c = 0; c < w; c++) for (let k = N.ceil; k < ROWS; k++) set(c, k, 1);
  const crumbles = [], groups = {};
  N.plats.forEach(([x, s, len, ty = '-'], pi) => {
    for (let i = 0; i < len; i++) {
      let code = TILE_CODE[ty];
      if (code == null) code = 5;
      const idx = set(x + i, s - 1, code);
      if (idx == null) continue;
      if (code === 3).  const m 