// ---------- drawing ----------
var bgTop = ['#000', '#000', '#000', '#000'], bgTopFor = -1, whiteCache = {}, redGun = [];
function whiteOf(key, src) { if (!whiteCache[key]) whiteCache[key] = silhouette(src, '#ffffff'); return whiteCache[key]; }
function fontDisp(px, w) { return (w || 700) + ' ' + Math.round(px) + 'px "Pixelify Sans","Courier New",monospace'; }
function fontBn(px) { return '700 ' + Math.round(px) + 'px "Noto Sans Bengali","Hind Siliguri","Nirmala UI",sans-serif'; }
function textOut(s, x, y, fill, out, lw) { ctx.lineJoin = 'round'; ctx.lineWidth = lw || 4; ctx.strokeStyle = out || '#06101a'; ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y); }

function draw() {
  var i, e, b = G.boss, sx = 0, sy = 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (G.shake > 0) { var m = G.shake * Math.min(W, H) * 0.018; sx = rnd(-m, m); sy = rnd(-m, m); ctx.translate(sx, sy); }
  var bg = BGS[S.bg] || BGS[0];
  if (bgTopFor !== S.bg) { var d = bg.scene.getContext('2d').getImageData(0, 0, 1, 1).data; bgTop = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; bgTopFor = S.bg; }
  ctx.fillStyle = bgTop; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.drawImage(bg.scene, view.x, view.y, SW * view.s, SH * view.s);
  bg.anim(ctx, time, view);
  if (WX.lv.aurora > 0.03) drawEclipse();
  if (WX.lv.meteor > 0.03) drawMeteors();
  if (WX.lv.fog > 0.03) drawFog();
  // paint splats on the ground
  for (i = 0; i < G.decals.length; i++) drawDecal(G.decals[i]);
  // walkers and mutants, back to front
  G.ents.sort(function (a, c) { return a.y - c.y; });
  for (i = 0; i < G.ents.length; i++) drawEnt(G.ents[i]);
  if (b && !b.hidden && (G.mode === 'boss' || G.mode === 'intro' || G.mode === 'defeat')) drawBoss(b);
  for (i = 0; i < G.shards.length; i++) drawShard(G.shards[i]);
  for (i = 0; i < G.eprojs.length; i++) drawEProj(G.eprojs[i]);
  for (i = 0; i < G.pprojs.length; i++) drawPProj(G.pprojs[i]);
  drawRings(); drawParticles(); drawFloats();
  drawWeatherFront();
  if (G.mode !== 'menu') drawGun();
  drawHudCanvas();
  if (G.mode === 'intro') drawIntro();
  if (G.mode === 'defeat') drawDefeat();
  drawBanner();
  if (!G.touch && (G.mode === 'play' || G.mode === 'boss') && !G.paused) drawCross();
  if (G.flash > 0.01) { ctx.globalAlpha = Math.min(1, G.flash) * 0.55; ctx.fillStyle = G.mode === 'defeat' || G.mode === 'result' ? '#ffffff' : '#ff3b3b'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.globalAlpha = 1; }
  if (WX.flash > 0.01) { ctx.globalAlpha = WX.flash * 0.55; ctx.fillStyle = '#eaf2ff'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.globalAlpha = 1; }
  if (WX.glActive > 0 && WX.lv.glitch > 0.05) drawGlitchSlice();
  // hurt vignette when the gun is low
  var hp = G.gunHP[G.gun], mx = GUNS[G.gun].hp;
  if ((G.mode === 'play' || G.mode === 'boss') && hp > 0 && hp / mx < 0.3) { ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 6); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(8, W * 0.02); ctx.strokeRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

function drawDecal(d) {
  var a = d.age > 4.5 ? (6 - d.age) / 1.5 : 1, r = d.r, i; ctx.globalAlpha = clamp(a, 0, 1) * 0.9; ctx.fillStyle = d.col;
  ctx.fillRect(Math.round(d.x - r), Math.round(d.y - r * 0.55), Math.round(r * 2), Math.round(r * 1.1));
  for (i = 0; i < 3; i++) ctx.fillRect(Math.round(d.x + d.b[i * 2] * r * 1.7 - r * 0.25), Math.round(d.y + d.b[i * 2 + 1] * r * 0.9 - r * 0.2), Math.round(r * 0.5), Math.round(r * 0.4));
  ctx.globalAlpha = 1;
}

function drawEnt(e) {
  var feet = e.y - e.lift - e.bob + e.zz + e.oy, cx = e.x + e.ox, w = e.w, h = e.h, mut = e.mut, col = '#fff', pr = 0, a = 1;
  if (mut) { pr = mutPrimary(e); col = POWERS[pr] ? POWERS[pr].col : '#fff'; }
  if (e.state === 1) a = clamp(1 - (e.hitT - 0.4) / 0.4, 0, 1);
  // shadow
  if (e.state === 0) { ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.zz * 0 + 2 + e.lift * 0.1, w * 0.36, h * 0.07, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = a * (mut ? e.gh : 1);
  if (mut && hasP(e, 6) && e.state === 0) drawWings(ctx, cx, feet - h * 0.5, w * 0.95, e.t * 14 + e.phase, 'rgba(255,255,255,0.9)', 'rgba(190,225,255,0.85)');
  ctx.save();
  ctx.translate(cx, feet - h / 2); ctx.rotate((e.state === 1 ? e.rot : e.tilt)); if (e.dir < 0 && !e.mut) { /* faces the way it walks */ }
  if (mut) { // coloured outline marks an advanced Hamim
    var o = Math.max(2, Math.round(h / 42)), s = hamAura(col), pul = 0.65 + 0.35 * Math.sin(time * 6 + e.phase), oa = ctx.globalAlpha;
    ctx.globalAlpha = oa * pul;
    ctx.drawImage(s, -w / 2 - o, -h / 2, w, h); ctx.drawImage(s, -w / 2 + o, -h / 2, w, h); ctx.drawImage(s, -w / 2, -h / 2 - o, w, h); ctx.drawImage(s, -w / 2, -h / 2 + o, w, h);
    ctx.globalAlpha = oa;
  }
  ctx.drawImage(HAM.spr, -w / 2, -h / 2, w, h);
  if (e.flash > 0) { var oa2 = ctx.globalAlpha; ctx.globalAlpha = oa2 * clamp(e.flash * 8, 0, 0.85); ctx.drawImage(whiteOf('ham', HAM.spr), -w / 2, -h / 2, w, h); ctx.globalAlpha = oa2; }
  if (e.state === 1 && e.layer) ctx.drawImage(e.layer, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (e.state !== 0) return;
  var top = feet - h;
  if (mut) {
    if (e.shield > 0) { ctx.strokeStyle = 'rgba(143,208,255,' + (0.6 + 0.3 * Math.sin(time * 8)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, feet - h / 2, w * 0.62, h * 0.58, 0, 0, TAU); ctx.stroke(); }
    // health bar and a tag for the main power
    var bw = Math.max(30, w * 0.9), bx = cx - bw / 2, by = top - 9;
    ctx.fillStyle = 'rgba(6,16,26,0.85)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7); ctx.fillStyle = col; ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 5);
    if (e.charge > 0) { // telegraph: a dotted line to the gun and a growing ring
      var k = 1 - e.charge / 0.9; ctx.strokeStyle = 'rgba(255,90,90,' + (0.35 + 0.4 * k) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(cx, top + h * 0.4); ctx.lineTo(gunX, gunY - gunH * 0.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, top + h * 0.4, w * (0.9 - 0.45 * k), 0, TAU); ctx.stroke();
      ctx.font = fontDisp(Math.max(16, h * 0.28)); ctx.textAlign = 'center'; textOut('!', cx, top - 14, '#ff5a5a');
    }
  }
}

function drawBoss(b) {
  var v = b.v, sc = b.sc, i, cx = b.x, cy = b.y, au = BOSS_LOOK[b.k].aura, ca = b.alpha;
  var sqx = 1 + b.squash * 0.18, sqy = 1 - b.squash * 0.14;
  // aura glow
  var gl = (0.22 + 0.1 * Math.sin(b.t * 3)) * (b.rage ? 1.6 : 1);
  if (Q.weather > 0.4) {
    var g = ctx.createRadialGradient(cx, cy, b.w * 0.1, cx, cy, b.w * 0.85); g.addColorStop(0, rgba(au, gl)); g.addColorStop(1, rgba(au, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - b.w, cy - b.w, b.w * 2, b.w * 2);
  }
  // decoys (blue ghosts)
  for (i = 0; i < b.decoys.length; i++) {
    var d = b.decoys[i]; if (!d.alive) continue;
    ctx.save(); ctx.globalAlpha = 0.62 + 0.15 * Math.sin(d.t * 8); ctx.translate(d.x, d.y + Math.sin(d.t * 2) * 5);
    ctx.drawImage(v.c, -(v.padX + v.bw / 2) * sc, -(v.padT + v.bh / 2) * sc, v.w * sc, v.h * sc);
    ctx.globalAlpha = 0.28; ctx.drawImage(whiteOf('b' + b.k, v.c), -(v.padX + v.bw / 2) * sc, -(v.padT + v.bh / 2) * sc, v.w * sc, v.h * sc);
    ctx.restore();
  }
  // wings on the later bosses
  if (b.wing) { var wc = rgba(au, 0.9), wc2 = rgba(au, 0.5); drawWings(ctx, cx, cy - b.h * 0.05, b.w * 0.95, b.t * (b.rage ? 12 : 7), wc, wc2); }
  ctx.save(); ctx.globalAlpha = ca; ctx.translate(cx, cy + Math.sin(b.t * 2) * 3); ctx.rotate(b.tilt); ctx.scale(sqx, sqy);
  var dx = -(v.padX + v.bw / 2) * sc, dy = -(v.padT + v.bh / 2) * sc, dw = v.w * sc, dh = v.h * sc;
  ctx.drawImage(v.c, dx, dy, dw, dh);
  if (b.flash > 0) { ctx.globalAlpha = ca * clamp(b.flash * 9, 0, 0.8); ctx.drawImage(whiteOf('b' + b.k, v.c), dx, dy, dw, dh); ctx.globalAlpha = ca; }
  if (b.stun > 0) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(b.t * 30); ctx.drawImage(whiteOf('b' + b.k, v.c), dx, dy, dw, dh); ctx.globalAlpha = ca; }
  // damage cracks as health falls
  var hurt = 1 - b.hp / b.maxHp, nseg = Math.floor(hurt * v.cracks.length * 1.05);
  if (nseg > 0) {
    ctx.strokeStyle = 'rgba(20,6,30,0.85)'; ctx.lineWidth = Math.max(1.5, sc * 1.4); ctx.beginPath();
    for (i = 0; i < nseg && i < v.cracks.length; i++) { var s = v.cracks[i]; ctx.moveTo(dx + s[0] * sc, dy + s[1] * sc); ctx.lineTo(dx + s[2] * sc, dy + s[3] * sc); }
    ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // weak spot: pulsing gem ring
  var wx = cx + (BL.gem[0] - 0.5) * b.w, wy = cy + (BL.gem[1] - 0.5) * b.h, wr = Math.max(0.13 * b.w, 18);
  var wp = 0.5 + 0.5 * Math.sin(time * 5);
  ctx.strokeStyle = 'rgba(255,230,90,' + (0.55 + 0.4 * wp) + ')'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -time * 20;
  ctx.beginPath(); ctx.arc(wx, wy, wr * (0.85 + 0.15 * wp), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // shield bubble
  if (b.shield > 0) {
    var sa = clamp(b.shield / (b.maxHp * 0.1), 0.2, 1);
    ctx.strokeStyle = 'rgba(143,208,255,' + (0.5 + 0.4 * Math.sin(time * 9)) * sa + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, b.w * 0.62, b.h * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(143,208,255,' + 0.12 * sa + ')'; ctx.fill();
  }
  // attack telegraphs
  var a = b.atk;
  if (a && a.t < a.tele) {
    var k = a.t / a.tele, flash = 0.5 + 0.5 * Math.sin(a.t * 24), tc = a.type === 'heal' ? '75,227,138' : a.type === 'summon' || a.type === 'decoys' ? '178,107,255' : a.type === 'shield' ? '143,208,255' : '255,70,70';
    ctx.strokeStyle = 'rgba(' + tc + ',' + (0.4 + 0.5 * flash) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, b.w * (0.75 - 0.25 * k), 0, TAU); ctx.stroke();
    if (a.type === 'goo' || a.type === 'jam') { ctx.setLineDash([4, 10]); ctx.strokeStyle = 'rgba(' + tc + ',0.4)'; ctx.beginPath(); ctx.moveTo(cx, cy + b.h * 0.1); ctx.lineTo(gunX, gunY - gunH * 0.5); ctx.stroke(); ctx.setLineDash([]); }
    if (a.type === 'slam') { // the landing spot on the ground
      var r2 = b.w * 0.5 * (0.4 + 0.6 * k); ctx.fillStyle = 'rgba(255,60,60,' + (0.18 + 0.25 * flash) + ')'; ctx.beginPath(); ctx.ellipse(a.tx, gunY - gunH * 0.1, r2, r2 * 0.25, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.beginPath(); ctx.ellipse(a.tx, gunY - gunH * 0.1, r2, r2 * 0.25, 0, 0, TAU); ctx.stroke();
    }
    ctx.font = fontDisp(clamp(b.h * 0.14, 16, 30)); ctx.textAlign = 'center';
    textOut(a.type === 'slam' ? 'SLAM!' : a.type === 'heal' ? 'HEALING' : a.type === 'summon' ? 'SUMMON' : a.type === 'decoys' ? 'CLONES' : a.type === 'shield' ? 'SHIELD' : a.type === 'jam' ? 'JAM BOLT' : 'GOO', cx, cy - b.h * 0.58, 'rgb(' + tc + ')');
  } else if (a && a.type === 'heal') {
    ctx.strokeStyle = 'rgba(75,227,138,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, b.w * 0.6 + Math.sin(time * 8) * 3, 0, TAU); ctx.stroke();
  }
}

function drawShard(s) {
  var b = G.boss; if (!b) return; var v = b.v; ctx.save(); ctx.globalAlpha = clamp(1.8 - s.age, 0, 1); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
  ctx.drawImage(v.c, s.sx, s.sy, s.sw, s.sh, -s.sw * s.sc / 2, -s.sh * s.sc / 2, s.sw * s.sc + 1, s.sh * s.sc + 1);
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawEProj(p) {
  var r = p.r, pu = 1 + 0.1 * Math.sin(time * 14);
  ctx.save(); ctx.translate(p.x, p.y);
  // "shoot me" ring
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.45 * pu, 0, TAU); ctx.stroke();
  if (p.type === 'bolt') {
    ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); for (var i = 0; i < 6; i++) { var a = p.spin + i * TAU / 6; ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.lineTo(Math.cos(a + 0.2) * r * 1.35, Math.sin(a + 0.2) * r * 1.35); } ctx.stroke();
  } else {
    ctx.fillStyle = '#10241a'; ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, TAU); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-r * 0.5, -r * 0.5, r * 0.3, r * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; var a2 = p.spin; ctx.fillRect(Math.cos(a2) * r * 0.35 - 2, Math.sin(a2) * r * 0.35 - 2, 4, 4);
  }
  ctx.restore();
}
function drawPProj(p) {
  var u = clamp(p.t / p.dur, 0, 1), x = lerp(p.sx, p.x, u), y = lerp(p.sy, p.y, u) - Math.sin(u * Math.PI) * H * 0.03, r = Math.max(3, W * 0.012) * (1 - 0.35 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; var tx = lerp(p.sx, p.x, Math.max(0, u - 0.25)), ty = lerp(p.sy, p.y, Math.max(0, u - 0.25)); ctx.fillRect(Math.round(tx - r * 0.5), Math.round(ty - r * 0.5), Math.round(r), Math.round(r));
  ctx.fillStyle = '#10141c'; ctx.fillRect(Math.round(x - r - 1), Math.round(y - r - 1), Math.round(r * 2 + 2), Math.round(r * 2 + 2));
  ctx.fillStyle = p.col; ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(Math.round(x - r * 0.6), Math.round(y - r * 0.6), Math.max(2, Math.round(r * 0.6)), Math.max(2, Math.round(r * 0.6)));
}
function drawRings() {
  if (!G.rings) return;
  for (var i = 0; i < G.rings.length; i++) { var q = G.rings[i]; ctx.globalAlpha = (1 - q.t) * 0.8; ctx.strokeStyle = q.col; ctx.lineWidth = 4 * (1 - q.t) + 1; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * easeOut(q.t), 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawParticles() {
  var i, p, s, a;
  for (i = 0; i < pn; i++) {
    p = P[i]; if (p.add) continue; a = 1 - p.age / p.life; ctx.globalAlpha = a > 1 ? 1 : a; ctx.fillStyle = p.c; s = Math.max(1, Math.round(p.r * (0.5 + a * 0.5)));
    if (p.s === 1) { ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s * 0.4), s * 2, Math.round(s * 0.8) + 1); ctx.fillRect(Math.round(p.x - s * 0.4), Math.round(p.y - s), Math.round(s * 0.8) + 1, s * 2); }
    else ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (i = 0; i < pn; i++) { p = P[i]; if (!p.add) continue; a = 1 - p.age / p.life; ctx.globalAlpha = (a > 1 ? 1 : a) * 0.9; ctx.fillStyle = p.c; s = Math.max(1, Math.round(p.r)); ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawFloats() {
  ctx.textAlign = 'center';
  for (var i = 0; i < fn; i++) {
    var f = F[i], a = 1 - f.age / 0.95; ctx.globalAlpha = clamp(a * 1.6, 0, 1); ctx.font = fontDisp(f.big ? 24 : 16);
    textOut(f.txt, f.x, f.y - f.age * 46, f.c, '#06101a', 4);
  }
  ctx.globalAlpha = 1;
}

// ---------- weather ----------
function drawWeatherFront() {
  var L = WX.lv, i, n, p, arr, k = Math.min(W, H) / 700, t = WX.tint;
  if (t[3] > 0.005) { ctx.fillStyle = 'rgba(' + (t[0] | 0) + ',' + (t[1] | 0) + ',' + (t[2] | 0) + ',' + t[3].toFixed(3) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (L.dark > 0.01) { ctx.fillStyle = 'rgba(2,4,14,' + (L.dark).toFixed(3) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (L.rain > 0.02) {
    arr = WX.pr.rain; n = Math.min(arr.length, Math.floor(WMAX.rain * L.rain * Q.weather)); ctx.strokeStyle = 'rgba(190,220,255,0.55)'; ctx.lineWidth = Math.max(1, 1.5 * k); ctx.beginPath();
    for (i = 0; i < n; i++) { p = arr[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 5 * k, p.y - 15 * k * p.v); } ctx.stroke();
  }
  if (L.snow > 0.02) { arr = WX.pr.snow; n = Math.min(arr.length, Math.floor(WMAX.snow * L.snow * Q.weather)); ctx.fillStyle = '#ffffff'; for (i = 0; i < n; i++) { p = arr[i]; var s = Math.max(2, Math.round(3 * k * p.v)); ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s); } }
  if (L.leaves > 0.02) { arr = WX.pr.leaves; n = Math.min(arr.length, Math.floor(WMAX.leaves * L.leaves * Q.weather)); for (i = 0; i < n; i++) { p = arr[i]; ctx.fillStyle = i % 2 ? '#9be86a' : '#ffd25a'; var ls = Math.max(3, Math.round(5 * k)); ctx.fillRect(Math.round(p.x), Math.round(p.y), ls, Math.max(2, ls - 2 + Math.round(Math.sin(p.a) * 2))); } }
  if (L.sand > 0.02) {
    ctx.fillStyle = 'rgba(225,160,70,' + (0.2 * L.sand).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    arr = WX.pr.sand; n = Math.min(arr.length, Math.floor(WMAX.sand * L.sand * Q.weather)); ctx.strokeStyle = 'rgba(240,200,120,0.55)'; ctx.lineWidth = Math.max(1, 1.5 * k); ctx.beginPath();
    for (i = 0; i < n; i++) { p = arr[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 26 * k * p.v, p.y); } ctx.stroke();
  }
  if (L.ember > 0.02) { arr = WX.pr.ember; n = Math.min(arr.length, Math.floor(WMAX.ember * L.ember * Q.weather)); for (i = 0; i < n; i++) { p = arr[i]; ctx.fillStyle = i % 3 ? '#ff9d2e' : '#ffe27a'; var es = Math.max(2, Math.round(3 * k * p.v)); ctx.fillRect(Math.round(p.x), Math.round(p.y), es, es); } }
}
function drawFog() {
  var L = WX.lv.fog, i, w = W * 0.9;
  for (i = 0; i < 4; i++) {
    var y = horizonY - H * 0.05 + i * H * 0.14, x = ((WX.fogX * (0.6 + i * 0.3)) % (w * 2)) - w;
    var g = ctx.createLinearGradient(0, y, 0, y + H * 0.2); g.addColorStop(0, 'rgba(225,235,245,0)'); g.addColorStop(0.5, 'rgba(225,235,245,' + (0.34 * L).toFixed(3) + ')'); g.addColorStop(1, 'rgba(225,235,245,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w * 2, H * 0.2); ctx.fillRect(x + w * 2, y, w * 2, H * 0.2);
  }
}
function drawEclipse() {
  var L = WX.lv.aurora, r = Math.min(W, H) * 0.14, cx = W * 0.78, cy = horizonY * 0.42 + Math.sin(time * 0.4) * 2;
  ctx.globalAlpha = Math.min(1, L); ctx.fillStyle = '#5a0614'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c4122e'; ctx.beginPath(); ctx.arc(cx - r * 0.12, cy - r * 0.1, r * 0.78, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff3b55'; ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.2, r * 0.5, 0, TAU); ctx.fill();
  if (Q.weather > 0.4) { var g = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.6); g.addColorStop(0, 'rgba(255,40,70,0.35)'); g.addColorStop(1, 'rgba(255,40,70,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6); }
  ctx.globalAlpha = 1;
}
function drawMeteors() {
  for (var i = 0; i < WX.mets.length; i++) { var m = WX.mets[i], k = Math.min(W, H) / 700; ctx.strokeStyle = 'rgba(255,230,200,0.9)'; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + 90 * k, m.y - 57 * k); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(m.x - 3), Math.round(m.y - 3), 7, 7); ctx.fillStyle = '#ff9d2e'; ctx.fillRect(Math.round(m.x - 5), Math.round(m.y - 1), 4, 4); }
}
function drawGlitchSlice() {
  var h = Math.max(10, Math.round(H * 0.06)), y = clamp(Math.round(WX.glY), 0, H - h);
  try { ctx.drawImage(canvas, 0, y * dpr, canvas.width, h * dpr, WX.glDx, y, W, h); } catch (e) {}
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff2d9a'; ctx.fillRect(0, y, W, 2); ctx.fillStyle = '#2df0ff'; ctx.fillRect(0, y + h - 2, W, 2); ctx.globalAlpha = 1;
}

// ---------- the player's gun ----------
function drawGun() {
  var id = G.gun, hp = G.gunHP[id], mx = GUNS[id].hp, broken = hp <= 0, gs = gunScale, rec = G.recoil * 5 * gs, sh = G.hurtT > 0 ? Math.sin(time * 90) * 2 * gs : 0;
  ctx.save(); ctx.translate(Math.round(gunX + sh), Math.round(gunY + rec)); ctx.rotate(broken ? 0.12 : G.ang); ctx.scale(gs, gs); ctx.translate(-32, -96);
  if (broken) ctx.globalAlpha = 0.7;
  gunLiveBack(ctx, id, time, G.spinA);
  ctx.drawImage(GUNART[id], 0, 0);
  gunLiveFront(ctx, id, time);
  if (G.hurtT > 0) { ctx.globalAlpha = clamp(G.hurtT * 2, 0, 0.7); ctx.drawImage(whiteOf('g' + id, GUNART[id]), 0, 0); ctx.globalAlpha = 1; }
  if (broken) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 64, 96); ctx.globalAlpha = 1; }
  if (G.jam > 0) { for (var j = 0; j < 4; j++) R(ctx, 32 + rnd(-12, 12), 8 + rnd(-4, 10), 2, 2, j % 2 ? '#fff27a' : '#ffffff'); }
  if (G.muzzle > 0 && !broken) { var m = G.muzzle / 0.08; ctx.globalAlpha = m; ctx.fillStyle = '#fff6b0'; ctx.fillRect(28, -2, 8, 10); ctx.fillStyle = '#ffd23f'; ctx.fillRect(24, 0, 16, 5); ctx.fillRect(30, -8, 4, 16); ctx.globalAlpha = 1; }
  ctx.restore();
  if (broken && Math.random() < 0.15) emit(gunX + rnd(-20, 20) * gs / 2, gunY - gunH * 0.6, rnd(-10, 10), rnd(-60, -30), 0.9, rnd(4, 8), 'rgba(60,60,70,0.8)', 0, -10, 0);
}

// ---------- on-canvas HUD: gun health, boss bar, level progress ----------
function drawHudCanvas() {
  var mode = G.mode; if (mode === 'menu' || mode === 'boot') return;
  var bw = clamp(W * 0.42, 150, 340), bx = (W - bw) / 2, by = H - 15, id = G.gun, hp = G.gunHP[id], mx = GUNS[id].hp, r = clamp(hp / mx, 0, 1);
  ctx.fillStyle = 'rgba(6,16,26,0.85)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
  ctx.fillStyle = r > 0.5 ? '#4be38a' : r > 0.25 ? '#ffd23f' : '#ff5a5a'; ctx.fillRect(bx, by, bw * r, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx, by, bw * r, 2);
  ctx.font = fontDisp(11, 500); ctx.textAlign = 'center'; textOut(GUNS[id].name.toUpperCase() + '  ' + Math.ceil(hp) + '/' + mx, W / 2, by - 5, '#eaf4ef', '#06101a', 3);
  if (G.swapCd > 0 && (mode === 'play' || mode === 'boss')) { ctx.textAlign = 'center'; ctx.font = fontDisp(13); textOut('SWAP IN ' + G.swapCd.toFixed(1), W / 2, by - 20, '#ffd23f', '#06101a', 3); }
  var top = hudBot + 2;
  if ((mode === 'boss' || mode === 'defeat' || mode === 'intro') && G.boss) {
    var b = G.boss, w2 = clamp(W * 0.78, 200, 720), x2 = (W - w2) / 2, rr = clamp(b.hp / b.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(6,16,26,0.88)'; ctx.fillRect(x2 - 3, top + 14, w2 + 6, 20);
    ctx.fillStyle = '#3a1020'; ctx.fillRect(x2, top + 17, w2, 14);
    var au = BOSS_LOOK[b.k].aura; ctx.fillStyle = rgba(au, 1); ctx.fillRect(x2, top + 17, w2 * rr, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x2, top + 17, w2 * rr, 4);
    if (b.shield > 0) { ctx.fillStyle = 'rgba(143,208,255,0.85)'; ctx.fillRect(x2, top + 29, w2 * clamp(b.shield / (b.maxHp * 0.1), 0, 1) * 0.3, 2); }
    ctx.textAlign = 'left'; ctx.font = fontDisp(15); textOut('NiNishat  ' + BOSS_TITLES[b.k], x2, top + 10, '#fff', '#06101a', 4);
    var tl = Math.max(0, G.bossTimer), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60), low = tl < 30; ctx.textAlign = 'right';
    textOut((mm) + ':' + (ss < 10 ? '0' : '') + ss, x2 + w2, top + 10, low && Math.floor(time * 4) % 2 ? '#ff5a5a' : (low ? '#ffd23f' : '#fff'), '#06101a', 4);
  } else if (mode === 'play') {
    var w3 = clamp(W * 0.3, 110, 260), x3 = (W - w3) / 2;
    ctx.fillStyle = 'rgba(6,16,26,0.7)'; ctx.fillRect(x3 - 2, top + 2, w3 + 4, 9); ctx.fillStyle = '#35e6ff'; ctx.fillRect(x3, top + 4, w3 * clamp(G.lk / G.quota, 0, 1), 5);
    ctx.textAlign = 'center'; ctx.font = fontDisp(11, 500); textOut(Math.min(G.lk, G.quota) + '/' + G.quota, W / 2, top + 22, '#cfe8f3', '#06101a', 3);
  }
}
function drawBanner() {
  var bn = G.banner; if (bn.t <= 0 || !bn.text) return;
  var a = clamp(Math.min(bn.t, (bn.max - bn.t) + 0.1) * 3, 0, 1), y = H * 0.3 + (1 - a) * -12, sz = clamp(W * 0.065, 22, 56);
  ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = fontDisp(sz);
  var hasBn = bn.text.indexOf('সততা') >= 0; textOut(bn.text, W / 2, y, bn.col, '#06101a', 6);
  if (bn.sub) { ctx.font = bn.sub.indexOf('সততা') >= 0 ? fontBn(sz * 0.5) : fontDisp(sz * 0.45, 500); textOut(bn.sub, W / 2, y + sz * 0.75, '#fff', '#06101a', 4); }
  ctx.globalAlpha = 1;
}
function drawCross() {
  var x = G.aimX, y = G.aimY, s = clamp(W * 0.014, 7, 14); ctx.strokeStyle = G.jam > 0 || G.gunHP[G.gun] <= 0 ? '#ff5a5a' : '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - s * 1.6, y); ctx.lineTo(x - s * 0.5, y); ctx.moveTo(x + s * 0.5, y); ctx.lineTo(x + s * 1.6, y); ctx.moveTo(x, y - s * 1.6); ctx.lineTo(x, y - s * 0.5); ctx.moveTo(x, y + s * 0.5); ctx.lineTo(x, y + s * 1.6); ctx.stroke();
  ctx.strokeStyle = '#06101a'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - s * 0.5), Math.round(y - s * 0.5), Math.round(s), Math.round(s));
}

// ---------- boss entrance and defeat ----------
function drawIntro() {
  var t = G.intro, bar = H * 0.12 * easeOut(Math.min(1, t / 0.5)), b = G.boss, au = BOSS_LOOK[b.k].aura;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  if (t > 0.3 && t < 1.5) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 20); ctx.fillStyle = rgba(au, 0.5); ctx.fillRect(0, H * 0.45, W, 4); ctx.globalAlpha = 1; }
  if (t > 1.2) {
    var a = clamp((t - 1.2) * 3, 0, 1) * (t > 3.5 ? clamp((3.9 - t) * 2.5, 0, 1) : 1), sz = clamp(W * 0.09, 28, 80);
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = fontDisp(sz); textOut('NiNishat', W / 2, H * 0.82, rgba(au, 1), '#06101a', 8);
    ctx.font = fontDisp(sz * 0.4, 500); textOut(BOSS_TITLES[b.k] + '  -  BOSS ' + b.k + ' OF 10', W / 2, H * 0.82 + sz * 0.55, '#fff', '#06101a', 4);
    ctx.globalAlpha = 1;
  }
}
function drawDefeat() {
  var df = G.defeat; if (!df) return;
  if (df.ph >= 1) {
    var a = clamp(df.t - 0.7, 0, 1), sz = clamp(W * 0.08, 26, 70); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = fontDisp(sz); textOut('BOSS DEFEATED', W / 2, H * 0.4, '#ffd23f', '#06101a', 7); ctx.globalAlpha = 1;
  }
}
