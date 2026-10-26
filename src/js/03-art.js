// ---------- art: everything is drawn in code, in a low-resolution 8-bit style ----------
function pixelate(img, th, levels, aCut) {
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  var tw = Math.max(1, Math.round(iw * th / ih)), c = mk(tw, th), g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, tw, th);
  var d = g.getImageData(0, 0, tw, th), p = d.data, q = 255 / (levels - 1), i;
  for (i = 0; i < p.length; i += 4) {
    if (p[i + 3] < aCut) { p[i + 3] = 0; continue; }
    p[i + 3] = 255;
    p[i] = Math.round(p[i] / q) * q; p[i + 1] = Math.round(p[i + 1] / q) * q; p[i + 2] = Math.round(p[i + 2] / q) * q;
  }
  g.putImageData(d, 0, 0);
  return c;
}
function silhouette(src, col) {
  var c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function alphaMask(c) {
  var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, m = new Uint8Array(c.width * c.height);
  for (var i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  return m;
}
function drawLine(g, x0, y0, x1, y1, w, col) {
  var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
  g.fillStyle = col;
  for (var n = 0; n < 400; n++) {
    g.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// ---------- Hamim sprite ----------
var HAM = { spr: null, mask: null, w: 0, h: 0, aura: {} };
function buildHamim(img) {
  HAM.spr = pixelate(img, 56, 8, 90);
  HAM.w = HAM.spr.width; HAM.h = HAM.spr.height;
  HAM.mask = alphaMask(HAM.spr);
  HAM.mini = HAM.spr;
}
function hamAura(col) {
  if (!HAM.aura[col]) HAM.aura[col] = silhouette(HAM.spr, col);
  return HAM.aura[col];
}
// Paint splat clipped to the sprite, drawn when a Hamim is hit.
function makeSplat(color) {
  var w = HAM.w, h = HAM.h, c = mk(w, h), g = c.getContext('2d');
  g.fillStyle = color;
  function blob(cx, cy, r) {
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    for (var i = 0; i < 8; i++) { var a = rnd(0, TAU), d = rnd(r * 0.8, r * 1.8); g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd(1.2, 3.2), 0, TAU); g.fill(); }
    g.fillRect(cx - 1, cy, 2, rnd(r, r * 2.4));
  }
  blob(w * rnd(0.3, 0.7), h * rnd(0.2, 0.5), rnd(6, 9));
  blob(w * rnd(0.2, 0.8), h * rnd(0.4, 0.7), rnd(3, 5));
  g.globalCompositeOperation = 'destination-in'; g.drawImage(HAM.spr, 0, 0);
  return c;
}

// ---------- pixel wings (used by flying mutants and the boss) ----------
function drawWings(g, cx, cy, size, flap, col, col2) {
  var s = size, f = Math.sin(flap) * 0.55 + 0.45, side, i;
  for (side = -1; side <= 1; side += 2) {
    for (i = 0; i < 3; i++) {
      var len = s * (1.0 - i * 0.22), ang = -0.5 - i * 0.28 + f * 0.9;
      var ex = cx + side * Math.cos(ang) * len, ey = cy + Math.sin(ang) * len * -1 + i * s * 0.12;
      g.fillStyle = i === 0 ? col : col2;
      g.beginPath();
      g.moveTo(cx + side * s * 0.1, cy + i * s * 0.1);
      g.lineTo(ex, ey - s * 0.1);
      g.lineTo(ex - side * s * 0.05, ey + s * 0.22);
      g.lineTo(cx + side * s * 0.12, cy + s * 0.24 + i * s * 0.1);
      g.closePath(); g.fill();
    }
  }
}

// ---------- boss: one picture, ten looks ----------
var BOSSART = { base: null, cache: [], mask: null };
// where things are on his picture, as fractions of its width and height
var BL = { head: [0.42, 0.27], top: 0.1, eyeL: [0.33, 0.255], eyeR: [0.43, 0.235], shL: [0.17, 0.67], shR: [0.8, 0.69], gem: [0.52, 0.46], brow: [0.4, 0.16] };
function buildBoss(img) {
  var c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0);
  BOSSART.base = pixelate(c, 120, 7, 100);
}
function recolorBoss(src, look) {
  var c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  var d = g.getImageData(0, 0, c.width, c.height), p = d.data, i, hs = look.hue / 360, au = look.aura;
  for (i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    var hsl = rgbToHsl(p[i], p[i + 1], p[i + 2]), h = hsl[0], s = hsl[1], l = hsl[2];
    if (h > 0.09 && h < 0.2 && s > 0.5) { // the yellow bee stripes
      var rgb = hslToRgb((h + hs + 1) % 1, clamp(s * look.sat, 0, 1), clamp(l + look.lum, 0, 1));
      p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2];
    } else if (l < 0.28) { // dark clothing takes a tint from the aura
      var k = 0.2 * (1 - l / 0.28);
      p[i] = clamp(p[i] * (1 - k) + au[0] * k * 0.6, 0, 255);
      p[i + 1] = clamp(p[i + 1] * (1 - k) + au[1] * k * 0.6, 0, 255);
      p[i + 2] = clamp(p[i + 2] * (1 - k) + au[2] * k * 0.6, 0, 255);
      if (look.lum > 0.1) { p[i] += 30; p[i + 1] += 30; p[i + 2] += 36; }
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}
function bossVariant(k) {
  if (BOSSART.cache[k]) return BOSSART.cache[k];
  var base = BOSSART.base, look = BOSS_LOOK[k], au = look.aura, ac = rgba(au, 1);
  var bw = base.width, bh = base.height, padX = Math.round(bw * 0.3), padT = Math.round(bh * 0.3), padB = 3;
  var W2 = bw + padX * 2, H2 = bh + padT + padB, c = mk(W2, H2), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  var body = recolorBoss(base, look);
  var bx = function (u) { return Math.round(padX + u * bw); }, by = function (v) { return Math.round(padT + v * bh); };
  if (k >= 10) { // glitch ghosts behind him
    g.globalAlpha = 0.4; g.drawImage(silhouette(body, '#ff2d55'), padX - 3, padT + 1); g.drawImage(silhouette(body, '#2df0ff'), padX + 3, padT - 1); g.globalAlpha = 1;
  }
  var edge = silhouette(body, '#12061c'), o;
  for (o = 0; o < 4; o++) g.drawImage(edge, padX + [-1, 1, 0, 0][o], padT + [0, 0, -1, 1][o]);
  if (k >= 2) { var edge2 = silhouette(body, rgba(au, 0.9)); g.globalAlpha = 0.9; g.drawImage(edge2, padX, padT - 2); g.globalAlpha = 1; for (o = 0; o < 4; o++) g.drawImage(edge, padX + [-1, 1, 0, 0][o], padT + [0, 0, -3, 1][o]); }
  g.drawImage(body, padX, padT);
  // accessories, added one after another as the bosses get tougher
  var hx = bx(BL.head[0]), hy = by(BL.top);
  if (k >= 2) { // horns
    drawLine(g, bx(0.3), by(0.15), bx(0.19), by(-0.07), 4, '#12061c'); drawLine(g, bx(0.3) + 1, by(0.15), bx(0.2) + 1, by(-0.06), 2, '#efe6c9');
    drawLine(g, bx(0.56), by(0.14), bx(0.66), by(-0.09), 4, '#12061c'); drawLine(g, bx(0.56) + 1, by(0.14), bx(0.65) + 1, by(-0.08), 2, '#efe6c9');
    R(g, bx(0.19), by(-0.08), 3, 3, ac); R(g, bx(0.65), by(-0.1), 3, 3, ac);
  }
  if (k >= 3) { // crown
    var cw = Math.round(bw * 0.22), cx0 = hx - Math.round(cw / 2) + 2, cy0 = hy - 3, i;
    R(g, cx0 - 1, cy0 - 1, cw + 2, 7, '#12061c'); R(g, cx0, cy0, cw, 5, '#ffd23f'); R(g, cx0, cy0 + 3, cw, 2, '#c9971c');
    for (i = 0; i < 5; i++) { var sx = cx0 + Math.round(i * (cw - 3) / 4); R(g, sx - 1, cy0 - 6, 5, 7, '#12061c'); R(g, sx, cy0 - 5, 3, 6, '#ffd23f'); R(g, sx + 1, cy0 - 5, 1, 2, '#fff3b0'); }
    R(g, hx + 1, cy0 + 1, 3, 3, '#ff3b3b');
  }
  if (k >= 4) { // glowing eyes
    [BL.eyeL, BL.eyeR].forEach(function (e) { R(g, bx(e[0]) - 3, by(e[1]) - 2, 7, 5, rgba(au, 0.35)); R(g, bx(e[0]) - 2, by(e[1]) - 1, 5, 3, ac); R(g, bx(e[0]) - 1, by(e[1]), 3, 1, '#ffffff'); });
  }
  if (k >= 5) { // shoulder armour
    [BL.shL, BL.shR].forEach(function (s, idx) {
      var sx = bx(s[0]), sy = by(s[1]), dir = idx ? 1 : -1;
      R(g, sx - 11, sy - 4, 24, 12, '#12061c'); R(g, sx - 10, sy - 3, 22, 10, '#3a3a52'); R(g, sx - 10, sy - 3, 22, 3, '#6d6d8f'); R(g, sx - 10, sy + 5, 22, 2, ac);
      for (var j = 0; j < 3; j++) { R(g, sx - 9 + j * 8, sy - 9, 5, 7, '#12061c'); R(g, sx - 8 + j * 8, sy - 8, 3, 6, '#9a9ab8'); R(g, sx - 8 + j * 8, sy - 8, 1, 3, '#ffffff'); }
    });
  }
  if (k >= 8) { // collar plate around the weak spot
    var gx = bx(BL.gem[0]), gy = by(BL.gem[1]);
    R(g, gx - 8, gy - 7, 16, 14, 'rgba(18,6,28,0.75)'); R(g, gx - 7, gy - 6, 14, 12, rgba(au, 0.28));
    R(g, gx - 7, gy - 6, 14, 1, ac); R(g, gx - 7, gy + 5, 14, 1, ac); R(g, gx - 7, gy - 6, 1, 12, ac); R(g, gx + 6, gy - 6, 1, 12, ac);
  }
  if (k >= 9) { // forehead rune
    var rx = bx(BL.brow[0]), ry = by(BL.brow[1]);
    R(g, rx, ry - 3, 1, 7, ac); R(g, rx - 3, ry, 7, 1, ac); R(g, rx - 1, ry - 1, 3, 3, '#ffffff');
  }
  var v = { c: c, w: W2, h: H2, padX: padX, padT: padT, bw: bw, bh: bh, ws: [padX + BL.gem[0] * bw, padT + BL.gem[1] * bh], mask: null };
  v.mask = alphaMask(c);
  v.aura = rgba(au, 1);
  v.cracks = makeCracks(v, k);
  BOSSART.cache[k] = v;
  return v;
}
function makeCracks(v, k) {
  var r = mulberry(k * 77 + 3), segs = [], n = 14, x, y, i, j;
  for (i = 0; i < 5; i++) {
    x = v.padX + v.bw * (0.2 + r() * 0.6); y = v.padT + v.bh * (0.15 + r() * 0.5);
    for (j = 0; j < 4; j++) { var nx = x + (r() - 0.5) * 18, ny = y + 4 + r() * 12; segs.push([x | 0, y | 0, nx | 0, ny | 0]); x = nx; y = ny; }
  }
  return segs;
}

// ---------- backgrounds: four pixel-art scenes ----------
var SW = 256, SH = 144, HZ = 70;
function bandSky(g, y0, y1, cols) {
  var n = cols.length, i, x;
  for (i = 0; i < n; i++) {
    var a = y0 + Math.round((y1 - y0) * i / n), b = y0 + Math.round((y1 - y0) * (i + 1) / n);
    R(g, 0, a, SW, b - a, cols[i]);
    if (i < n - 1) for (x = 0; x < SW; x += 2) { R(g, x + (b & 1), b, 1, 1, cols[i]); R(g, x + ((b + 1) & 1), b - 1, 1, 1, cols[i + 1]); }
  }
}
function disc(g, cx, cy, r, col) { for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r - dy * dy)); R(g, cx - w, cy + dy, 2 * w + 1, 1, col); } }
function hills(g, base, amp, col, seed, f, bot) {
  var r = mulberry(seed), p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  for (var x = 0; x < SW; x++) {
    var y = base - amp * (0.5 + 0.28 * Math.sin(x * f + p1) + 0.16 * Math.sin(x * f * 2.3 + p2) + 0.08 * Math.sin(x * f * 5.1 + p3));
    y = Math.round(y / 2) * 2; R(g, x, y, 1, bot - y, col);
  }
}
function pxTree(g, x, y, s, leaf, leaf2, trunk) {
  R(g, x - s, y - 4 * s, 2 * s, 4 * s, trunk);
  disc(g, x, y - 7 * s, 4 * s, leaf); disc(g, x - 3 * s, y - 5 * s, 3 * s, leaf); disc(g, x + 3 * s, y - 5 * s, 3 * s, leaf);
  disc(g, x - s, y - 8 * s, 2 * s, leaf2);
}
function groundBands(g, c1, c2, n) {
  for (var i = 0; i < n; i++) {
    var a = HZ + Math.round((SH - HZ) * Math.pow(i / n, 1.7)), b = HZ + Math.round((SH - HZ) * Math.pow((i + 1) / n, 1.7));
    R(g, 0, a, SW, b - a, i % 2 ? c1 : c2);
  }
}
function cloudSprite(w, col, shade) {
  var c = mk(w, 14), g = c.getContext('2d');
  disc(g, w * 0.3, 8, 5, col); disc(g, w * 0.5, 6, 6, col); disc(g, w * 0.7, 8, 5, col); R(g, w * 0.2, 8, w * 0.6, 5, col); R(g, w * 0.2, 12, w * 0.6, 1, shade);
  return c;
}
var BGS = [];
function mkScene(fn) { var c = mk(SW, SH), g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g); return c; }

