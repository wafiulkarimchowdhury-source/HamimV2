// ---------- state ----------
var canvas = document.getElementById('c'), ctx = canvas.getContext('2d'), field = document.getElementById('field');
var W = 800, H = 600, dpr = 1, hudBot = 40, base = 400;
var horizonY = 300, minY = 330, maxY = 520, gunX = 400, gunY = 560, gunH = 150, gunScale = 1.5, view = { x: 0, y: 0, s: 1 };
var QTAB = [null, { label: 'Low', dprMax: 1, part: 70, weather: 0.35, decals: 6 }, { label: 'Medium', dprMax: 1.5, part: 160, weather: 0.65, decals: 12 }, { label: 'High', dprMax: 2, part: 320, weather: 1, decals: 22 }];
var qi = 3, Q = QTAB[3];
var SAVE_KEY = 'hamim-bird-save-v2';
function defSave() { return { coins: 0, owned: [0], equipped: 0, bgOwned: [0], bg: 0, bestLevel: 0, bestScore: 0, diff: 'normal', music: true, sfx: true, quality: 'auto', run: null }; }
var S = defSave(), dirty = false, saveT = 0;
function loadSave() {
  try { var raw = localStorage.getItem(SAVE_KEY); if (raw) { var o = JSON.parse(raw), d = defSave(); for (var k in d) if (o[k] !== undefined) d[k] = o[k]; S = d; } } catch (e) {}
  if (S.owned.indexOf(S.equipped) < 0) S.equipped = 0;
  if (S.bgOwned.indexOf(S.bg) < 0) S.bg = 0;
  if (!DIFFS[S.diff]) S.diff = 'normal';
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} dirty = false; }
function addCoins(n) { S.coins += n; G.runCoins += n; dirty = true; hudDirty = true; }

function freshG() {
  return { mode: 'boot', paused: false, ts: 1, hitstop: 0, level: 1, stage: 0, bossK: 0, isBoss: false, quota: 10, lk: 0, clearT: 0, spawnT: 1,
    banner: { t: 0, text: '', sub: '', col: '#fff' }, lives: 5, maxLives: 5, score: 0, combo: 0, comboT: 0, shots: 0, hits: 0, kills: 0, runCoins: 0, coinsStart: 0,
    gunHP: {}, gun: 0, jam: 0, fireCd: 0, swapCd: 0, spin: 0, spinA: 0, recoil: 0, hurtT: 0, regenT: 0, hold: false, aimX: 0, aimY: 0, ang: 0,
    ents: [], eprojs: [], pprojs: [], decals: [], shards: [], boss: null, bossTimer: 300, intro: 0, defeat: null, shake: 0, flash: 0, reason: '', climIdx: 0, bossDown: 0, summary: null, muzzle: 0, lastAcc: 0 };
}
var G = freshG(), hudDirty = true, time = 0;

// ---------- particles (pooled) ----------
var PMAX = 340, P = [], pn = 0, FMAX = 40, F = [], fn = 0, i0;
for (i0 = 0; i0 < PMAX; i0++) P.push({ x: 0, y: 0, vx: 0, vy: 0, life: 1, age: 0, r: 2, c: '#fff', s: 0, g: 0, add: 0 });
for (i0 = 0; i0 < FMAX; i0++) F.push({ x: 0, y: 0, txt: '', c: '#fff', age: 0, big: 0 });
function emit(x, y, vx, vy, life, r, c, shape, grav, add) {
  if (pn >= Q.part) return;
  var p = P[pn++]; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.age = 0; p.r = r; p.c = c; p.s = shape; p.g = grav; p.add = add || 0;
}
function floatText(x, y, txt, c, big) {
  if (fn >= FMAX) { fn--; }
  var f = F[fn++]; f.x = x; f.y = y; f.txt = txt; f.c = c; f.age = 0; f.big = big || 0;
}
function burst(x, y, color, n, power, add) {
  var k = Math.min(W, H) / 700, cl = CLIMATES[G.climIdx], i;
  n = Math.ceil(n * Q.weather * 0.5 + n * 0.5);
  for (i = 0; i < n; i++) {
    var a = rnd(0, TAU), sp = rnd(60, 330) * power * k, c = (G.climIdx > 0 && i % 3 === 0) ? pickOne(cl.pcol) : color;
    emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp - rnd(0, 140) * k, rnd(0.35, 0.85), rnd(2, 5.5) * Math.max(0.8, k), c, (cl.shape > 1 && i % 2) ? 1 : 0, 760 * k, add);
  }
}
function coinBurst(x, y, n) { for (var i = 0; i < n; i++) { var a = rnd(-Math.PI, 0), sp = rnd(120, 360) * Math.min(W, H) / 700; emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.7, 1.2), rnd(3, 5), i % 2 ? '#ffd23f' : '#fff3b0', 1, 900, 0); } }

// ---------- layout ----------
function layout() {
  var r = field.getBoundingClientRect();
  W = Math.max(280, Math.round(r.width)); H = Math.max(260, Math.round(r.height));
  dpr = Math.min(window.devicePixelRatio || 1, Q.dprMax);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var bs = Math.max(W / SW, (H * 0.8) / SH), dw = SW * bs, dh = SH * bs;
  view = { x: (W - dw) / 2, y: H - dh, s: bs };
  horizonY = view.y + HZ * bs;
  minY = horizonY + (H - horizonY) * 0.1; maxY = H * 0.86;
  if (maxY < minY + 50) maxY = minY + 50;
  base = Math.min(H, W * 0.95);
  gunH = clamp(Math.min(H * 0.3, W * 0.3), 80, 230);
  gunScale = Math.max(0.75, Math.round(gunH / 96 * 2) / 2);
  gunX = W / 2; gunY = H - 24 - 6 * gunScale;
  var hud = document.getElementById('hud');
  hudBot = hud.hidden ? 8 : hud.offsetHeight + 8;
  wxResize();
}

// ---------- climate / weather state ----------
var WX = { lv: { leaves: 0, rain: 0, snow: 0, fog: 0, sand: 0, ember: 0, meteor: 0, aurora: 0, glitch: 0, light: 0, dark: 0 }, tg: { leaves: 0, rain: 0, snow: 0, fog: 0, sand: 0, ember: 0, meteor: 0, aurora: 0, glitch: 0, light: 0, dark: 0 },
  tint: [0, 0, 0, 0], tintTg: [0, 0, 0, 0], lightT: 5, flash: 0, glT: 0, glY: 0, glDx: 0, pr: {}, fogX: 0, mets: [] };
