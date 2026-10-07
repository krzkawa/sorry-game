



(() => {
  'use strict';
  delete window.__shortcut;

  const keyOf = pal => Object.keys(PAL).find(k => PAL[k] === pal) || 'dusk';

  
  const baseLoadRoom = loadRoom;
  loadRoom = function (ci, ri) {
    baseLoadRoom(ci, ri);
    const def = G.R.def;
    (def.extras || []).forEach(x => {
      const ex = (x.col + 0.5) * T, ey = surfaceY(ex, 0);
      G.ents.push(Object.assign({}, x, { x: ex, y: ey == null ? feetY(2) : ey, done: false }));
    });
    if (def.lockExit) { const ex = G.ents.find(e => e.kind === 'exit'); if (ex) ex.locked = true; }
    if (def.lantern) G.lantern = true;
    G.amb = null; G.ambCam = null; G.stepPhase = 0;
    const k = keyOf(G.R.pal);
    Sound.setWind(false);
    Sound.setAmbience(k === 'night' || k === 'night2' ? 'crickets' : k === 'dawn' || k === 'warm' ? 'birds' : 'none');
  };

  
  const baseUpdatePlayer = updatePlayer;
  updatePlayer = function (dt) {
    const p = G.p, fx = p.fx, speed = G.R.speed, wasGround = p.ground;
    if ((fx.slow || 0) > 0) G.R.speed = speed * 0.4;
    if ((fx.bounce || 0) > 0 && p.ground && !G.inputLock) pressed.Space = true;
    baseUpdatePlayer(dt);
    G.R.speed = speed;
    const q = G.p;
    if (q !== p) return;
    if (q.ground && !wasGround && !(q.fx.flip > 0)) burst(q.x + q.w / 2, q.y + q.h, 6, 'rgba(240,230,210,0.55)', 50, 0.45, 2, 60);
    if (q.ground && Math.abs(q.vx) > 20) {
      const ph = Math.floor(q.run / Math.PI);
      if (ph !== G.stepPhase) { G.stepPhase = ph; Sound.play('step'); }
    }
  };

  const baseDoor = INTERACT.door.use;
  INTERACT.door.use = function (e) {
    baseDoor(e);
    const fx = G.p.fx;
    if (e.type === 'slow') { fx.slow = 7; Sound.play('slowdown'); }
    if (e.type === 'bounce') { fx.bounce = 6; Sound.play('boing'); }
  };

  
  INTERACT.seat = {
    label: e => e.done ? '' : (e.label || 'Sit for a bit'),
    ok: e => !e.done,
    use(e) {
      e.done = true; G.inputLock = true;
      const p = G.p;
      if (e.sit) { p.x = e.x - p.w / 2; p.vx = 0; p.sit = 999; p.face = 1; }
      const lines = (e.text || []).slice();
      const next = () => {
        if (lines.length) { say(lines.shift(), { cb: next }); return; }
        if (e.sit) G.p.sit = 0;
        G.inputLock = false;
        if (e.unlock) { const ex = G.ents.find(x => x.kind === 'exit'); if (ex) ex.locked = false; }
      };
      Sound.play('page'); next();
    }
  };
  INTERACT.board = {
    label: e => e.done ? '' : 'Look',
    ok: e => !e.done,
    use(e) {
      e.done = true;
      say(`My name, at the top.`);
      say(`It looked like someone else's name.`, { cb: () => { e.star = true; Sound.play('tick'); say(`It needed an asterisk.`); } });
    }
  };

  function drawSeat(e, x, y) {
    if (e.style === 'stand') {
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = '#4b4f5e'; rr(x + i * 26 - 10, y - 26, 20, 14, 3); ctx.fill();
        ctx.fillStyle = '#3a3d48'; ctx.fillRect(x + i * 26 - 10, y - 14, 20, 4); ctx.fillRect(x + i * 26 - 2, y - 10, 4, 10);
      }
    } else {
      ctx.fillStyle = '#6b5440'; ctx.fillRect(x - 24, y - 16, 48, 5); ctx.fillRect(x - 24, y - 28, 48, 4);
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 20, y - 12, 4, 12); ctx.fillRect(x + 16, y - 12, 4, 12); ctx.fillRect(x - 20, y - 28, 3, 14); ctx.fillRect(x + 17, y - 28, 3, 14);
    }
    if (!e.done) glow(x, y - 20, 50, '#ffcf7a', 0.16 + 0.06 * Math.sin(G.time * 2));
  }
  function drawBoard(e, x, y) {
    const w = 176, h = 96, top = y - 196;
    ctx.fillStyle = '#2d3039'; ctx.fillRect(x - 62, top + h, 6, y - top - h); ctx.fillRect(x + 56, top + h, 6, y - top - h);
    ctx.fillStyle = '#1b1d24'; rr(x - w / 2, top, w, h, 6); ctx.fill();
    ctx.strokeStyle = '#4a4e5c'; ctx.lineWidth = 2; rr(x - w / 2, top, w, h, 6); ctx.stroke();
    ctx.font = '700 14px ' + SANS; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    [['1', 'krzys' + (e.star ? '  *' : '')], ['2', '· · ·'], ['3', '· · ·']].forEach(([n, name], i) => {
      ctx.fillStyle = i === 0 ? '#e9d79a' : '#6f7382';
      ctx.fillText(n, x - w / 2 + 18, top + 24 + i * 24); ctx.fillText(name, x - w / 2 + 44, top + 24 + i * 24);
    });
    glow(x, top + h / 2, 90, '#e9d79a', e.done ? 0.06 : 0.14);
  }
  const baseDrawEnt = drawEnt;
  drawEnt = function (e) {
    if (e.kind === 'seat' || e.kind === 'board') {
      const x = e.x - G.cam.x, y = e.y - G.cam.y;
      if (x < -300 || x > VW + 300) return;
      ctx.save();
      if (e.kind === 'seat') drawSeat(e, x, y); else drawBoard(e, x, y);
      ctx.restore();
      return;
    }
    baseDrawEnt(e);
  };

  
  const hillY = (wx, camy) => 400 - camy * 0.35 + Math.sin(wx * 0.006 + 4.1) * 30 + Math.sin(wx * 0.006 * 2.7 + 8.2) * 12;
  function drawTrees(pal, camx, camy) {
    const par = 0.35, sp = 140, n0 = Math.floor(camx * par / sp) - 1, n1 = n0 + Math.ceil(VW / sp) + 2;
    ctx.fillStyle = pal.hill2;
    for (let n = n0; n <= n1; n++) {
      if (hash(n * 3.1) < 0.45) continue;
      const wx = n * sp + hash(n + 11) * 80, sx = wx - camx * par, hy = hillY(wx, camy) + 4, h = 34 + hash(n + 5) * 46;
      ctx.fillRect(sx - 2, hy - h * 0.5, 4, h * 0.5 + 6);
      ctx.beginPath();
      if (hash(n + 21) > 0.5) ctx.ellipse(sx, hy - h * 0.62, 10 + h * 0.12, h * 0.42, 0, 0, 7);
      else { ctx.arc(sx, hy - h * 0.62, h * 0.3, 0, 7); ctx.arc(sx - h * 0.2, hy - h * 0.45, h * 0.22, 0, 7); ctx.arc(sx + h * 0.2, hy - h * 0.45, h * 0.22, 0, 7); }
      ctx.fill();
    }
  }
  function drawSigns(pal, camx, camy, t) {
    const par = 0.35, sp = 380, n0 = Math.floor(camx * par / sp) - 1, n1 = n0 + Math.ceil(VW / sp) + 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 14px ' + SANS;
    for (let n = n0; n <= n1; n++) {
      if (hash(n * 1.7) < 0.4) continue;
      const wx = n * sp + hash(n + 2) * 160, sx = wx - camx * par, hy = hillY(wx, camy) + 4;
      ctx.globalAlpha = 1; ctx.fillStyle = pal.hill2; ctx.fillRect(sx - 2, hy - 72, 4, 76); rr(sx - 34, hy - 100, 68, 30, 4); ctx.fill();
      ctx.globalAlpha = Math.sin(t * 3 + n * 2.3) > -0.6 ? 0.5 : 0.12; ctx.fillStyle = pal.accent;
      ctx.fillText(hash(n + 9) > 0.5 ? 'FAST →' : 'EASY →', sx, hy - 84);
    }
    ctx.globalAlpha = 1;
  }
  const baseDrawSky = drawSky;
  drawSky = function (pal, camx, camy, t, bg) {
    baseDrawSky(pal, camx, camy, t, bg);
    if (bg === 'stadium') return;
    const k = keyOf(pal);
    ctx.save();
    if (k === 'warm' || k === 'dawn' || k === 'dusk' || k === 'chase') drawTrees(pal, camx, camy);
    else if (k === 'playful') drawSigns(pal, camx, camy, t);
    ctx.restore();
  };

  
  const baseDrawTiles = drawTiles;
  drawTiles = function () {
    baseDrawTiles();
    const R = G.R, pal = R.pal;
    if (keyOf(pal) === 'hollow') return;
    const cx = G.cam.x, cy = G.cam.y, c0 = Math.max(0, Math.floor(cx / T)), c1 = Math.min(R.w - 1, Math.floor((cx + VW) / T));
    ctx.save(); ctx.strokeStyle = pal.top; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75; ctx.beginPath();
    for (let c = c0; c <= c1; c++) {
      for (let r = 1; r < ROWS; r++) {
        if (R.tiles[r * R.w + c] !== 1 || isSolid(c, r - 1)) continue;
        const x = c * T - cx, y = r * T - cy;
        for (let i = 0; i < 3; i++) {
          if (hash(c * 13 + i * 7 + r) < 0.4) continue;
          const bx = x + 4 + hash(c * 5 + i) * 24, h = 3 + hash(c + i * 3) * 4, sw = Math.sin(G.time * 1.6 + c * 0.7 + i) * 1.5;
          ctx.moveTo(bx, y + 1); ctx.lineTo(bx + sw, y - h);
        }
        break;
      }
    }
    ctx.stroke(); ctx.restore();
  };

  
  const AMB = {
    dusk: { n: 14, kind: 'fly' }, night: { n: 12, kind: 'fly' }, night2: { n: 10, kind: 'fly' },
    warm: { n: 16, kind: 'petal' }, chase: { n: 12, kind: 'leaf' }, playful: { n: 16, kind: 'spark' },
    hollow: { n: 16, kind: 'confetti' }, dawn: { n: 20, kind: 'mote' }, focused: { n: 8, kind: 'mote' }
  };
  const FALLING = { petal: 1, leaf: 1, confetti: 1 };
  const newAmb = (kind, top) => ({ kind, x: rnd(0, VW), y: top ? (FALLING[kind] ? -10 : VH + 10) : rnd(40, VH - 40), ph: rnd(0, 7), r: rnd(0, 7), s: rnd(0.6, 1.2) });
  function stepAmbient(list, kind, n, dt, dc) {
    while (list.length < n) list.push(newAmb(kind, false));
    for (const a of list) {
      a.ph += dt; a.x -= dc * 0.85;
      if (a.kind === 'fly') { a.x += Math.sin(a.ph * 0.7 * a.s) * 14 * dt; a.y += Math.cos(a.ph * 0.9) * 10 * dt; }
      else if (a.kind === 'petal' || a.kind === 'leaf') { a.x += (18 + Math.sin(a.ph) * 14) * dt * a.s; a.y += 22 * dt * a.s; a.r += dt * 1.5; }
      else if (a.kind === 'confetti') { a.x += Math.sin(a.ph * 1.3) * 10 * dt; a.y += 15 * dt * a.s; a.r += dt * 2; }
      else { a.x += Math.sin(a.ph * 0.4) * 6 * dt; a.y -= 6 * dt * a.s; }
      if (a.x < -30) a.x += VW + 60; else if (a.x > VW + 30) a.x -= VW + 60;
      if (a.y > VH + 20 || a.y < -30 || (a.kind === 'fly' && (a.y < 30 || a.y > VH - 30))) Object.assign(a, newAmb(a.kind, a.kind !== 'fly'));
    }
  }
  function drawAmbient(list, accent) {
    ctx.save();
    for (const a of list) {
      if (a.kind === 'fly') {
        const b = 0.5 + 0.5 * Math.sin(a.ph * 2.2 * a.s);
        glow(a.x, a.y, 16, '#ffe9a0', 0.5 * b);
        ctx.globalAlpha = 0.4 + 0.6 * b; ctx.fillStyle = '#fff4c8'; ctx.fillRect(a.x - 1, a.y - 1, 2, 2);
      } else if (FALLING[a.kind]) {
        ctx.globalAlpha = a.kind === 'confetti' ? 0.5 : 0.6;
        ctx.fillStyle = a.kind === 'petal' ? '#f7c6c0' : a.kind === 'leaf' ? '#c98a6a' : ['#8d909c', '#a3a6b0', '#c9b98f'][Math.floor(a.s * 10) % 3];
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r); ctx.fillRect(-3, -1.5 * (0.5 + 0.5 * Math.abs(Math.sin(a.r))), 6, 3); ctx.restore();
      } else if (a.kind === 'spark') {
        ctx.globalAlpha = Math.max(0, Math.sin(a.ph * 3 * a.s)) * 0.8; ctx.fillStyle = accent;
        ctx.fillRect(a.x - 3, a.y - 0.5, 6, 1); ctx.fillRect(a.x - 0.5, a.y - 3, 1, 6);
      } else { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(a.ph); ctx.fillStyle = '#fff3d6'; ctx.fillRect(a.x, a.y, 2, 2); }
    }
    ctx.restore();
  }
  let vig = null;
  function vignette() {
    if (!vig) {
      vig = document.createElement('canvas'); vig.width = VW; vig.height = VH;
      const v = vig.getContext('2d'), g = v.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 1.05);
      g.addColorStop(0, 'rgba(6,8,18,0)'); g.addColorStop(1, 'rgba(6,8,18,0.42)'); v.fillStyle = g; v.fillRect(0, 0, VW, VH);
    }
    ctx.drawImage(vig, 0, 0, VW, VH);
  }
  
  const baseDrawDarkness = drawDarkness;
  drawDarkness = function () {
    baseDrawDarkness();
    if (G.amb) drawAmbient(G.amb, G.R.pal.accent);
    vignette();
  };

  const baseUpdatePlay = updatePlay;
  updatePlay = function (dt) {
    baseUpdatePlay(dt);
    if (!G) return;
    const cfg = AMB[keyOf(G.R.pal)];
    if (cfg) {
      if (!G.amb) G.amb = [];
      const dc = G.ambCam == null ? 0 : G.cam.x - G.ambCam; G.ambCam = G.cam.x;
      stepAmbient(G.amb, cfg.kind, cfg.n, dt, dc);
    }
    Sound.setWind(G.R.wind.length > 0 && windGust());
  };

  
  const baseGive = SCRIPTS.apology.give;
  SCRIPTS.apology.give = function (m) { baseGive(m); setTimeout(() => Sound.play('theme'), 900); };

  
  const titleAmb = [];
  let titleLast = null;
  const baseTitleBG = drawTitleBG;
  drawTitleBG = function (t) {
    baseTitleBG(t);
    const dt = titleLast == null ? 0 : Math.min(0.05, Math.max(0, t - titleLast)); titleLast = t;
    stepAmbient(titleAmb, 'fly', 16, dt, 0);
    drawAmbient(titleAmb, PAL.dusk.accent);
    vignette();
  };
  updateTitle = function (dt) {
    titleT += dt;
    Sound.setWind(false); Sound.setAmbience('none');
    drawTitleBG(titleT);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; textShadow(true);
    ctx.font = '500 76px ' + SERIF; ctx.fillStyle = '#f8eedc'; ctx.fillText('Shortcut', 90, 150);
    ctx.font = 'italic 21px ' + SERIF; ctx.fillStyle = '#ffd9a8'; ctx.fillText('a small game about the long way round', 94, 186);
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
  };

  
  drawHUD = function () {
    ctx.save(); ctx.textBaseline = 'top'; textShadow(true);
    const CH = G.R.CH;
    ctx.font = '600 13px ' + SANS; ctx.fillStyle = G.R.pal.text; ctx.globalAlpha = 0.65; ctx.textAlign = 'left';
    ctx.fillText(CH.extra ? CH.title : (G.R.ci ? 'Chapter ' + G.R.ci + '  ·  ' : '') + CH.title, 18, 16);
    ctx.textAlign = 'right';
    if (CH.extra) { ctx.globalAlpha = 0.9; ctx.font = '700 18px ' + SANS; ctx.fillText((G.flags.clock || 0).toFixed(1) + ' s', VW - 18, 14); }
    else if (G.R.ci >= 1) ctx.fillText('Stones ' + save.stones.length + '/' + STONE_ORDER.length + '   Cards ' + save.cards.length + '/' + CARD_ORDER.length + '   Esc menu', VW - 18, 16);
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
      const s = 'Stuck? Press K to skip ahead.', w = ctx.measureText(s).width + 28;
      textShadow(false); ctx.fillStyle = 'rgba(12,14,26,0.72)'; rr(VW / 2 - w / 2, VH - 52, w, 32, 8); ctx.fill();
      ctx.fillStyle = '#ffe1a8'; ctx.fillText(s, VW / 2, VH - 36);
    }
    const fx = G.p.fx, slow = fx.slow || 0, bounce = fx.bounce || 0;
    const eff = fx.sit > 0 ? 'Jump = sit down' : fx.reverse > 0 ? 'Controls reversed' : fx.heavy > 0 ? 'Heavy pockets' : fx.flip > 0 ? 'Upside down'
      : slow > 0 ? 'Fast lane (not fast)' : bounce > 0 ? 'Spring shoes' : '';
    if (eff) {
      const left = Math.max(fx.sit, fx.reverse, fx.heavy, fx.flip, slow, bounce);
      ctx.font = '700 14px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const s = eff + '  ' + left.toFixed(0) + 's', w = ctx.measureText(s).width + 26;
      textShadow(false); ctx.fillStyle = 'rgba(60,30,60,0.8)'; rr(VW / 2 - w / 2, 46, w, 28, 14); ctx.fill();
      ctx.fillStyle = '#ffd36b'; ctx.fillText(s, VW / 2, 60);
    }
    ctx.restore(); textShadow(false);
  };

  
  updateGallery = function () {
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
        const got = save.cards.includes(k), x = 70 + (i % 2) * 420, y = 144 + Math.floor(i / 2) * 58;
        ctx.fillStyle = got ? '#241c38' : '#161a2a'; rr(x, y, 400, 50, 10); ctx.fill();
        ctx.strokeStyle = got ? 'rgba(255,211,107,0.5)' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; rr(x, y, 400, 50, 10); ctx.stroke();
        ctx.font = '700 14px ' + SANS; ctx.fillStyle = got ? '#ffd36b' : '#4d5370'; ctx.fillText(got ? CARDS[k].name : '?  ?  ?', x + 16, y + 16);
        ctx.font = 'italic 14px ' + SERIF; ctx.fillStyle = got ? '#e8e2f0' : '#3f4560'; ctx.fillText(got ? CARDS[k].text : 'Some shortcut, somewhere.', x + 16, y + 35);
      });
    } else {
      const all = allNotes();
      ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#a9a3b8'; ctx.fillText(save.notes.length + ' of ' + all.length + ' found. They sit in quiet corners.', 70, 152);
      let col = 0, y = 186;
      all.forEach(n => {
        const got = save.notes.includes(n.id);
        ctx.font = got ? 'italic 14px ' + SERIF : '600 13px ' + SANS;
        const lines = got ? wrap(n.text, 390) : ['· · ·'];
        if (y + lines.length * 17 > VH - 60 && col === 0) { col = 1; y = 186; }
        ctx.fillStyle = got ? '#f6ecd6' : '#4d5370';
        lines.forEach(l => { ctx.fillText(l, 70 + col * 430, y); y += 17; });
        y += 9;
      });
    }
    if (IN.back() || (mouse.click && mouse.y > VH - 50)) { scene = returnTo === 'pause' ? 'pause' : 'title'; }
    ctx.font = '600 14px ' + SANS; ctx.fillStyle = '#c9c3d6'; ctx.textAlign = 'center'; ctx.fillText('Back', VW / 2, VH - 26);
  };
})();
