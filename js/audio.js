
const Sound = (() => {
  let ac = null, master = null, musicBus = null, sfxBus = null, ambBus = null, verb = null, noiseBuf = null;
  let enabled = true, mood = null, thin = false, nextNote = 0, nextChord = 0, ci = 0;
  let mel = 3, phrase = 0, windGain = null, windOn = false, amb = 'none', nextAmb = 0;

  
  const MOODS = {
    quiet:   { chords: [[53, 60, 64, 69], [50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64]], scale: [67, 69, 72, 74, 76, 79, 81, 84], beat: 0.85, rh: [1, 1, 2, 2, 3], rest: [3, 6], pad: 0.045, pl: 0.06, len: 7 },
    warm:    { chords: [[48, 55, 64, 67], [45, 52, 60, 64], [41, 48, 57, 64], [43, 50, 59, 62]], scale: [67, 69, 72, 74, 76, 79, 81, 84, 86], beat: 0.55, rh: [1, 1, 1, 2, 2], rest: [2, 4], pad: 0.045, pl: 0.065, len: 6 },
    focused: { chords: [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 64, 67], [43, 50, 59, 62]], scale: [64, 67, 69, 71, 72, 76, 79, 81], beat: 0.4, rh: [1, 1, 1, 2], rest: [2, 4], pad: 0.04, pl: 0.05, len: 5 },
    playful: { chords: [[48, 55, 64, 67], [53, 60, 65, 69], [50, 57, 62, 65], [43, 50, 59, 65]], scale: [67, 72, 74, 76, 79, 81, 84, 88], beat: 0.26, rh: [1, 1, 2, 1, 3], rest: [2, 4], pad: 0.032, pl: 0.055, len: 4, bounce: true },
    hollow:  { chords: [[45, 52, 57], [44, 51, 56], [42, 49, 54], [40, 47, 52]], scale: [64, 69, 71, 72, 76], beat: 1.3, rh: [2, 3, 4], rest: [4, 8], pad: 0.038, pl: 0.045, len: 8 },
    chase:   { chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]], scale: [69, 74, 76, 77, 79, 81], beat: 0.3, rh: [1, 1, 2], rest: [2, 3], pad: 0.038, pl: 0.05, len: 4 },
    night:   { chords: [[41, 48, 57, 60], [38, 45, 53, 57], [36, 43, 52, 55], [43, 50, 55, 59]], scale: [67, 69, 72, 74, 76, 79], beat: 1.0, rh: [2, 2, 3, 4], rest: [4, 7], pad: 0.042, pl: 0.05, len: 8 },
    dawn:    { chords: [[48, 55, 64, 71], [53, 60, 64, 69], [45, 52, 60, 67], [50, 57, 62, 66]], scale: [67, 71, 72, 74, 76, 79, 81, 83, 84], beat: 0.5, rh: [1, 1, 2, 2, 3], rest: [2, 4], pad: 0.045, pl: 0.065, len: 6 }
  };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
    const soft = ac.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 3200; soft.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 1; musicBus.connect(soft);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    ambBus = ac.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
    verb = ac.createConvolver();
    const len = ac.sampleRate * 3.4, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    verb.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(master);
    musicBus.connect(verb); sfxBus.connect(verb); ambBus.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    
    const ws = ac.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 480; wf.Q.value = 0.6;
    windGain = ac.createGain(); windGain.gain.value = windOn ? 0.06 : 0;
    ws.connect(wf); wf.connect(windGain); windGain.connect(ambBus); ws.start();
    nextNote = nextChord = ac.currentTime + 0.3;
  }

  function tone(freq, when, dur, vol, type, dest, attack = 0.005, freqEnd = null) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest); o.start(when); o.stop(when + dur + 0.05);
  }
  
  function piano(m, when, vol, dest = musicBus, len = 2.8) {
    const f = mtof(m);
    tone(f, when, len, vol, 'sine', dest, 0.006);
    tone(f * 2, when, len * 0.55, vol * 0.3, 'sine', dest, 0.004);
    tone(f * 3, when, len * 0.3, vol * 0.1, 'sine', dest, 0.003);
    tone(f * 4.02, when, len * 0.18, vol * 0.04, 'sine', dest, 0.003);
  }
  function pad(chord, when, len, vol) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 850; f.connect(musicBus);
    for (const m of chord) {
      for (const det of [-5, 5]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = mtof(m); o.detune.value = det;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(vol / chord.length, when + len * 0.35);
        g.gain.linearRampToValueAtTime(0.0001, when + len * 1.15);
        o.connect(g); g.connect(f); o.start(when); o.stop(when + len * 1.2);
      }
    }
  }
  function noise(when, dur, vol, fFrom, fTo, q = 1, dest = sfxBus) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(fFrom, when); f.frequency.exponentialRampToValueAtTime(fTo, when + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(when); s.stop(when + dur + 0.05);
  }

  function ambience(now) {
    if (amb === 'none' || now < nextAmb) return;
    if (amb === 'crickets') {
      const f = rand(4100, 4500);
      for (let i = 0; i < 3; i++) tone(f, now + 0.05 + i * 0.07, 0.04, 0.004, 'sine', ambBus, 0.004);
      nextAmb = now + rand(0.8, 2.6);
    } else if (amb === 'birds') {
      const f = rand(2300, 3300), n = 2 + Math.floor(rand(0, 3));
      for (let i = 0; i < n; i++) tone(f * rand(0.95, 1.1), now + 0.05 + i * 0.12, 0.09, 0.006, 'sine', ambBus, 0.006, f * 1.35);
      nextAmb = now + rand(3, 9);
    }
  }

  function update() {
    if (!ac || !enabled) return;
    const now = ac.currentTime;
    ambience(now);
    if (!mood) return;
    const M = MOODS[mood];
    if (nextChord < now) nextChord = now + 0.1;
    if (nextNote < now) nextNote = now + 0.1;
    if (now + 0.25 > nextChord) {
      const ch = M.chords[ci % M.chords.length];
      pad(ch, nextChord, M.len, thin ? M.pad * 0.35 : M.pad);
      tone(mtof(ch[0] - 12), nextChord, M.len * 0.9, thin ? 0.012 : 0.03, 'sine', musicBus, 0.08);
      ci++; nextChord += M.len;
    }
    if (now + 0.25 > nextNote) {
      if (phrase <= 0) {
        
        phrase = 3 + Math.floor(rand(0, 4));
        mel = Math.floor(rand(1, M.scale.length - 1));
        nextNote += M.beat * rand(M.rest[0], M.rest[1]) * (thin ? 1.5 : 1);
      } else {
        mel = Math.max(0, Math.min(M.scale.length - 1, mel + pick([-2, -1, -1, 0, 1, 1, 2])));
        if (!thin || Math.random() < 0.3) {
          piano(M.scale[mel], nextNote, M.pl * rand(0.7, 1));
          if (M.bounce && Math.random() < 0.3) piano(M.scale[mel] + 12, nextNote + M.beat * 0.5, M.pl * 0.35);
        }
        phrase--;
        nextNote += M.beat * pick(M.rh) * (thin ? 1.6 : 1);
      }
    }
  }

  const sfx = {
    jump()    { tone(420, ac.currentTime, 0.12, 0.03, 'sine', sfxBus, 0.005, 700); },
    land()    { tone(140, ac.currentTime, 0.08, 0.025, 'sine', sfxBus, 0.003, 90); noise(ac.currentTime, 0.08, 0.012, 900, 400, 0.8); },
    step()    { noise(ac.currentTime, 0.05, 0.008, 1500 + Math.random() * 400, 700, 1.2); },
    collect() { const t = ac.currentTime; [76, 79, 84].forEach((m, i) => piano(m, t + i * 0.09, 0.06, sfxBus, 1.6)); },
    chime()   { const t = ac.currentTime; piano(84, t, 0.055, sfxBus, 2.8); piano(91, t + 0.12, 0.035, sfxBus, 2.8); },
    page()    { noise(ac.currentTime, 0.25, 0.045, 3000, 1500, 0.8); },
    door()    { noise(ac.currentTime, 0.6, 0.07, 400, 2400, 1.5); },
    backfire(){ const t = ac.currentTime; [67, 66, 65, 60].forEach((m, i) => tone(mtof(m), t + 0.18 * i, i === 3 ? 0.6 : 0.2, 0.045, 'triangle', sfxBus, 0.01)); },
    fail()    { const t = ac.currentTime; tone(mtof(57), t, 0.4, 0.035, 'sine', sfxBus); tone(mtof(52), t + 0.15, 0.6, 0.035, 'sine', sfxBus); },
    crumble() { noise(ac.currentTime, 0.3, 0.035, 600, 200, 0.7); },
    tick()    { tone(1200, ac.currentTime, 0.04, 0.018, 'sine', sfxBus); },
    thud()    { tone(90, ac.currentTime, 0.5, 0.07, 'sine', sfxBus, 0.005, 50); noise(ac.currentTime, 0.4, 0.045, 300, 120, 0.6); },
    merge()   { const t = ac.currentTime; [60, 64, 67, 72].forEach((m, i) => piano(m, t + i * 0.12, 0.055, sfxBus, 3)); },
    boing()   { const t = ac.currentTime; tone(180, t, 0.35, 0.04, 'sine', sfxBus, 0.005, 560); tone(260, t + 0.2, 0.3, 0.025, 'sine', sfxBus, 0.005, 700); },
    slowdown(){ tone(520, ac.currentTime, 1.1, 0.035, 'triangle', sfxBus, 0.02, 120); },
    
    theme()   { const t = ac.currentTime; [[72, 0], [76, 0.5], [79, 1], [84, 1.5], [83, 2.5], [79, 3], [81, 3.5], [79, 4.5]].forEach(([m, b]) => piano(m, t + b * 0.5, 0.05, sfxBus, 3.4)); }
  };

  return {
    unlock,
    update,
    play(name) { if (ac && enabled && sfx[name]) try { sfx[name](); } catch (e) {} },
    setMood(m) { if (m !== mood) { mood = m; ci = 0; phrase = 0; if (ac) nextChord = nextNote = ac.currentTime + 0.4; } },
    setThin(v) { thin = v; },
    setWind(v) { v = !!v; if (v === windOn) return; windOn = v; if (windGain) windGain.gain.setTargetAtTime(v ? 0.06 : 0, ac.currentTime, v ? 0.3 : 0.7); },
    setAmbience(name) { if (name !== amb) { amb = name; if (ac) nextAmb = ac.currentTime + 1; } },
    setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.1); },
    get enabled() { return enabled; },
    get started() { return !!ac; }
  };
})();