var WMAX = { leaves: 28, rain: 150, snow: 110, sand: 80, ember: 64 };
function wxResize() {
  var k, i;
  for (k in WMAX) { WX.pr[k] = []; for (i = 0; i < WMAX[k]; i++) WX.pr[k].push({ x: rnd(0, W), y: rnd(0, H), v: rnd(0.6, 1.2), a: rnd(0, TAU) }); }
}
function setClimate(idx, boss) {
  G.climIdx = idx;
  var c = CLIMATES[idx], b = boss ? 1.35 : 1, k;
  for (k in WX.tg) WX.tg[k] = 0;
  var keys = ['leaves', 'rain', 'snow', 'fog', 'sand', 'ember', 'meteor', 'aurora', 'glitch', 'light', 'dark'];
  for (var i = 0; i < keys.length; i++) if (c[keys[i]]) WX.tg[keys[i]] = Math.min(1.4, c[keys[i]] * b);
  WX.tintTg = [c.tint[0], c.tint[1], c.tint[2], c.tint[3] * (boss ? 1.4 : 1)];
  AU.pm = c.snd; AU.glitch = !!c.glitch;
  setAmbient(c.wind * (boss ? 1.3 : 1), c.rainS * (boss ? 1.3 : 1));
}
function wxUpdate(dt) {
  var k, c;
  for (k in WX.lv) WX.lv[k] += (WX.tg[k] - WX.lv[k]) * Math.min(1, dt * 0.8);
  for (k = 0; k < 4; k++) WX.tint[k] += (WX.tintTg[k] - WX.tint[k]) * Math.min(1, dt * 0.8);
  WX.flash = Math.max(0, WX.flash - dt * 2.4);
  WX.fogX += dt * 14;
  var kk, arr, n, i, p, lv, kp = Math.min(W, H) / 700;
  for (kk in WMAX) {
    lv = WX.lv[kk === 'leaves' ? 'leaves' : kk === 'rain' ? 'rain' : kk === 'snow' ? 'snow' : kk === 'sand' ? 'sand' : 'ember'];
    if (lv < 0.02) continue;
    arr = WX.pr[kk]; n = Math.min(arr.length, Math.floor(WMAX[kk] * lv * Q.weather));
    for (i = 0; i < n; i++) {
      p = arr[i];
      if (kk === 'rain') { p.y += 900 * p.v * dt * kp; p.x -= 150 * p.v * dt * kp; if (p.y > H) { p.y = -20; p.x = rnd(0, W + 80); } }
      else if (kk === 'snow') { p.y += 55 * p.v * dt * kp; p.x += Math.sin(time * 1.2 + p.a) * 24 * dt; if (p.y > H) { p.y = -6; p.x = rnd(0, W); } }
      else if (kk === 'leaves') { p.y += 40 * p.v * dt * kp; p.x += (60 + Math.sin(time * 2 + p.a) * 40) * dt; p.a += dt * 3; if (p.y > H || p.x > W + 10) { p.y = rnd(-30, 0); p.x = rnd(-30, W); } }
      else if (kk === 'sand') { p.x += 700 * p.v * dt * kp; p.y += Math.sin(time * 3 + p.a) * 20 * dt; if (p.x > W + 40) { p.x = -60; p.y = rnd(horizonY * 0.5, H); } }
      else { p.y -= 70 * p.v * dt * kp; p.x += Math.sin(time * 2 + p.a) * 26 * dt + 20 * dt; if (p.y < -10) { p.y = H + 6; p.x = rnd(0, W); } }
    }
  }
  if (WX.lv.light > 0.05) {
    WX.lightT -= dt;
    if (WX.lightT <= 0) { WX.flash = 1; sfx('thunder', rnd(0.15, 0.6)); WX.lightT = rnd(3.5, 8) / Math.max(0.3, WX.lv.light); }
  }
  if (WX.lv.meteor > 0.05) {
    if (Math.random() < dt * 1.2 * WX.lv.meteor && WX.mets.length < 5) WX.mets.push({ x: rnd(W * 0.2, W * 1.1), y: rnd(-20, horizonY * 0.5), t: 0 });
  }
  for (i = WX.mets.length - 1; i >= 0; i--) { var m = WX.mets[i]; m.t += dt; m.x -= 520 * kp * dt; m.y += 330 * kp * dt; if (m.y > horizonY + 10 || m.x < -40) { if (m.y > horizonY) { WX.flash = Math.max(WX.flash, 0.35); sfx('meteor'); } WX.mets.splice(i, 1); } }
  if (WX.lv.glitch > 0.05) {
    WX.glT -= dt;
    if (WX.glT <= 0) { WX.glT = rnd(1.2, 3) / WX.lv.glitch; WX.glActive = 0.12; WX.glY = rnd(0.1, 0.8) * H; WX.glDx = rnd(-30, 30); }
  }
  if (WX.glActive > 0) WX.glActive -= dt;
}

