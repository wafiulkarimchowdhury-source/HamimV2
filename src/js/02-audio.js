// ---------- audio: all sound is generated here, so the app needs no audio files ----------
var AU = { ctx: null, master: null, sfxG: null, musG: null, ambG: null, noise: null, voices: 0, musicOn: true, sfxOn: true,
  trk: null, trkName: '', nextT: 0, step: 0, bar: 0, stepDur: 0.1, trans: 0, stage: 0, pm: 1, glitch: false, timer: 0, pulse: {},
  windG: null, rainG: null, duck: 1 };

function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') { try { AU.ctx.resume(); } catch (e) {} } return AU.ctx; }
  try { var C = window.AudioContext || window.webkitAudioContext; AU.ctx = new C(); } catch (e) { AU.ctx = null; return null; }
  var c = AU.ctx;
  AU.master = c.createGain(); AU.master.gain.value = 0.9; AU.master.connect(c.destination);
  AU.sfxG = c.createGain(); AU.sfxG.gain.value = 0.6; AU.sfxG.connect(AU.master);
  AU.musG = c.createGain(); AU.musG.gain.value = 0.2; AU.musG.connect(AU.master);
  AU.ambG = c.createGain(); AU.ambG.gain.value = 0.5; AU.ambG.connect(AU.master);
  var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = b;
  // ambience: wind and rain are looping filtered noise
  var w = c.createBufferSource(); w.buffer = b; w.loop = true;
  var wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 520; wf.Q.value = 0.8;
  AU.windG = c.createGain(); AU.windG.gain.value = 0; w.connect(wf); wf.connect(AU.windG); AU.windG.connect(AU.ambG); w.start();
  var r = c.createBufferSource(); r.buffer = b; r.loop = true;
  var rf = c.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2600;
  AU.rainG = c.createGain(); AU.rainG.gain.value = 0; r.connect(rf); rf.connect(AU.rainG); AU.rainG.connect(AU.ambG); r.start();
  clearInterval(AU.timer); AU.timer = setInterval(musicTick, 30);
  setAudioFlags(AU.musicOn, AU.sfxOn);
  if (AU.wantTrack) { var wt = AU.wantTrack; AU.wantTrack = null; musicPlay(wt[0], wt[1]); }
  return c;
}
function pulseWave(duty) {
  var key = duty.toFixed(3);
  if (AU.pulse[key]) return AU.pulse[key];
  var N = 32, re = new Float32Array(N), im = new Float32Array(N);
  for (var n = 1; n < N; n++) { re[n] = Math.sin(TAU * n * duty) / (Math.PI * n); im[n] = (1 - Math.cos(TAU * n * duty)) / (Math.PI * n); }
  AU.pulse[key] = AU.ctx.createPeriodicWave(re, im);
  return AU.pulse[key];
}
function toneAt(at, f, dur, type, vol, slideTo, dest, duty) {
  var c = AU.ctx; if (!c || AU.voices > 30) return;
  var o = c.createOscillator(), g = c.createGain();
  if (duty) o.setPeriodicWave(pulseWave(duty)); else o.type = type || 'square';
  o.frequency.setValueAtTime(f, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(dest || AU.sfxG);
  o.start(at); o.stop(at + dur + 0.03);
  AU.voices++; o.onended = function () { AU.voices--; };
}
function tone(f, dur, type, vol, slideTo, delay) {
  if (!AU.ctx || !AU.sfxOn) return;
  var f2 = AU.glitch ? f * (0.8 + Math.random() * 0.5) : f;
  toneAt(AU.ctx.currentTime + (delay || 0), f2, dur, type, vol, slideTo, AU.sfxG);
}
function noiseAt(at, dur, vol, ftype, f0, f1, dest) {
  var c = AU.ctx; if (!c || AU.voices > 30) return;
  var s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  var f = c.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(f0 || 1500, at);
  if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), at + dur);
  var g = c.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f); f.connect(g); g.connect(dest || AU.sfxG);
  s.start(at, Math.random() * 1.5); s.stop(at + dur + 0.03);
  AU.voices++; s.onended = function () { AU.voices--; };
}
function noise(dur, vol, ftype, f0, f1, delay) {
  if (!AU.ctx || !AU.sfxOn) return;
  noiseAt(AU.ctx.currentTime + (delay || 0), dur, vol, ftype, f0, f1, AU.sfxG);
}