function buildBackgrounds() {
  // 0: Pixel Meadow
  var clouds = [cloudSprite(34, '#ffffff', '#cfe3f7'), cloudSprite(26, '#ffffff', '#cfe3f7'), cloudSprite(40, '#f4faff', '#c4dcf2')];
  BGS[0] = { scene: mkScene(function (g) {
    bandSky(g, 0, HZ, ['#3379e6', '#4289ee', '#559cf3', '#6eb0f7', '#8cc4fa', '#add8fc', '#cde9fd']);
    disc(g, 206, 24, 11, '#fff1a6'); disc(g, 206, 24, 8, '#ffffff');
    hills(g, HZ + 2, 30, '#7d8fc7', 11, 0.035, HZ + 6);
    hills(g, HZ + 4, 20, '#4f9a5a', 23, 0.05, HZ + 8);
    groundBands(g, '#43b052', '#389a44', 12);
    var r = mulberry(5), i;
    for (i = 0; i < 9; i++) { var tx = 8 + i * 30 + r() * 12; pxTree(g, tx | 0, HZ + 5 + r() * 3, 2, '#1c7a35', '#2fa24c', '#6b4220'); }
    for (i = 0; i < 90; i++) { var fy = HZ + 6 + r() * (SH - HZ - 8), big = fy > HZ + 30 ? 2 : 1; R(g, r() * SW, fy, big, big, pickOne(['#ff6fa8', '#ffe15a', '#ffffff', '#ff9d5a'])); }
  }), anim: function (ctx, t, v) {
    for (var i = 0; i < 3; i++) { var sp = [4, 7, 3][i], x = ((t * sp + i * 95) % (SW + 60)) - 40, y = [10, 24, 36][i]; ctx.drawImage(clouds[i], v.x + x * v.s, v.y + y * v.s, clouds[i].width * v.s, 14 * v.s); }
  } };

  // 1: Neon City
  var stars = []; (function () { var r = mulberry(9); for (var i = 0; i < 34; i++) stars.push([r() * SW | 0, r() * 52 | 0, r() * 6]); })();
  BGS[1] = { scene: mkScene(function (g) {
    bandSky(g, 0, HZ, ['#0a0420', '#150833', '#240c4a', '#3a1160', '#5c1a73', '#8a2380', '#c02f86']);
    var i, r = mulberry(21);
    for (i = 0; i < stars.length; i++) R(g, stars[i][0], stars[i][1], 1, 1, '#ffffff');
    for (var dy = -28; dy <= 28; dy++) {
      var w = Math.floor(Math.sqrt(28 * 28 - dy * dy)), tt = (dy + 28) / 56;
      if (dy > 3 && (dy % 7) < Math.ceil((dy - 3) / 5)) continue;
      var col = tt < 0.5 ? '#ffe45a' : tt < 0.75 ? '#ff9a4a' : '#ff3d8b';
      R(g, 128 - w, HZ - 14 + dy, 2 * w + 1, 1, col);
    }
    var bx = 0;
    while (bx < SW) { var bw = 9 + r() * 12 | 0, bh = 12 + r() * 34 | 0; R(g, bx, HZ - bh, bw, bh, '#2a0d52'); bx += bw + 1; }
    bx = 4;
    while (bx < SW) { var bw2 = 10 + r() * 14 | 0, bh2 = 8 + r() * 26 | 0; R(g, bx, HZ - bh2, bw2, bh2, '#14062e');
      for (var wy = HZ - bh2 + 3; wy < HZ - 2; wy += 4) for (var wx = bx + 2; wx < bx + bw2 - 2; wx += 3) if (r() < 0.3) R(g, wx, wy, 1, 2, pickOne(['#ffe15a', '#35e6ff', '#ff4fd8']));
      bx += bw2 + 4 + r() * 6 | 0; }
    R(g, 0, HZ, SW, SH - HZ, '#0b0618');
    var n = 14;
    for (i = 1; i <= n; i++) { var y = HZ + Math.round((SH - HZ) * Math.pow(i / n, 2)); R(g, 0, y, SW, 1, i % 2 ? '#ff2fd1' : '#b01ea0'); }
    for (var xi = -16; xi <= 16; xi++) for (var yy = HZ; yy < SH; yy++) { var f = (yy - HZ) / (SH - HZ), xx = Math.round(128 + xi * (3 + f * 26)); if (xx >= 0 && xx < SW) R(g, xx, yy, 1, 1, '#35e6ff'); }
    R(g, 0, HZ - 1, SW, 2, '#ff6fd8');
  }), anim: function (ctx, t, v) {
    for (var i = 0; i < stars.length; i++) { var a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + stars[i][2])); ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; ctx.fillRect(v.x + stars[i][0] * v.s, v.y + stars[i][1] * v.s, Math.max(1, v.s), Math.max(1, v.s)); }
    var sc = (t * 0.55) % 1; ctx.fillStyle = 'rgba(255,120,230,0.28)'; var y = HZ + (SH - HZ) * sc * sc; ctx.fillRect(v.x, v.y + y * v.s, SW * v.s, Math.max(1, v.s * 1.5));
  } };

  // 2: Desert Ruins
  var dClouds = [cloudSprite(46, '#f9b0a0', '#d9768a'), cloudSprite(30, '#ffc9a8', '#e08a7c')];
  BGS[2] = { scene: mkScene(function (g) {
    bandSky(g, 0, HZ, ['#2e1a56', '#52256a', '#7e2f72', '#b0417a', '#e0607a', '#f6865e', '#ffb064']);
    disc(g, 70, HZ - 6, 16, '#ff9a4a'); disc(g, 70, HZ - 6, 13, '#ffd68a'); disc(g, 70, HZ - 6, 9, '#fff3c8');
    var y, hw;
    for (y = 0; y < 38; y++) { hw = Math.round(y * 1.05); R(g, 190 - hw, HZ - 38 + y, hw * 2, 1, '#4a2050'); R(g, 190, HZ - 38 + y, hw, 1, '#3a1840'); }
    hills(g, HZ + 2, 18, '#7e3a6c', 31, 0.045, HZ + 8);
    for (var px = 0; px < 3; px++) { var rx = 20 + px * 17; R(g, rx, HZ - 16 - px * 3, 5, 18 + px * 3, '#522050'); R(g, rx - 1, HZ - 17 - px * 3, 7, 2, '#522050'); }
    groundBands(g, '#e2a35a', '#d68f48', 13);
    var r = mulberry(14), i;
    for (i = 0; i < 4; i++) { var cxx = 100 + i * 38 + r() * 14 | 0; R(g, cxx, HZ - 8, 3, 12, '#2d6a44'); R(g, cxx - 3, HZ - 5, 3, 2, '#2d6a44'); R(g, cxx - 3, HZ - 8, 2, 4, '#2d6a44'); R(g, cxx + 3, HZ - 6, 3, 2, '#2d6a44'); R(g, cxx + 4, HZ - 9, 2, 4, '#2d6a44'); }
    for (i = 0; i < 60; i++) { var fy = HZ + 6 + r() * (SH - HZ - 8); R(g, r() * SW, fy, fy > HZ + 30 ? 3 : 2, 1, '#c27d3c'); }
    for (i = 0; i < 8; i++) { var ry = HZ + 8 + r() * (SH - HZ - 14); R(g, r() * SW, ry, 4, 2, '#8e5a34'); }
  }), anim: function (ctx, t, v) {
    for (var i = 0; i < 2; i++) { var x = ((t * (3 + i * 2) + i * 140) % (SW + 70)) - 50; ctx.globalAlpha = 0.7; ctx.drawImage(dClouds[i], v.x + x * v.s, v.y + (12 + i * 20) * v.s, dClouds[i].width * v.s, 14 * v.s); }
    ctx.globalAlpha = 1;
  } };

  // 3: Lava Citadel
  BGS[3] = { scene: mkScene(function (g) {
    bandSky(g, 0, HZ, ['#120305', '#240709', '#400d0d', '#6a1810', '#9c2a14', '#d4491a', '#ff7a2a']);
    var y, hw, i, r = mulberry(33);
    for (y = 0; y < 50; y++) { hw = Math.round(y * 1.35); R(g, 72 - hw, HZ - 50 + y, hw * 2, 1, '#2a1519'); R(g, 72 + (y >> 2), HZ - 50 + y, hw - (y >> 2), 1, '#1d0e12'); }
    R(g, 66, HZ - 50, 12, 3, '#ffb02e'); R(g, 64, HZ - 48, 16, 2, '#ff6a1a');
    for (i = 0; i < 3; i++) { var lx = 70 + (i - 1) * 7, wob = 0; for (y = 0; y < 46; y++) { if (r() < 0.25) wob += r() < 0.5 ? -1 : 1; R(g, lx + wob + (i - 1) * (y >> 3), HZ - 47 + y, 2, 1, y % 5 ? '#ff6a1a' : '#ffb02e'); } }
    R(g, 168, HZ - 22, 62, 24, '#160a0e');
    [[164, 40], [186, 52], [212, 44], [228, 34]].forEach(function (t) { R(g, t[0], HZ - t[1], 14, t[1] + 2, '#160a0e'); for (var k = 0; k < 14; k += 4) R(g, t[0] + k, HZ - t[1] - 3, 3, 3, '#160a0e'); R(g, t[0] + 5, HZ - t[1] + 8, 3, 5, '#ffb02e'); R(g, t[0] + 5, HZ - t[1] + 20, 3, 5, '#ff7a2a'); });
    hills(g, HZ + 3, 10, '#241014', 41, 0.06, HZ + 8);
    groundBands(g, '#3a2226', '#2e1a1d', 13);
    for (i = 0; i < 9; i++) { var x0 = r() * SW, y0 = HZ + 8 + r() * (SH - HZ - 16); for (var j = 0; j < 7; j++) { R(g, x0, y0, 2, 1, '#ff7a1a'); x0 += r() < 0.5 ? 2 : -2; y0 += r() < 0.5 ? 1 : 0; if (r() < 0.2) R(g, x0, y0 + 1, 3, 1, '#ffd36a'); } }
    R(g, 0, HZ + 1, SW, 1, 'rgba(255,110,30,0.45)');
  }), anim: function (ctx, t, v) {
    ctx.globalAlpha = 0.12 + 0.07 * Math.sin(t * 3); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(v.x + 56 * v.s, v.y + (HZ - 56) * v.s, 32 * v.s, 12 * v.s); ctx.globalAlpha = 1;
    for (var i = 0; i < 14; i++) { var ph = (t * 0.18 + i * 0.37) % 1, x = (i * 53 + Math.sin(t + i) * 6) % SW, y = HZ - 6 - ph * 64; ctx.fillStyle = 'rgba(255,' + (150 + (i * 20) % 90) + ',40,' + (1 - ph).toFixed(2) + ')'; ctx.fillRect(v.x + x * v.s, v.y + y * v.s, Math.max(1, v.s), Math.max(1, v.s)); }
  } };
}