// ---------- hamims and mutants ----------
function sizeFor(y) {
  var t = clamp((y - minY) / (maxY - minY), 0, 1), h = base * lerp(0.12, 0.33, t);
  return { t: t, h: h };
}
function hasP(e, id) { return (e.pm >> (id - 1)) & 1; }
function newEnt(mut) {
  return { id: 0, mut: mut, mini: false, summoned: false, safe: false, x: 0, y: 0, baseY: 0, dir: 1, speed: 100, phase: rnd(0, TAU), wobF: rnd(1.5, 3), wobA: 0, pending: 0, t: 0, h: 50, w: 40, sc: 1,
    bob: 0, tilt: 0, lift: 0, state: 0, hitT: 0, ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, spin: 0, layer: null, hp: 10, maxHp: 10, shield: 0, flash: 0, stun: 0,
    pm: 0, tx: 0, ty: 0, wait: 0, atkT: 3, atkP: 6, charge: 0, dmg: 5, healT: 1, gh: 1, zz: 0, dashT: 0, born: 0, dep: 0 };
}
function spawnNormal(fromX, mini) {
  var e = newEnt(false), dir = Math.random() < 0.5 ? 1 : -1, D = DIFFS[S.diff], lvl = G.mode === 'play' ? G.level : 1;
  var depth = Math.pow(Math.random(), 0.8); e.baseY = lerp(minY, maxY, depth); e.y = e.baseY;
  var sz = sizeFor(e.baseY); e.h = sz.h * (mini ? 0.7 : 1); e.w = e.h * HAM.w / HAM.h; e.dep = sz.t;
  e.dir = dir; e.x = fromX !== undefined ? fromX : (dir > 0 ? -e.w : W + e.w);
  e.speed = W * 0.13 * speedMul(lvl) * D.speed * lerp(0.62, 1, sz.t) * rnd(0.88, 1.2);
  if (mini) { e.mini = true; e.speed *= 1.25; }
  e.wobA = (lvl >= 3 && !mini) ? rnd(0, 0.025) * H * Math.min(1, (lvl - 2) / 4) : 0;
  e.hp = e.maxHp = 10;
  if (G.mode === 'menu') e.safe = true;
  G.ents.push(e); return e;
}
function pickPowers(stage) {
  var avail = [], i, n = (stage >= 7 && Math.random() < 0.5) ? 2 : 1, pm = 0;
  for (i = 1; i <= Math.min(10, stage); i++) { avail.push(i); if (i >= stage - 1) avail.push(i); }
  for (i = 0; i < n && avail.length; i++) { var id = pickOne(avail); pm |= 1 << (id - 1); avail = avail.filter(function (a) { return a !== id; }); }
  return pm;
}
function mutPrimary(e) { for (var i = 10; i >= 1; i--) if (hasP(e, i)) return i; return 0; }
function spawnMutant(summoned, fromX) {
  var e = newEnt(true), D = DIFFS[S.diff], st = Math.max(1, G.stage), dir = fromX !== undefined ? (fromX < W / 2 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
  e.summoned = !!summoned; e.pm = pickPowers(st);
  e.maxHp = e.hp = 10 * (3 + 0.6 * st) * (hasP(e, 3) ? 2.2 : 1);
  e.shield = hasP(e, 5) ? 1 : 0;
  e.speed = W * 0.19 * (1 + 0.04 * st) * D.speed * (hasP(e, 1) ? 1.6 : 1);
  e.atkP = Math.max(2.6, 6.5 - 0.35 * st) * D.atk; e.atkT = rnd(2, 4);
  e.dmg = (5 + 1.6 * st) * D.take;
  e.y = e.baseY = rnd(minY, maxY * 0.92); var sz = sizeFor(e.y); e.h = sz.h * 1.0; e.w = e.h * HAM.w / HAM.h;
  e.x = fromX !== undefined ? fromX : (dir > 0 ? -e.w : W + e.w); e.dir = dir;
  e.tx = rnd(W * 0.15, W * 0.85); e.ty = rnd(minY, maxY * 0.9); e.wait = 0.3;
  G.ents.push(e); return e;
}
function entTop(e) { return e.y - e.lift - e.bob - e.h + e.zz; }
function countEnts(mut, onlyAlive) { var n = 0; for (var i = 0; i < G.ents.length; i++) { var e = G.ents[i]; if (e.state === 0 && e.mut === mut && !e.mini) n++; } return n; }
function updEnt(e, dt) {
  e.flash = Math.max(0, e.flash - dt);
  if (e.state === 1) { // falling away after a hit
    e.hitT += dt; e.vy += H * 2.2 * dt; e.oy += e.vy * dt; e.ox += e.vx * dt; e.rot += e.spin * dt;
    return e.hitT > 0.8;
  }
  e.t += dt;
  if (!e.mut) {
    e.x += e.dir * e.speed * dt;
    e.y = clamp(e.baseY + Math.sin(G.mode === 'menu' ? e.t : time * e.wobF + e.phase) * e.wobA, minY, maxY);
    var sz = sizeFor(e.y); e.h = sz.h * (e.mini ? 0.7 : 1); e.w = e.h * HAM.w / HAM.h; e.dep = sz.t;
    var cyc = e.t * (5 + e.speed / W * 14) + e.phase; e.tilt = Math.sin(cyc) * 0.08; e.bob = Math.abs(Math.sin(cyc)) * e.h * 0.035;
    if (!e.pending && ((e.dir > 0 && e.x > W + e.w) || (e.dir < 0 && e.x < -e.w))) {
      if (!e.safe && G.mode === 'play') loseLife();
      return true;
    }
    return false;
  }
  // mutants stay on screen, roam, and attack the gun
  if (e.stun > 0) { e.stun -= dt; }
  else {
    var spd = e.speed * (hasP(e, 10) ? 1 + (1 - e.hp / e.maxHp) * 0.9 : 1), dx = e.tx - e.x, dy = e.ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 14) { e.wait -= dt; if (e.wait <= 0) { e.tx = rnd(W * 0.1, W * 0.9); e.ty = rnd(minY, maxY * 0.92); e.wait = rnd(0.25, 1.0) * (hasP(e, 4) ? 0.4 : 1); } }
    else { var m = Math.min(d, spd * dt); e.x += dx / d * m; e.y += dy / d * m; if (Math.abs(dx) > 8) e.dir = dx > 0 ? 1 : -1; }
  }
  var sz2 = sizeFor(e.y); e.h = sz2.h * 1.0; e.w = e.h * HAM.w / HAM.h; e.dep = sz2.t;
  e.tilt = Math.sin(e.t * 6 + e.phase) * 0.07; e.bob = Math.abs(Math.sin(e.t * 6 + e.phase)) * e.h * 0.03;
  e.lift = hasP(e, 6) ? H * 0.1 + Math.sin(e.t * 2.4 + e.phase) * H * 0.02 : 0;
  e.zz = hasP(e, 4) ? Math.sin(e.t * 5 + e.phase) * H * 0.035 : 0;
  e.gh = hasP(e, 7) ? 0.5 + 0.5 * Math.sin(e.t * 1.8 + e.phase) : 1;
  if (hasP(e, 8)) { e.healT -= dt; if (e.healT <= 0) { e.healT = 1; for (var i = 0; i < G.ents.length; i++) { var o = G.ents[i]; if (o !== e && o.mut && o.state === 0 && o.hp < o.maxHp && Math.abs(o.x - e.x) < W * 0.3) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.12); emit(o.x, entTop(o) + o.h * 0.4, 0, -50, 0.7, 4, '#4be38a', 1, -30, 1); } } } }
  if (G.mode === 'play' || G.mode === 'boss') {
    if (e.charge > 0) { e.charge -= dt; if (e.charge <= 0) mutantShoot(e); }
    else { e.atkT -= dt; if (e.atkT <= 0) { e.charge = 0.9; e.atkT = e.atkP; sfx('warn'); } }
  }
  return false;
}
function mutantShoot(e) {
  var x = e.x, y = entTop(e) + e.h * 0.4;
  spawnEProj('spit', x, y, gunX, gunY - gunH * 0.5, H * 0.46, e.dmg, 0, '#7dff7a', 0.9);
  sfx('spit');
}