// ---------- sound effects ----------
function sfx(n, a) {
  if (!AU.ctx || !AU.sfxOn) return;
  var p = AU.pm;
  switch (n) {
    case 'ui': tone(660, 0.06, 'square', 0.12, 990); break;
    case 'back': tone(520, 0.06, 'square', 0.1, 330); break;
    case 'swap': tone(400, 0.05, 'square', 0.1); tone(640, 0.06, 'square', 0.1, null, 0.06); break;
    case 'buy': tone(880, 0.08, 'square', 0.14); tone(1320, 0.1, 'square', 0.14, null, 0.08); tone(1760, 0.2, 'square', 0.14, null, 0.16); break;
    case 'deny': tone(180, 0.2, 'sawtooth', 0.14, 110); break;
    case 'coin': tone(1320, 0.05, 'square', 0.09); tone(1760, 0.12, 'square', 0.09, null, 0.05); break;
    case 'tick': tone(2100 * p, 0.035, 'square', 0.08, 1300 * p); tone(1100 * p, 0.03, 'triangle', 0.07); break;
    case 'kill': noise(0.14, 0.2, 'bandpass', 2400, 500); tone(520 * p, 0.14, 'square', 0.12, 170 * p); break;
    case 'mutHit': tone(300 * p, 0.06, 'square', 0.12, 200 * p); noise(0.05, 0.12, 'highpass', 3000); break;
    case 'mutKill': noise(0.22, 0.26, 'bandpass', 2000, 300); tone(420 * p, 0.2, 'square', 0.14, 90 * p); tone(130, 0.3, 'sawtooth', 0.12, 55, 0.04); sfx('coin'); break;
    case 'shield': tone(1500, 0.1, 'triangle', 0.14, 2400); noise(0.06, 0.1, 'highpass', 5000); break;
    case 'gunHit': noise(0.12, 0.26, 'lowpass', 1400, 400); tone(110, 0.15, 'square', 0.15, 60); tone(700, 0.1, 'triangle', 0.1, 280); break;
    case 'gunBreak': noise(0.6, 0.4, 'lowpass', 2400, 120); tone(220, 0.5, 'sawtooth', 0.2, 40); tone(90, 0.6, 'square', 0.15, 30, 0.05); break;
    case 'jam': for (var i = 0; i < 5; i++) tone(110 + (i % 2) * 30, 0.06, 'square', 0.11, null, i * 0.09); break;
    case 'life': tone(330, 0.3, 'sawtooth', 0.16, 100); tone(220, 0.3, 'square', 0.1, 70, 0.1); break;
    case 'bhit': tone(140 * p, 0.09, 'square', 0.15, 70 * p); noise(0.07, 0.16, 'lowpass', 1000, 300); break;
    case 'bweak': tone(900, 0.08, 'square', 0.15, 1800); tone(1800, 0.12, 'triangle', 0.12, 2400, 0.05); noise(0.05, 0.1, 'highpass', 4000); break;
    case 'bshield': tone(240, 0.12, 'square', 0.14, 190); noise(0.08, 0.12, 'highpass', 3000); break;
    case 'warn': tone(440, 0.12, 'square', 0.12); tone(330, 0.14, 'square', 0.12, null, 0.14); break;
    case 'goo': tone(170, 0.22, 'sawtooth', 0.12, 80); noise(0.12, 0.12, 'bandpass', 700, 250); break;
    case 'bolt': tone(1000, 0.2, 'sawtooth', 0.12, 160); noise(0.15, 0.12, 'highpass', 2500, 800); break;
    case 'spit': tone(300, 0.1, 'triangle', 0.1, 120); break;
    case 'slam': noise(0.5, 0.45, 'lowpass', 700, 80); tone(70, 0.45, 'square', 0.26, 28); break;
    case 'summon': tone(200, 0.45, 'triangle', 0.14, 520); tone(400, 0.45, 'triangle', 0.1, 1040, 0.05); break;
    case 'heal': tone(500, 0.14, 'triangle', 0.1, 900); break;
    case 'pop': tone(520, 0.1, 'square', 0.1, 200); noise(0.08, 0.12, 'bandpass', 1500, 400); break;
    case 'phase': tone(220, 0.5, 'sawtooth', 0.18, 880); noise(0.4, 0.2, 'highpass', 1500, 5000); break;
    case 'bossIntro': tone(58, 1.6, 'sawtooth', 0.22, 38); noise(1.2, 0.3, 'lowpass', 300, 60); tone(70, 0.6, 'square', 0.3, 32, 1.25); noise(0.5, 0.4, 'lowpass', 1200, 100, 1.25); break;
    case 'bossDie': noise(1.0, 0.45, 'lowpass', 3200, 150); tone(300, 1.0, 'sawtooth', 0.2, 40); tone(150, 0.8, 'square', 0.15, 30, 0.1); break;
    case 'levelUp': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, 'square', 0.09, null, i * 0.08); }); break;
    case 'fanfare': [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, i > 4 ? 0.3 : 0.14, 'square', 0.1, null, i * 0.12); tone(f / 2, i > 4 ? 0.3 : 0.14, 'triangle', 0.1, null, i * 0.12); }); break;
    case 'lose': [392, 330, 262, 196, 131].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.16, f * 0.97, i * 0.22); tone(f * 2, 0.2, 'square', 0.05, null, i * 0.22); }); break;
    case 'thunder': noise(1.9, 0.5, 'lowpass', 260, 60, a || 0.1); tone(52, 1.6, 'sine', 0.3, 30, a || 0.1); break;
    case 'meteor': noise(0.5, 0.12, 'highpass', 5000, 900); break;
    case 'shoot': shootSfx(a); break;
  }
}
function shootSfx(id) {
  switch (id) {
    case 0: tone(520, 0.1, 'triangle', 0.13, 210); break;
    case 1: noise(0.07, 0.14, 'bandpass', 2000, 500); tone(320, 0.14, 'square', 0.13, 80); break;
    case 2: tone(700, 0.07, 'square', 0.1, 330); tone(840, 0.07, 'square', 0.09, 400, 0.035); break;
    case 3: tone(760, 0.05, 'square', 0.08, 420); break;
    case 4: noise(0.2, 0.3, 'lowpass', 1800, 160); tone(150, 0.2, 'square', 0.17, 48); break;
    case 5: tone(190, 0.18, 'sine', 0.2, 80); tone(380, 0.14, 'triangle', 0.1, 620, 0.02); break;
    case 6: tone(280, 0.04, 'sawtooth', 0.07, 200); noise(0.03, 0.06, 'highpass', 4000); break;
    case 7: tone(980, 0.12, 'square', 0.1, 1960); tone(1960, 0.16, 'triangle', 0.09, 2600, 0.03); tone(490, 0.12, 'triangle', 0.1, 245); break;
  }
}
function setAmbient(wind, rain) {
  if (!AU.ctx) return;
  var t = AU.ctx.currentTime;
  AU.windG.gain.setTargetAtTime(wind * 0.4, t, 0.9);
  AU.rainG.gain.setTargetAtTime(rain * 0.28, t, 0.9);
}
function setAudioFlags(music, sound) {
  AU.musicOn = music; AU.sfxOn = sound;
  if (AU.ctx) AU.musG.gain.setTargetAtTime(music ? 0.2 * AU.duck : 0, AU.ctx.currentTime, 0.05);
}
function duckMusic(v) {
  AU.duck = v;
  if (AU.ctx && AU.musicOn) AU.musG.gain.setTargetAtTime(0.2 * v, AU.ctx.currentTime, 0.12);
}