// ---------- guns: 64 x 96 sprites, muzzle at the top, hand at the bottom ----------
function ol(g, x, y, w, h, c, o) { R(g, x - 1, y - 1, w + 2, h + 2, o); R(g, x, y, w, h, c); }
function speck(g, x, y, w, h, cols, n, seed) { var r = mulberry(seed); for (var i = 0; i < n; i++) R(g, x + r() * w, y + r() * h, r() < 0.3 ? 2 : 1, 1, cols[Math.floor(r() * cols.length)]); }
var GUNART = [];
function buildGuns() {
  var defs = [
    function (g) { // Water Pistol
      var O = '#0b3556';
      ol(g, 27, 6, 10, 10, '#e8f8ff', O); ol(g, 28, 14, 8, 30, '#2a8fd6', O); ol(g, 18, 40, 28, 32, '#4fc3ff', O); ol(g, 20, 28, 24, 14, '#a6e6ff', O);
      R(g, 22, 30, 3, 10, '#f2fcff'); R(g, 30, 32, 2, 2, '#fff'); R(g, 36, 36, 2, 2, '#fff'); R(g, 27, 38, 2, 2, '#fff');
      R(g, 20, 44, 3, 24, '#bff0ff'); R(g, 38, 44, 6, 26, '#2a8fd6'); ol(g, 26, 70, 12, 20, '#1c6fa8', O); R(g, 28, 72, 2, 14, '#4aa3dc'); R(g, 36, 62, 8, 4, '#ffd23f');
    },
    function (g) { // Splat Revolver
      var O = '#1d1209', i;
      ol(g, 29, 6, 6, 10, '#c9a13c', O); ol(g, 27, 14, 10, 34, '#8a8f98', O); R(g, 29, 16, 2, 30, '#c4c9d2'); ol(g, 26, 26, 12, 4, '#c9a13c', O);
      ol(g, 19, 42, 26, 18, '#b08a2e', O); R(g, 19, 42, 26, 3, '#e8cc6a'); for (i = 0; i < 3; i++) R(g, 22 + i * 8, 48, 5, 5, '#5c4410');
      ol(g, 22, 58, 22, 14, '#c9a13c', O); ol(g, 44, 44, 6, 10, '#6a6f78', O); ol(g, 24, 68, 16, 24, '#7a4a21', O);
      for (i = 0; i < 5; i++) R(g, 26, 70 + i * 4, 12, 1, '#5a3416'); R(g, 26, 70, 3, 20, '#9a6234'); ol(g, 38, 62, 6, 8, '#c9a13c', O);
    },
    function (g) { // Twin Pop
      var O = '#220a10', y;
      ol(g, 20, 8, 10, 44, '#e63946', O); ol(g, 34, 8, 10, 44, '#e63946', O);
      for (y = 12; y < 50; y += 8) { R(g, 20, y, 10, 3, '#ffffff'); R(g, 34, y, 10, 3, '#ffffff'); }
      ol(g, 19, 5, 12, 5, '#ffd6d9', O); ol(g, 33, 5, 12, 5, '#ffd6d9', O);
      ol(g, 16, 48, 32, 26, '#f4f4f4', O); R(g, 16, 56, 32, 5, '#e63946'); R(g, 18, 50, 4, 20, '#ffffff'); R(g, 40, 62, 6, 10, '#d4d4d4');
      ol(g, 26, 72, 12, 20, '#2b2d42', O); R(g, 28, 74, 2, 14, '#4a4d6e'); R(g, 30, 64, 4, 4, '#ffd23f');
    },
    function (g) { // Rainbow SMG
      var O = '#101218', cols = ['#ff3b3b', '#ff9d2e', '#ffe23b', '#3bd65a', '#33b6ff', '#8a4dff'], i;
      ol(g, 28, 8, 8, 30, '#cfd3da', O); R(g, 30, 10, 2, 26, '#ffffff'); ol(g, 26, 4, 12, 6, '#8d93a0', O); R(g, 30, 0, 4, 4, '#ff3b3b');
      ol(g, 16, 36, 32, 36, '#aab0bb', O); R(g, 18, 38, 28, 4, '#e9edf3'); R(g, 18, 44, 28, 3, '#7b8290'); R(g, 18, 62, 28, 4, '#dfe4ec'); R(g, 18, 68, 28, 2, '#7b8290');
      for (i = 0; i < 6; i++) R(g, 16, 49 + i * 2, 32, 2, cols[i]);
      ol(g, 36, 72, 10, 18, '#7b8290', O); ol(g, 22, 72, 12, 20, '#2a2e38', O);
    },
    function (g) { // Paint Shotgun
      var O = '#1f0e07', rc = ['#a65b33', '#5e2f1a', '#c77b45'];
      ol(g, 25, 4, 14, 56, '#8b4a2b', O); ol(g, 23, 2, 18, 7, '#3a2418', O); speck(g, 25, 8, 14, 50, rc, 70, 5);
      ol(g, 20, 40, 24, 14, '#5a3b24', O); for (var i = 0; i < 5; i++) R(g, 21, 42 + i * 2, 22, 1, '#3d2616');
      ol(g, 22, 54, 20, 20, '#7a4025', O); speck(g, 22, 54, 20, 20, rc, 40, 9); ol(g, 25, 72, 14, 20, '#4a2f1d', O);
      R(g, 27, 12, 2, 10, '#ff4fa3'); R(g, 34, 20, 2, 14, '#35e6ff'); R(g, 30, 30, 2, 8, '#ffe15a'); R(g, 36, 46, 2, 6, '#ff4fa3');
    },
    function (g) { // Gloop Launcher
      var O = '#07261a';
      ol(g, 20, 4, 24, 34, '#1e9e57', O); R(g, 24, 6, 16, 8, '#0b3d24'); R(g, 22, 16, 3, 18, '#58d98f');
      ol(g, 10, 34, 44, 32, '#37d67a', O); R(g, 13, 37, 6, 22, '#a5ffcb'); R(g, 14, 62, 36, 2, '#1f9a55');
      R(g, 26, 40, 4, 4, '#d7ffe8'); R(g, 38, 48, 3, 3, '#d7ffe8'); R(g, 30, 54, 3, 3, '#d7ffe8'); R(g, 44, 40, 3, 3, '#d7ffe8');
      R(g, 18, 66, 3, 8, '#37d67a'); R(g, 44, 66, 4, 12, '#37d67a'); R(g, 45, 78, 2, 2, '#7dffb2'); ol(g, 26, 68, 12, 22, '#145c35', O);
    },
    function (g) { // Neon Minigun (barrels are drawn live)
      var O = '#05050a';
      ol(g, 16, 48, 32, 30, '#16161f', O); R(g, 18, 52, 28, 2, '#35e6ff'); R(g, 18, 72, 28, 2, '#ff3bd1'); R(g, 20, 58, 2, 8, '#35e6ff'); R(g, 42, 58, 2, 8, '#ff3bd1');
      ol(g, 16, 4, 32, 12, '#22222e', O); R(g, 18, 7, 28, 2, '#35e6ff'); R(g, 18, 12, 28, 2, '#ff3bd1');
      ol(g, 20, 38, 24, 12, '#22222e', O); R(g, 22, 41, 20, 2, '#ff3bd1'); ol(g, 26, 78, 12, 14, '#22222e', O); ol(g, 46, 62, 8, 14, '#22222e', O);
    },
    function (g) { // Golden Honesty Blaster
      var O = '#4a2c00';
      ol(g, 4, 40, 14, 24, '#ffd54a', O); R(g, 6, 44, 10, 2, '#fff3b0'); R(g, 6, 50, 10, 2, '#c9971c'); R(g, 6, 56, 10, 2, '#fff3b0');
      ol(g, 46, 40, 14, 24, '#ffd54a', O); R(g, 48, 44, 10, 2, '#fff3b0'); R(g, 48, 50, 10, 2, '#c9971c'); R(g, 48, 56, 10, 2, '#fff3b0');
      ol(g, 24, 8, 16, 38, '#ffc928', O); R(g, 24, 16, 16, 3, '#fff3b0'); R(g, 24, 28, 16, 3, '#c9971c'); ol(g, 22, 4, 20, 7, '#ffe27a', O);
      ol(g, 16, 40, 32, 34, '#ffd54a', O); R(g, 18, 42, 5, 28, '#fff7c8'); R(g, 40, 44, 6, 26, '#c9971c'); ol(g, 26, 48, 12, 12, '#7a4a00', O);
      ol(g, 25, 72, 14, 20, '#b8860b', O); R(g, 27, 74, 2, 14, '#ffe27a'); R(g, 28, 0, 8, 2, '#fff3b0');
    }
  ];
  for (var i = 0; i < defs.length; i++) { var c = mk(64, 96), g = c.getContext('2d'); g.imageSmoothingEnabled = false; defs[i](g); GUNART[i] = c; }
}
// Parts of a gun that move: spinning barrels, bubbles, glowing core. Drawn around the static sprite.
function gunLiveBack(g, id, t, spin) {
  if (id === 6) {
    for (var i = 0; i < 6; i++) {
      var a = spin + i * Math.PI / 3, dx = Math.cos(a) * 10, depth = Math.sin(a);
      R(g, 32 + dx - 3, 14, 6, 28, depth > 0 ? '#4a4a60' : '#2a2a38'); R(g, 32 + dx - 3, 14, 2, 28, depth > 0 ? '#8a8aa8' : '#3a3a4c');
      if (depth > 0.5) R(g, 32 + dx - 1, 14, 2, 2, '#35e6ff');
    }
  }
}
function gunLiveFront(g, id, t) {
  if (id === 5) {
    for (var i = 0; i < 4; i++) { var ph = (t * 0.7 + i * 0.27) % 1; R(g, 16 + i * 10 + Math.sin(t * 3 + i) * 2, 62 - ph * 26, 3, 3, 'rgba(215,255,232,' + (1 - ph).toFixed(2) + ')'); }
  } else if (id === 7) {
    var pr = 4 + Math.sin(t * 5) * 1.5;
    g.fillStyle = 'rgba(255,248,200,0.9)'; g.fillRect(32 - pr, 54 - pr, pr * 2, pr * 2);
    g.fillStyle = '#ffffff'; g.fillRect(31, 53, 2, 2);
    for (var j = 0; j < 3; j++) { var a = t * 2 + j * 2.1; R(g, 32 + Math.cos(a) * 20, 40 + Math.sin(a * 1.3) * 22, 2, 2, '#fff3b0'); }
  } else if (id === 6) {
    g.fillStyle = 'rgba(53,230,255,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; g.fillRect(18, 14, 28, 1);
  }
}
function gunPreview(id, canvas) {
  var g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
  gunLiveBack(g, id, 0, 0.4); g.drawImage(GUNART[id], 0, 0); gunLiveFront(g, id, 0.3);
}