// ---------- enemy projectiles (can be shot down) ----------
function spawnEProj(type, x, y, tx, ty, speed, dmg, jam, col, size) {
  var dx = tx - x, dy = ty - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
  G.eprojs.push({ type: type, x: x, y: y, vx: dx / d * speed, vy: dy / d * speed, r: clamp(Math.min(W, H) * 0.034, 13, 26) * (size || 1), dmg: dmg, jam: jam, col: col, alive: true, life: 7, spin: 0, pending: 0 });
}
function destroyEProj(p, shot) {
  p.alive = false;
  if (shot) { burst(p.x, p.y, p.col, 14, 0.8); sfx('pop'); addCoinsSmall(p.x, p.y); score(25); }
}
function addCoinsSmall(x, y) { if (G.mode === 'boss') { addCoins(1); } }
function updEProjs(dt) {
  var tx = gunX, ty = gunY - gunH * 0.5, i;
  for (i = G.eprojs.length - 1; i >= 0; i--) {
    var p = G.eprojs[i];
    if (!p.alive || p.life <= 0) { G.eprojs.splice(i, 1); continue; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 8;
    if (p.pending > 0) continue;
    var dx = p.x - tx, dy = p.y - ty;
    if (dx * dx + dy * dy < Math.pow(gunH * 0.4, 2)) { p.alive = false; hurtGun(p.dmg, p.jam, p.x, p.y, p.col); G.eprojs.splice(i, 1); }
  }
}

// ---------- the player's gun ----------
function gunHPmax(id) { return GUNS[id].hp; }
function workingGun() { for (var i = 0; i < S.owned.length; i++) if (G.gunHP[S.owned[i]] > 0) return true; return false; }
function repairCost(id) {
  var miss = GUNS[id].hp - (G.gunHP[id] === undefined ? GUNS[id].hp : G.gunHP[id]);
  if (miss <= 0) return 0;
  return Math.ceil(miss * 0.35 + (G.gunHP[id] <= 0 ? GUNS[id].price * 0.1 : 0));
}
function repairGun(id) {
  var c = repairCost(id); if (c <= 0 || S.coins < c) return false;
  S.coins -= c; G.gunHP[id] = GUNS[id].hp; dirty = true; hudDirty = true; return true;
}
function canAffordAnyRepair() { for (var i = 0; i < S.owned.length; i++) { var id = S.owned[i]; if (S.coins >= repairCost(id) && repairCost(id) > 0) return true; } return false; }
function swapGun(id) {
  if (id === G.gun || S.owned.indexOf(id) < 0) return 'no';
  if (G.mode === 'play' || G.mode === 'boss') {
    if (G.swapCd > 0) return 'cooldown';
    if (G.gunHP[id] <= 0) return 'broken';
    G.swapCd = 3;
  } else if (G.gunHP[id] <= 0 && G.mode !== 'menu') return 'broken';
  G.gun = id; S.equipped = id; G.spin = 0; dirty = true; sfx('swap'); return 'ok';
}
function hurtGun(dmg, jam, x, y, col) {
  var hp = G.gunHP[G.gun]; if (hp <= 0) return;
  hp = Math.max(0, hp - dmg); G.gunHP[G.gun] = hp; G.hurtT = 0.5; G.shake = Math.max(G.shake, 0.4); G.regenT = 3;
  burst(gunX, gunY - gunH * 0.55, col || '#ffd23f', 14, 0.9); sfx('gunHit');
  if (jam > 0 && hp > 0) { G.jam = Math.max(G.jam, jam); G.swapCd = Math.max(G.swapCd, 3); sfx('jam'); setBanner('GUN JAMMED', 'Switch guns in 3 seconds', '#ffd23f', 1.2); }
  if (hp <= 0) breakGun();
}
function breakGun() {
  G.swapCd = 3; G.hold = false; sfx('gunBreak'); G.shake = 1; G.flash = 0.6;
  burst(gunX, gunY - gunH * 0.5, '#ffd23f', 40, 1.4);
  setBanner('GUN BROKEN', workingGun() ? 'Switch to another gun in 3 seconds' : 'No working gun left', '#ff5a5a', 2.2);
  if (!workingGun()) {
    if (!canAffordAnyRepair()) { gameOver('guns'); return; }
    G.needRepair = 2.2;
  }
}
function setBanner(text, sub, col, t) { G.banner.text = text; G.banner.sub = sub || ''; G.banner.col = col || '#fff'; G.banner.t = t || 1.5; G.banner.max = t || 1.5; }
function loseLife() {
  G.lives--; G.combo = 0; G.shake = Math.max(G.shake, 0.5); G.flash = 0.5; hudDirty = true; sfx('life');
  if (G.lives <= 0) gameOver('lives');
}
function score(n) { G.score += Math.round(n * (1 + Math.min(G.combo, 20) * 0.1)); hudDirty = true; }

// aiming and firing
var K_NONE = 0, K_PROJ = 1, K_ENT = 2, K_BOSS = 3, K_DECOY = 4;
function pickTarget(x, y, touch) {
  var pad = touch ? 12 : 5, i, best = null, bd = 1e9;
  for (i = 0; i < G.eprojs.length; i++) { var p = G.eprojs[i]; if (!p.alive) continue; var dx = p.x - x, dy = p.y - y, rr = p.r + pad + 4; if (dx * dx + dy * dy < rr * rr && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = { k: K_PROJ, ref: p }; } }
  if (best) return best;
  var b = G.boss;
  if (b && !b.dead && G.mode === 'boss') {
    var wx = b.x + (BL.gem[0] - 0.5) * b.w, wy = b.y + (BL.gem[1] - 0.5) * b.h, wr = Math.max(0.13 * b.w, 18) + pad;
    if ((wx - x) * (wx - x) + (wy - y) * (wy - y) < wr * wr || bossBody(b, x, y, pad)) return { k: K_BOSS, ref: b, ox: (x - b.x) / b.w, oy: (y - b.y) / b.h };
    for (i = 0; i < b.decoys.length; i++) { var dd = b.decoys[i]; if (dd.alive && bossBody(dd, x, y, pad)) return { k: K_DECOY, ref: dd }; }
  }
  var offs = [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad], [pad, pad], [-pad, -pad], [pad, -pad], [-pad, pad]], bestE = null, by = -1;
  for (i = 0; i < G.ents.length; i++) {
    var e = G.ents[i]; if (e.state !== 0) continue;
    if (e.mut && hasP(e, 7) && e.gh < 0.3) continue;
    var top = entTop(e), left = e.x - e.w / 2, hit = null;
    for (var o = 0; o < offs.length; o++) {
      var u = (x + offs[o][0] - left) / e.w, v = (y + offs[o][1] - top) / e.h;
      if (u >= 0 && v >= 0 && u < 1 && v < 1 && HAM.mask[((v * HAM.h) | 0) * HAM.w + ((u * HAM.w) | 0)]) { hit = [(x - left) / e.w, (y - top) / e.h]; break; }
    }
    if (hit && (e.y + (e.mut ? 1000 : 0)) > by) { by = e.y + (e.mut ? 1000 : 0); bestE = { k: K_ENT, ref: e, u: hit[0], v: hit[1] }; }
  }
  return bestE;
}
function bossBody(b, x, y, pad) { var rx = b.w * 0.4 + pad, ry = b.h * 0.5 + pad, dx = (x - b.x) / rx, dy = (y - b.y) / ry; return dx * dx + dy * dy < 1; }
function tryFire() {
  if (G.mode !== 'play' && G.mode !== 'boss') return false;
  var gn = GUNS[G.gun];
  if (G.gunHP[G.gun] <= 0 || G.jam > 0 || G.fireCd > 0) return false;
  var rate = gn.spin ? lerp(3.5, gn.rate, G.spin) : gn.rate;
  G.fireCd = 1 / rate; G.shots++; G.recoil = 1; G.muzzle = 0.08;
  var vol = { hit: false }, touch = G.touch, n = gn.pellets, i, L = 88 * gunScale, sx = gunX + Math.sin(G.ang) * L, sy = gunY - Math.cos(G.ang) * L;
  var sp = gn.spread * Math.min(W, H) * 2;
  for (i = 0; i < n; i++) {
    var ax = G.aimX, ay = G.aimY;
    if (n > 1) { var a = rnd(0, TAU), r = Math.sqrt(Math.random()) * sp; ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
    var tg = pickTarget(ax, ay, touch), pr = { sx: sx, sy: sy, x: ax, y: ay, t: 0, dur: clamp(Math.hypot(ax - sx, ay - sy) / (W * 5), 0.08, 0.2), gun: G.gun, kind: tg ? tg.k : 0, ref: tg ? tg.ref : null,
      u: tg ? tg.u : 0, v: tg ? tg.v : 0, ox: tg ? tg.ox : 0, oy: tg ? tg.oy : 0, col: gn.balls[(G.shots + i) % gn.balls.length], vol: vol, dmg: gn.dmg };
    if (tg && tg.k === K_ENT) {
      var e = tg.ref;
      if (e.mut && hasP(e, 2) && Math.random() < 0.3) { pr.kind = 0; pr.dodge = e; e.dashT = 0.3; var dd = e.dir * (Math.random() < 0.5 ? 1 : -1); e.tx = clamp(e.x + dd * W * 0.2, W * 0.08, W * 0.92); e.wait = 0.05; floatText(e.x, entTop(e), 'DODGE', '#35e6ff', 0); }
      else e.pending++;
    }
    if (tg && tg.k === K_PROJ) tg.ref.pending++;
    G.pprojs.push(pr);
  }
  sfx('shoot', G.gun);
  hudDirty = true;
  return true;
}
function land(p) {
  var gn = GUNS[p.gun], hit = false, lx = p.x, ly = p.y, e, b;
  if (p.kind === K_PROJ) { var pj = p.ref; pj.pending = Math.max(0, pj.pending - 1); if (pj.alive) { lx = pj.x; ly = pj.y; destroyEProj(pj, true); hit = true; } }
  else if (p.kind === K_ENT) {
    e = p.ref; e.pending = Math.max(0, e.pending - 1);
    if (e.state === 0) { lx = e.x - e.w / 2 + p.u * e.w; ly = entTop(e) + p.v * e.h; hit = true; hitEnt(e, p.dmg, lx, ly, p); }
  } else if (p.kind === K_BOSS) {
    b = p.ref; if (!b.dead) { lx = b.x + p.ox * b.w; ly = b.y + p.oy * b.h; hit = true; var wx = b.x + (BL.gem[0] - 0.5) * b.w, wy = b.y + (BL.gem[1] - 0.5) * b.h, wr = Math.max(0.13 * b.w, 18);
      hitBoss(b, p.dmg, (lx - wx) * (lx - wx) + (ly - wy) * (ly - wy) < wr * wr, lx, ly, gn.pierce, p); }
  } else if (p.kind === K_DECOY) {
    var d = p.ref; if (d.alive) { d.alive = false; hit = true; lx = d.x; ly = d.y; burst(d.x, d.y, '#8fd0ff', 22, 1); sfx('pop'); floatText(d.x, d.y, 'DECOY', '#8fd0ff', 0); }
  }
  if (hit) {
    if (!p.vol.hit) { p.vol.hit = true; G.hits++; hudDirty = true; }
    burst(lx, ly, p.col, 10, 0.7); sfx('tick');
  } else if (!p.dodge) {
    var rr = Math.max(7, W * 0.013);
    if (ly > horizonY && G.decals.length < Q.decals * 2) G.decals.push({ x: lx, y: ly, col: p.col, age: 0, r: rr, b: [rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)] });
    burst(lx, ly, p.col, 8, 0.55);
  }
  if (gn.splash > 0) splash(lx, ly, gn, p, hit);
  if (G.pprojs.length < 2) { /* nothing */ }
}
function splash(x, y, gn, p, hit) {
  var R = gn.splash * Math.min(W, H) * 2.4, i, dmg = p.dmg * 0.55;
  ring(x, y, R, p.col);
  for (i = 0; i < G.ents.length; i++) { var e = G.ents[i]; if (e.state !== 0 || (hit && p.ref === e)) continue; var cx = e.x, cy = entTop(e) + e.h * 0.5; if ((cx - x) * (cx - x) + (cy - y) * (cy - y) < R * R) hitEnt(e, dmg, cx, cy, p); }
  for (i = 0; i < G.eprojs.length; i++) { var q = G.eprojs[i]; if (q.alive && (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) < R * R) destroyEProj(q, true); }
  var b = G.boss;
  if (b && !b.dead && G.mode === 'boss' && !(hit && p.ref === b) && (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < (R + b.w * 0.3) * (R + b.w * 0.3)) hitBoss(b, dmg, false, x, y, gn.pierce, p);
  if (b) for (i = 0; i < b.decoys.length; i++) { var dd = b.decoys[i]; if (dd.alive && (dd.x - x) * (dd.x - x) + (dd.y - y) * (dd.y - y) < R * R) { dd.alive = false; burst(dd.x, dd.y, '#8fd0ff', 18, 1); } }
}
function ring(x, y, r, col) { G.rings = G.rings || []; if (G.rings.length < 10) G.rings.push({ x: x, y: y, r: r, t: 0, col: col }); }

function hitEnt(e, dmg, x, y, p) {
  if (e.state !== 0) return;
  var pierce = p && GUNS[p.gun] && GUNS[p.gun].pierce;
  if (e.shield > 0) { e.shield = 0; sfx('shield'); burst(x, y, '#8fd0ff', 16, 1); floatText(x, y - 10, 'SHIELD', '#8fd0ff', 0); if (!pierce) return; }
  e.hp -= dmg; e.flash = 0.1;
  if (e.hp <= 0) { killEnt(e, x, y, p); return; }
  sfx('mutHit'); burst(x, y, '#ffffff', 6, 0.6);
}
function killEnt(e, x, y, p) {
  e.state = 1; e.hitT = 0; e.vx = e.dir * e.speed * 0.5; e.vy = -H * 0.5; e.spin = e.dir * rnd(3, 6); e.pending = 0;
  e.layer = makeSplat(p ? p.col : '#ff3d8b');
  var cx = e.x, cy = entTop(e) + e.h * 0.4;
  burst(cx, cy, p ? p.col : '#fff', e.mut ? 30 : 20, 1.05);
  if (e.mut) sfx('mutKill'); else sfx('kill');
  if (e.mini || e.summoned) { score(20); }
  else {
    var mult = 1 + Math.min(G.combo, 30) * 0.01, c = Math.round((e.mut ? coinsMutant(G.stage) : coinsNormal(G.stage)) * mult);
    addCoins(c); G.combo++; G.comboT = 4; G.kills++;
    G.lk += e.mut ? 2 : 1;
    score(e.mut ? 250 : Math.round(50 + 100 * (1 - e.dep)));
    if (e.mut) { floatText(cx, cy - 6, '+' + c, '#ffd23f', 1); coinBurst(cx, cy, 14); }
    else floatText(cx, cy - 6, '+' + c, '#ffd23f', 0);
  }
  if (e.mut && hasP(e, 9)) { for (var i = 0; i < 2; i++) { var m = spawnNormal(e.x + (i ? 1 : -1) * e.w * 0.4, true); m.baseY = clamp(e.y + rnd(-10, 10), minY, maxY); m.y = m.baseY; m.dir = i ? 1 : -1; m.safe = true; } }
  hudDirty = true;
}

// ---------- the boss ----------
function makeBoss(k) {
  var v = bossVariant(k), bh = clamp(Math.min(H * 0.44, W * 0.62), 110, 360), sc = bh / v.bh;
  var b = { k: k, v: v, sc: sc, w: v.bw * sc, h: v.bh * sc, x: W / 2, y: -bh, wx: W / 2, wy: H * 0.34, wpT: 1.5, hp: 0, maxHp: 0, shield: 0, shieldT: 0, stun: 0, flash: 0, atk: null, atkCd: 2.6, lastAtk: '',
    alpha: 1, phase: 0, decoys: [], wsCd: 0, rage: false, t: 0, tilt: 0, dead: false, sMul: 1 + 0.07 * (k - 1), aMul: 1 + 0.12 * (k - 1), squash: 0, wing: k >= 6, entering: true, forceAtk: '', ringT: 0 };
  b.maxHp = b.hp = Math.round(bossHp(k) * DIFFS[S.diff].boss);
  return b;
}
function bossBounds(b) {
  var xr = b.w * 0.45 + 6, top = hudBot + 34 + b.h * 0.5, bot = (b.wing ? H * 0.64 : H * 0.54);
  return { x0: xr, x1: W - xr, y0: top, y1: Math.max(top + 10, bot) };
}
function hitBoss(b, dmg, weak, x, y, pierce, p) {
  if (b.dead) return;
  var d = dmg * (weak ? 2.2 : 1);
  b.flash = 0.1;
  if (b.shield > 0) {
    var ab = pierce ? d * 0.5 : d; b.shield -= ab; sfx('bshield'); burst(x, y, '#8fd0ff', 8, 0.8);
    if (b.shield <= 0) { b.shield = 0; b.stun = Math.max(b.stun, 1.0); sfx('phase'); burst(b.x, b.y, '#8fd0ff', 40, 1.4); floatText(b.x, b.y - b.h * 0.5, 'SHIELD BROKEN', '#8fd0ff', 1); }
    if (!pierce) return;
    d *= 0.5;
  }
  b.hp -= d; if (b.atk) b.atk.dmgTaken += d; score(d * 0.5);
  if (weak) {
    sfx('bweak'); floatText(x, y - 14, 'WEAK SPOT', '#ffd23f', 0); burst(x, y, '#ffd23f', 12, 1);
    if (b.wsCd <= 0) { b.stun = Math.max(b.stun, 0.45); b.wsCd = 2.2; }
    if (b.atk && b.atk.type === 'heal') b.atk.interrupted = true;
  } else sfx('bhit');
  var r = b.hp / b.maxHp;
  if (b.phase === 0 && r < 0.66) bossPhase(b, 1); else if (b.phase === 1 && r < 0.33) bossPhase(b, 2);
  if (b.k >= 10 && !b.rage && r < 0.25) { b.rage = true; setBanner('RAGE MODE', '', '#ff3b3b', 1.6); sfx('phase'); }
  if (b.hp <= 0) bossDie(b);
}
function bossPhase(b, n) {
  b.phase = n; sfx('phase'); G.shake = 0.8; setBanner('PHASE ' + (n + 1), '', '#ffd23f', 1.4);
  b.forceAtk = b.k >= 3 ? 'shield' : 'goo'; if (b.atk) { b.atk = null; } b.atkCd = 0.3;
}
function chooseAtk(b) {
  if (b.forceAtk) { var f = b.forceAtk; b.forceAtk = ''; return f; }
  var pool = [['goo', 3]], k = b.k;
  if (k >= 2) pool.push(['jam', 2]);
  if (k >= 3 && b.shield <= 0) pool.push(['shield', 1.3]);
  if (k >= 4 && countEnts(true) < 3) pool.push(['summon', 1.3]);
  if (k >= 5) pool.push(['slam', 1.6]);
  if (k >= 7 && !b.decoys.some(function (d) { return d.alive; })) pool.push(['decoys', 1.4]);
  if (k >= 8 && b.hp < b.maxHp * 0.92) pool.push(['heal', 1.2]);
  var tot = 0, i; for (i = 0; i < pool.length; i++) if (pool[i][0] !== b.lastAtk || pool.length === 1) tot += pool[i][1];
  var r = Math.random() * tot;
  for (i = 0; i < pool.length; i++) { if (pool[i][0] === b.lastAtk && pool.length > 1) continue; r -= pool[i][1]; if (r <= 0) return pool[i][0]; }
  return 'goo';
}
function beginAtk(b, type) {
  var a = { type: type, t: 0, tele: 0.7, n: 0, sp: 0, gap: 0.28, done: false, dmgTaken: 0, interrupted: false, chan: 0 };
  switch (type) {
    case 'goo': a.tele = 0.75; a.n = 1 + Math.floor(b.k / 3); break;
    case 'jam': a.tele = 1.0; break;
    case 'shield': a.tele = 0.6; break;
    case 'summon': a.tele = 1.0; break;
    case 'slam': a.tele = 1.6; a.tx = clamp(gunX, b.w * 0.5, W - b.w * 0.5); break;
    case 'decoys': a.tele = 0.8; break;
    case 'heal': a.tele = 0.5; a.chan = 4; break;
  }
  b.atk = a; b.lastAtk = type; sfx('warn');
}
function endAtk(b) {
  var D = DIFFS[S.diff];
  b.atk = null; b.alpha = 1;
  b.atkCd = Math.max(1.8, 4.6 - 0.28 * b.k) * (b.rage ? 0.7 : 1) * D.atk;
  if (b.k >= 9 && Math.random() < (b.rage ? 0.8 : 0.5)) b.atkCd = 0.7;
}
function updAtk(b, dt) {
  var a = b.atk, k = b.k, D = DIFFS[S.diff], tx = gunX, ty = gunY - gunH * 0.5, i;
  a.t += dt;
  switch (a.type) {
    case 'goo':
      if (a.t >= a.tele + a.sp * a.gap && a.sp < a.n) {
        var off = (a.sp - (a.n - 1) / 2) * gunH * 0.45;
        spawnEProj('goo', b.x, b.y + b.h * 0.1, tx + off, ty, H * 0.5 * (1 + 0.05 * k), (8 + 2 * k) * D.take, 0, BOSS_LOOK[k].aura.length ? rgba(BOSS_LOOK[k].aura, 1) : '#7dff7a', 1.15);
        sfx('goo'); a.sp++;
      }
      if (a.sp >= a.n && a.t > a.tele + a.n * a.gap + 0.25) endAtk(b);
      break;
    case 'jam':
      if (!a.done && a.t >= a.tele) { a.done = true; spawnEProj('bolt', b.x, b.y + b.h * 0.1, tx, ty, H * 0.72, (4 + k) * D.take, 1.6 + 0.12 * k, '#fff27a', 1.05); sfx('bolt'); }
      if (a.done && a.t > a.tele + 0.5) endAtk(b);
      break;
    case 'shield':
      if (!a.done && a.t >= a.tele) { a.done = true; b.shield = b.maxHp * 0.1; b.shieldT = 8; sfx('shield'); burst(b.x, b.y, '#8fd0ff', 30, 1.2); }
      if (a.done && a.t > a.tele + 0.3) endAtk(b);
      break;
    case 'summon':
      if (!a.done && a.t >= a.tele) {
        a.done = true; var n = Math.min(2 + Math.floor(k / 4), 4 - countEnts(true));
        for (i = 0; i < n; i++) { var m = spawnMutant(true, i % 2 ? W + 30 : -30); m.hp = m.maxHp *= 0.6; }
        sfx('summon'); burst(b.x, b.y, '#b26bff', 30, 1.1);
      }
      if (a.done && a.t > a.tele + 0.4) endAtk(b);
      break;
    case 'slam':
      if (!a.done) {
        b.alpha = 0.4 + 0.15 * Math.sin(a.t * 18);
        if (a.dmgTaken >= 0.04 * b.maxHp) { a.interrupted = true; a.done = true; b.alpha = 1; b.stun = 1.6; sfx('phase'); floatText(b.x, b.y - b.h * 0.5, 'INTERRUPTED', '#ffd23f', 1); endAtk(b); break; }
        if (a.t >= a.tele) {
          a.done = true; b.alpha = 1; b.x = b.wx = a.tx; b.y = b.wy = gunY - gunH * 1.55; b.squash = 1;
          hurtGun((22 + 5 * k) * D.take, 0, gunX, gunY, '#ff7a3a'); sfx('slam'); G.shake = 1; burst(gunX, gunY, '#ffb02e', 40, 1.5);
          if (G.boss) { var bd = bossBounds(b); b.wy = clamp(H * 0.4, bd.y0, bd.y1); b.wx = W / 2; b.wpT = 0.6; }
        }
      } else if (a.t > a.tele + 0.7) endAtk(b);
      break;
    case 'decoys':
      if (!a.done && a.t >= a.tele) {
        a.done = true; var cnt = k >= 9 ? 3 : 2, bd2 = bossBounds(b);
        for (i = 0; i < cnt; i++) b.decoys.push({ x: b.x, y: b.y, wx: rnd(bd2.x0, bd2.x1), wy: rnd(bd2.y0, bd2.y1), wpT: rnd(1, 2), alive: true, w: b.w, h: b.h, t: rnd(0, 6), life: 14 });
        sfx('summon'); burst(b.x, b.y, '#8fd0ff', 30, 1.2);
      }
      if (a.done && a.t > a.tele + 0.4) endAtk(b);
      break;
    case 'heal':
      if (a.t >= a.tele) {
        b.hp = Math.min(b.maxHp, b.hp + 0.022 * b.maxHp * dt);
        if (Math.random() < dt * 12) emit(b.x + rnd(-b.w * 0.3, b.w * 0.3), b.y + b.h * 0.4, 0, -80, 0.8, 4, '#4be38a', 1, -40, 1);
        if (a.dmgTaken >= 0.06 * b.maxHp) a.interrupted = true;
        if (a.interrupted) { b.stun = 1.2; sfx('phase'); floatText(b.x, b.y - b.h * 0.5, 'HEAL INTERRUPTED', '#ffd23f', 1); endAtk(b); }
        else if (a.t > a.tele + a.chan) endAtk(b);
      }
      break;
  }
}
function updBoss(b, dt) {
  b.t += dt; b.flash = Math.max(0, b.flash - dt); b.wsCd = Math.max(0, b.wsCd - dt); b.squash = Math.max(0, b.squash - dt * 3);
  if (b.shield > 0) { b.shieldT -= dt; if (b.shieldT <= 0) { b.shield = 0; } }
  var bd = bossBounds(b), spd = b.sMul * (b.rage ? 1.35 : 1) * (b.wing ? 1.5 : 1);
  if (b.stun > 0) { b.stun -= dt; spd = 0.15; }
  else if (b.atk && b.atk.type === 'slam' && !b.atk.done) spd = 0.2;
  b.wpT -= dt;
  if (b.wpT <= 0 || (Math.abs(b.wx - b.x) < 14 && Math.abs(b.wy - b.y) < 14)) {
    b.wx = rnd(bd.x0, bd.x1); b.wy = rnd(bd.y0, bd.y1); b.wpT = rnd(1.8, 3.4) / (b.wing ? 1.5 : 1);
  }
  var ease = Math.min(1, dt * 1.5 * spd), ox = b.x;
  b.x += (b.wx - b.x) * ease; b.y += (b.wy - b.y) * ease + Math.sin(b.t * (b.wing ? 3.2 : 2)) * dt * 14;
  b.x = clamp(b.x, bd.x0, bd.x1); b.y = clamp(b.y, bd.y0 - 4, bd.y1 + 4);
  b.tilt += (clamp((b.x - ox) / Math.max(dt, 0.001) / 900, -0.22, 0.22) - b.tilt) * Math.min(1, dt * 6);
  if (!b.atk && b.stun <= 0) { b.atkCd -= dt; if (b.atkCd <= 0) beginAtk(b, chooseAtk(b)); }
  else if (b.atk) updAtk(b, dt);
  for (var i = b.decoys.length - 1; i >= 0; i--) {
    var d = b.decoys[i]; if (!d.alive) { b.decoys.splice(i, 1); continue; }
    d.t += dt; d.life -= dt; if (d.life <= 0) { d.alive = false; continue; }
    d.wpT -= dt; if (d.wpT <= 0) { d.wx = rnd(bd.x0, bd.x1); d.wy = rnd(bd.y0, bd.y1); d.wpT = rnd(1.2, 2.4); }
    d.x += (d.wx - d.x) * Math.min(1, dt * 1.3); d.y += (d.wy - d.y) * Math.min(1, dt * 1.3);
  }
}
function bossDie(b) {
  b.dead = true; b.hp = 0; G.mode = 'defeat'; G.defeat = { t: 0, ph: 0 }; G.hold = false;
  G.eprojs.length = 0; G.pprojs.length = 0; b.decoys.length = 0; G.bossDown = b.k;
  for (var i = 0; i < G.ents.length; i++) if (G.ents[i].state === 0) { burst(G.ents[i].x, entTop(G.ents[i]) + 20, '#fff', 12, 1); }
  G.ents.length = 0;
  musicStop();
}

// ---------- level flow ----------
function newRun(lv0) {
  var D = DIFFS[S.diff], keepCoins = S.coins;
  G = freshG(); G.maxLives = G.lives = D.lives; G.mode = 'play'; G.coinsStart = S.coins;
  S.owned.forEach(function (id) { G.gunHP[id] = GUNS[id].hp; });
  G.gun = S.owned.indexOf(S.equipped) >= 0 ? S.equipped : 0; G.aimX = W / 2; G.aimY = H * 0.5;
  G.touch = false; G.rings = [];
  startLevel(lv0 || 1);
}
function resumeRun() {
  var r = S.run; if (!r) return newRun(1);
  newRun(r.level);
  G.score = r.score || 0; G.kills = r.kills || 0; G.shots = r.shots || 0; G.hits = r.hits || 0;
  G.lives = Math.min(G.maxLives, r.lives || G.maxLives);
  S.owned.forEach(function (id) { G.gunHP[id] = r.gunHP && r.gunHP[id] !== undefined ? r.gunHP[id] : GUNS[id].hp; });
}
function snapshotRun() {
  S.run = { level: G.level, score: G.score, kills: G.kills, shots: G.shots, hits: G.hits, lives: G.lives, gunHP: G.gunHP }; dirty = true;
}
function startLevel(n) {
  G.level = n; G.isBoss = n % 5 === 0; G.lk = 0; G.clearT = 0; G.ents.length = 0; G.eprojs.length = 0; G.pprojs.length = 0; G.shards.length = 0; G.decals.length = 0; G.bossK = 0; G.boss = null;
  hudDirty = true;
  if (G.isBoss) {
    var k = n / 5; G.stage = k - 1; G.bossK = k;
    setClimate(k, true); beginIntro(k);
  } else {
    G.stage = Math.floor(n / 5); G.quota = levelQuota(n); G.spawnT = 0.9; G.mode = 'play';
    setClimate(G.stage, false);
    setBanner('LEVEL ' + n, n % 5 === 1 && n > 1 ? CLIMATES[G.stage].name : '', '#ffffff', 1.4);
    musicPlay('play', G.stage);
    snapshotRun();
  }
}
function beginIntro(k) {
  G.mode = 'intro'; G.intro = 0; G.boss = makeBoss(k); G.boss.y = -G.boss.h; G.boss.entering = true;
  G.hold = false; sfx('bossIntro'); musicStop(); G.shake = 0.7; G.bossTimer = 300; G.ts = 1;
}
function endLevel() {
  var c = coinsLevel(G.stage); addCoins(c);
  G.clearT = 1.2; setBanner('LEVEL CLEAR', '+' + c + ' সততা', '#ffd23f', 1.2); sfx('levelUp');
  for (var i = 0; i < G.ents.length; i++) if (!G.ents[i].mut) G.ents[i].safe = true;
}
function bossResult() {
  var k = G.bossK, bc = coinsBoss(k), lc = coinsLevel(G.stage);
  addCoins(bc + lc);
  S.owned.forEach(function (id) { G.gunHP[id] = GUNS[id].hp; });
  G.lives = G.maxLives; hudDirty = true;
  G.summary = { k: k, boss: bc, level: lc, next: k < 10 ? CLIMATES[k + 1 > 10 ? 10 : k + 1].name : '', power: k < 10 ? POWERS[k] : null };
  G.mode = 'result'; sfx('fanfare');
  if (k >= 10) { addCoins(2000); G.summary.bonus = 2000; }
  var lv = G.level; if (lv > S.bestLevel) S.bestLevel = lv; if (G.score > S.bestScore) S.bestScore = G.score;
  persist();
  uiBossResult();
}
function nextAfterBoss() {
  if (G.bossK >= 10) { victory(); return; }
  G.stage = G.bossK; startLevel(G.level + 1);
}
function gameOver(reason) {
  if (G.mode === 'over' || G.mode === 'win') return;
  var before = S.coins, keep = Math.floor(before / 2), lost = before - keep;
  S.coins = keep; S.run = null; if (G.level > S.bestLevel) S.bestLevel = G.level; if (G.score > S.bestScore) S.bestScore = G.score;
  persist();
  G.reason = reason; G.mode = 'over'; G.hold = false; G.ts = 1; G.summary = { before: before, keep: keep, lost: lost };
  musicStop(); sfx('lose'); duckMusic(1); hudDirty = true;
  uiGameOver();
}
function victory() {
  G.mode = 'win'; S.run = null; if (50 > S.bestLevel) S.bestLevel = 50; if (G.score > S.bestScore) S.bestScore = G.score; persist();
  musicStop(); sfx('fanfare'); uiVictory();
}

// ---------- the main update ----------
function update(dt, raw) {
  var i, e, p;
  G.fireCd = Math.max(0, G.fireCd - dt); G.swapCd = Math.max(0, G.swapCd - dt); G.recoil = Math.max(0, G.recoil - dt * 6); G.hurtT = Math.max(0, G.hurtT - dt);
  G.shake = Math.max(0, G.shake - dt * 1.8); G.flash = Math.max(0, G.flash - dt * 2.2); G.muzzle = Math.max(0, G.muzzle - dt);
  if (G.jam > 0) G.jam = Math.max(0, G.jam - dt);
  if (G.banner.t > 0) G.banner.t -= raw;
  var gn = GUNS[G.gun], firing = G.hold && G.gunHP[G.gun] > 0 && G.jam <= 0 && (G.mode === 'play' || G.mode === 'boss');
  if (gn.spin) { G.spin = clamp(G.spin + (firing ? dt * 0.9 : -dt * 1.6), 0, 1); G.spinA += dt * (1.5 + G.spin * 30 + (firing ? 6 : 0)); }
  var wasHold = G.hold; if (G.hold && (G.mode === 'play' || G.mode === 'boss')) tryFire();
  if (G.mode === 'play' || G.mode === 'boss') {
    var gx = clamp(Math.atan2(G.aimX - gunX, gunY - G.aimY), -0.95, 0.95); G.ang += (gx - G.ang) * Math.min(1, dt * 18);
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; hudDirty = true; } }
    if (G.mode === 'play' || (G.mode === 'boss' && false)) { G.regenT -= dt; if (G.regenT <= 0 && G.gunHP[G.gun] > 0 && G.gunHP[G.gun] < GUNS[G.gun].hp) { G.gunHP[G.gun] = Math.min(GUNS[G.gun].hp, G.gunHP[G.gun] + 1.5 * dt); } }
    if (G.needRepair > 0) { G.needRepair -= dt; if (G.needRepair <= 0) { G.needRepair = 0; if (!workingGun()) { G.paused = true; uiPause(true); } } }
  }
  if (G.mode === 'menu') {
    G.spawnT -= dt; if (G.spawnT <= 0 && G.ents.length < 5) { spawnNormal(); G.spawnT = rnd(1.2, 2.2); }
  } else if (G.mode === 'play') {
    if (G.clearT > 0) { G.clearT -= dt; if (G.clearT <= 0) startLevel(G.level + 1); }
    else {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        var D = DIFFS[S.diff], walkers = 0; for (i = 0; i < G.ents.length; i++) if (!G.ents[i].mut && G.ents[i].state === 0 && !G.ents[i].mini) walkers++;
        if (walkers < maxWalkers(G.level)) {
          var mutCap = Math.min(4, 1 + Math.floor((G.stage + 1) / 2));
          if (G.stage >= 1 && countEnts(true) < mutCap && Math.random() < 0.4) spawnMutant(false); else spawnNormal();
        }
        G.spawnT = spawnGap(G.level) * D.spawn * rnd(0.75, 1.25);
      }
      if (G.lk >= G.quota) endLevel();
    }
  } else if (G.mode === 'intro') {
    G.intro += raw; var t = G.intro, b = G.boss;
    if (t > 1.5 && t < 3.0) { b.y = lerp(-b.h, H * 0.34, easeOut((t - 1.5) / 1.5)); b.x = W / 2; b.wy = H * 0.34; b.wx = W / 2; if (t > 2.9) { G.shake = Math.max(G.shake, 0.6); } }
    if (t >= 3.0 && b.entering) { b.entering = false; b.y = H * 0.34; G.shake = 0.9; sfx('slam'); burst(b.x, b.y + b.h * 0.4, '#ffffff', 30, 1.2); }
    if (t >= 3.9) { G.mode = 'boss'; musicPlay('boss', G.bossK); setBanner('BOSS: NiNishat', BOSS_TITLES[G.bossK], '#ff5a5a', 1.6); }
  } else if (G.mode === 'boss') {
    var bs = G.boss;
    G.bossTimer -= dt;
    if (G.bossTimer <= 0) { gameOver('time'); return; }
    updBoss(bs, dt); if (G.mode !== 'boss') { /* died */ }
    updEProjs(dt);
  } else if (G.mode === 'defeat') {
    var df = G.defeat; df.t += raw;
    if (df.ph === 0) { G.ts = 0; if (df.t > 0.45) { df.ph = 1; G.ts = 0.28; G.flash = 1; sfx('bossDie'); G.shake = 1; shatterBoss(); coinBurst(G.boss.x, G.boss.y, 40); } }
    else if (df.ph === 1 && df.t > 2.1) { df.ph = 2; G.ts = 1; bossResult(); }
  }
  // entities
  for (i = G.ents.length - 1; i >= 0; i--) { e = G.ents[i]; if (updEnt(e, dt)) G.ents.splice(i, 1); }
  if (G.mode === 'play') updEProjs(dt);
  for (i = G.pprojs.length - 1; i >= 0; i--) { p = G.pprojs[i]; p.t += dt; if (p.t >= p.dur) { G.pprojs.splice(i, 1); land(p); } }
  for (i = G.shards.length - 1; i >= 0; i--) { var s = G.shards[i]; s.vy += H * 1.4 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; s.age += dt; if (s.age > 2.2) G.shards.splice(i, 1); }
  // particles, floats, decals, rings
  for (i = 0; i < pn;) {
    var q = P[i]; q.age += dt;
    if (q.age >= q.life) { var l = P[pn - 1]; P[pn - 1] = q; P[i] = l; pn--; continue; }
    q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; i++;
  }
  for (i = 0; i < fn;) { var f = F[i]; f.age += dt; if (f.age > 0.95) { var lf = F[fn - 1]; F[fn - 1] = f; F[i] = lf; fn--; continue; } i++; }
  for (i = G.decals.length - 1; i >= 0; i--) { G.decals[i].age += dt; if (G.decals[i].age > 6 || G.decals.length > Q.decals) G.decals.splice(i, 1); }
  if (G.rings) for (i = G.rings.length - 1; i >= 0; i--) { G.rings[i].t += dt * 3.2; if (G.rings[i].t >= 1) G.rings.splice(i, 1); }
  saveT += raw; if (dirty && saveT > 3) { saveT = 0; persist(); }
}
function shatterBoss() {
  var b = G.boss, v = b.v, cols = 6, rows = 7, cw = v.w / cols, ch = v.h / rows, x0 = b.x - (v.padX + v.bw / 2) * b.sc, y0 = b.y - (v.padT + v.bh / 2) * b.sc;
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
    var sx = c * cw, sy = r * ch, cx = x0 + (sx + cw / 2) * b.sc, cy = y0 + (sy + ch / 2) * b.sc;
    G.shards.push({ sx: sx, sy: sy, sw: cw, sh: ch, x: cx, y: cy, vx: (cx - b.x) * rnd(1.2, 2.6), vy: (cy - b.y) * rnd(1.2, 2.4) - H * 0.35, rot: 0, vr: rnd(-4, 4), age: 0, sc: b.sc });
  }
  b.hidden = true;
}