// ---------- music: original 8-bit loops, written as notes and chords ----------
var NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function nm(s) {
  var m = /^([A-G])(#|b)?(\d)$/.exec(s); if (!m) return 0;
  return 12 * (parseInt(m[3], 10) + 1) + NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function leadEvents(bars) {
  return bars.map(function (str) {
    var toks = str.trim().split(/\s+/), ev = [], last = null, i;
    for (i = 0; i < 16; i++) ev.push(null);
    for (i = 0; i < 16; i++) {
      var t = toks[i] || '.';
      if (t === '.') { last = null; }
      else if (t === '-') { if (last) last.len++; }
      else { last = { m: nm(t), len: 1 }; ev[i] = last; }
    }
    return ev;
  });
}
var MAJ = [0, 4, 7], MIN = [0, 3, 7];
var TRACKS = {
  menu: { bpm: 92, wave: 0.25, leadVol: 0.1, bassVol: 0.18, arpVol: 0.04, arp: 'x.x.x.x.x.x.x.x.', bass: 'x.......x.......', dr: { k: 'x.......x.......', s: '................', h: '..x...x...x...x.' },
    chords: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ]],
    lead: ['A4 - - . C5 - - . E5 - - . D5 - - .', 'C5 - - . A4 - - . F4 - - . A4 - - .', 'G4 - - . C5 - - . E5 - - . G5 - - .', 'D5 - - . B4 - - . G4 - - . D5 - - .'] },
  play: { bpm: 132, wave: 0.25, leadVol: 0.12, bassVol: 0.2, arpVol: 0.045, arp: 'x.x.x.x.x.x.x.x.', bass: 'x.x.x.x.x.x.x.x.', dr: { k: 'x...x...x..xx...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    chords: [[45, MIN], [41, MAJ], [48, MAJ], [43, MAJ], [45, MIN], [41, MAJ], [43, MAJ], [40, MAJ]],
    lead: ['E5 - . E5 D5 . C5 . A4 - . . C5 . D5 .', 'F5 - . F5 E5 . C5 . A4 - . . C5 . E5 .', 'G5 - . G5 E5 . C5 . G4 - . . C5 . E5 .', 'D5 - . D5 B4 . G4 . B4 - . . D5 . B4 .',
      'A4 . C5 E5 A5 - . G5 E5 . C5 . E5 - . .', 'F5 . A5 . C6 - A5 . F5 . C5 . A4 - . .', 'G5 . B5 . D6 - B5 . G5 . D5 . B4 - . .', 'E5 - G#5 - B5 - . G#5 E5 . . . B4 . . .'] },
  boss: { bpm: 158, wave: 0.125, leadVol: 0.13, bassVol: 0.22, arpVol: 0.06, arp: 'xxxxxxxxxxxxxxxx', bass: 'xxxxxxxxxxxxxxxx', dr: { k: 'x..xx..xx..xx.x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' },
    chords: [[50, MIN], [46, MAJ], [43, MIN], [45, MAJ], [50, MIN], [46, MAJ], [43, MIN], [45, MAJ]],
    lead: ['D5 D5 . D5 F5 . D5 . A4 . D5 . C5 . A4 .', 'Bb4 Bb4 . Bb4 D5 . Bb4 . F5 . D5 . C5 . Bb4 .', 'G4 G4 . G4 Bb4 . G4 . D5 . Bb4 . A4 . G4 .', 'A4 A4 . C#5 E5 . A5 . G5 . E5 . C#5 . A4 .',
      'D6 . A5 . F5 . A5 D6 - . C6 . A5 . F5 .', 'Bb5 . F5 . D5 . F5 Bb5 - . A5 . F5 . D5 .', 'G5 . D5 . Bb4 . D5 G5 - . F5 . D5 . Bb4 .', 'A5 . E5 . C#5 . E5 A5 . C#6 . E6 - - - .'] },
  shop: { bpm: 92, wave: 0.125, leadVol: 0.1, bassVol: 0.16, arpVol: 0.04, arp: 'x.x.x.x.x.x.x.x.', bass: 'x...x...x...x...', dr: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    chords: [[48, MAJ], [45, MIN], [41, MAJ], [43, MAJ]],
    lead: ['E5 . G5 . C6 . G5 . E5 . G5 . C5 . . .', 'C5 . E5 . A5 . E5 . C5 . E5 . A4 . . .', 'A4 . C5 . F5 . C5 . A4 . C5 . F5 . A5 .', 'B4 . D5 . G5 . D5 . B4 . D5 . G5 - - .'] }
};
for (var tk in TRACKS) TRACKS[tk].ev = leadEvents(TRACKS[tk].lead);
var STAGE_TRANS = [0, 2, 3, 5, 7, -2, -4, 1, 4, 6, -1];

function musicPlay(name, stage) {
  if (!AU.ctx) { AU.wantTrack = [name, stage]; return; }
  var T = TRACKS[name]; if (!T) return;
  stage = stage || 0;
  if (AU.trkName === name && AU.stage === stage && AU.trk) return;
  AU.trk = T; AU.trkName = name; AU.stage = stage;
  AU.trans = STAGE_TRANS[stage % STAGE_TRANS.length];
  var bpm = T.bpm + (name === 'play' ? stage * 3 : name === 'boss' ? stage * 2 : 0);
  AU.stepDur = 60 / bpm / 4;
  AU.step = 0; AU.bar = 0;
  AU.nextT = AU.ctx.currentTime + 0.06;
}
function musicStop() { AU.trk = null; AU.trkName = ''; }
function musicTick() {
  var c = AU.ctx; if (!c || !AU.trk || !AU.musicOn) return;
  if (AU.nextT < c.currentTime - 0.25) AU.nextT = c.currentTime + 0.05;
  var guard = 0;
  while (AU.nextT < c.currentTime + 0.14 && guard++ < 8) {
    schedStep(AU.nextT);
    AU.step++;
    if (AU.step >= 16) { AU.step = 0; AU.bar = (AU.bar + 1) % AU.trk.chords.length; }
    AU.nextT += AU.stepDur;
  }
}
function schedStep(t) {
  var T = AU.trk, s = AU.step, bar = AU.bar, tr = AU.trans, sd = AU.stepDur, M = AU.musG;
  var ch = T.chords[bar], root = ch[0] + tr, ints = ch[1];
  var ev = T.ev[bar % T.ev.length][s];
  if (ev) {
    toneAt(t, mf(ev.m + tr), ev.len * sd * 0.92, null, T.leadVol, null, M, T.wave);
    if (AU.stage >= 4 && T.leadVol) toneAt(t, mf(ev.m + tr - 12), ev.len * sd * 0.9, 'triangle', T.leadVol * 0.7, null, M);
  }
  if (T.arp.charAt(s) === 'x') {
    var idx = (s >> 1) % 4, iv = [0, 1, 2, 1][idx];
    toneAt(t, mf(root + 24 + ints[iv]), sd * 0.8, null, T.arpVol, null, M, 0.125);
  }
  if (T.bass.charAt(s) === 'x') {
    var oct = (s % 4 === 2) || (T.bpm > 140 && s % 4 === 3) ? 12 : 0;
    toneAt(t, mf(root + oct), sd * 1.5, 'triangle', T.bassVol, null, M);
  }
  var d = T.dr;
  if (d.k.charAt(s) === 'x') { toneAt(t, 150, 0.12, 'sine', 0.34, 42, M); }
  if (d.s.charAt(s) === 'x') { noiseAt(t, 0.12, 0.2, 'highpass', 1800, null, M); toneAt(t, 190, 0.07, 'triangle', 0.09, 110, M); }
  if (d.h.charAt(s) === 'x' || (AU.stage >= 3 && AU.trkName === 'play' && s % 2 === 1)) noiseAt(t, 0.035, 0.05, 'highpass', 7000, null, M);
}
