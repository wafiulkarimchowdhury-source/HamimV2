// ---------- interface: panels, market, input, main loop ----------
var overlay = document.getElementById('overlay'), panel = document.getElementById('panel'), hudEl = document.getElementById('hud'), slotsEl = document.getElementById('slots');
var btnPause = document.getElementById('btnPause'), btnMute = document.getElementById('btnMute');
var panelState = { name: '', from: '', tab: 'guns', msg: '' };
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function showPanel(html, cls) { panel.className = 'panel' + (cls ? ' ' + cls : ''); panel.innerHTML = html; overlay.hidden = false; }
function hidePanel() { overlay.hidden = true; panelState.name = ''; }
var BN = '<span class="bn">সততা</span>';
function coinsHtml(n) { return '<i class="coin"></i>' + BN + ' ' + fmt(n); }

// ----- main menu -----
function uiMenu() {
  G.mode = 'menu'; G.paused = false; panelState.name = 'menu';
  hudEl.hidden = true; slotsEl.hidden = true; btnPause.hidden = true; layoutSoon();
  setClimate(0, false); musicPlay('menu', 0);
  var run = S.run, D = DIFFS;
  showPanel('<div class="tag">A retro paint-balloon shooter</div><h2>Hamim Bird</h2>' +
    '<p>Pop every Hamim before it walks off the screen. Beat NiNishat every 5 levels. 50 levels in all.</p>' +
    '<div class="row"><span class="k">Difficulty</span><span class="seg" id="segDiff">' + ['easy', 'normal', 'hard'].map(function (d) { return '<button type="button" data-act="diff" data-v="' + d + '"' + (S.diff === d ? ' class="on"' : '') + '>' + D[d].name + '</button>'; }).join('') + '</span></div>' +
    '<div class="row"><span class="k">Wallet</span><span class="wallet">' + coinsHtml(S.coins) + '</span></div>' +
    '<div class="btns">' + (run ? '<button class="btn" type="button" data-act="continue">Continue - Level ' + run.level + '</button><button class="btn alt" type="button" data-act="new">New game</button>' : '<button class="btn" type="button" data-act="new">Play</button>') +
    '<button class="btn gold" type="button" data-act="market">Market</button><button class="btn alt" type="button" data-act="settings">Settings</button></div>' +
    '<p>Best level ' + S.bestLevel + ' &middot; Best score ' + fmt(S.bestScore) + '</p>' +
    '<p>Hold to fire. Aim with the mouse or your finger. Keys: 1-8 swap gun, P pause, M mute.</p>');
}
function startNew() { auInit(); hidePanel(); newRun(1); showGameUi(); }
function startContinue() { auInit(); hidePanel(); resumeRun(); showGameUi(); }
function showGameUi() { hudEl.hidden = false; btnPause.hidden = false; slotsEl.hidden = false; buildSlots(); layoutSoon(); hudDirty = true; }

// ----- settings -----
function uiSettings(from) {
  panelState.name = 'settings'; panelState.from = from || 'menu';
  var qs = ['auto', 'low', 'medium', 'high'];
  showPanel('<h2>Settings</h2>' +
    '<div class="row"><span class="k">Music</span><span class="seg"><button type="button" data-act="music" data-v="1"' + (S.music ? ' class="on"' : '') + '>On</button><button type="button" data-act="music" data-v="0"' + (!S.music ? ' class="on"' : '') + '>Off</button></span></div>' +
    '<div class="row"><span class="k">Sound FX</span><span class="seg"><button type="button" data-act="sfx" data-v="1"' + (S.sfx ? ' class="on"' : '') + '>On</button><button type="button" data-act="sfx" data-v="0"' + (!S.sfx ? ' class="on"' : '') + '>Off</button></span></div>' +
    '<div class="row"><span class="k">Graphics</span><span class="seg">' + qs.map(function (q) { return '<button type="button" data-act="quality" data-v="' + q + '"' + (S.quality === q ? ' class="on"' : '') + '>' + q + '</button>'; }).join('') + '</span></div>' +
    '<p>Auto lowers the effects by itself if your device slows down. Now using: ' + Q.label + '.</p>' +
    '<div class="btns"><button class="btn" type="button" data-act="back">Back</button></div>');
}
function syncMute() { var on = S.music || S.sfx; btnMute.textContent = on ? 'Sound on' : 'Sound off'; btnMute.setAttribute('aria-pressed', on ? 'false' : 'true'); }
function applyAudioPrefs() { setAudioFlags(S.music, S.sfx); syncMute(); dirty = true; }
function setQuality(q) {
  S.quality = q; dirty = true;
  if (q !== 'auto') qi = { low: 1, medium: 2, high: 3 }[q]; Q = QTAB[qi]; layout();
}

// ----- pause -----
function uiPause(forced) {
  if (G.mode !== 'play' && G.mode !== 'boss' && G.mode !== 'intro') return;
  G.paused = true; G.hold = false; panelState.name = 'pause'; duckMusic(0.35);
  var noGun = !workingGun();
  showPanel('<div class="tag">' + (G.isBoss ? 'Boss fight ' + G.bossK + ' of 10' : 'Level ' + G.level + ' of 50') + '</div><h2>' + (noGun ? 'All guns broken' : 'Paused') + '</h2>' +
    (noGun ? '<p>Repair a gun in the Market, or give up this run.</p>' : '<p>Your run is saved at the start of each level.</p>') +
    '<div class="row"><span class="k">Wallet</span><span class="wallet">' + coinsHtml(S.coins) + '</span></div>' +
    '<div class="btns">' + (noGun ? '' : '<button class="btn" type="button" data-act="resume">Resume</button>') + '<button class="btn gold" type="button" data-act="market">Market</button><button class="btn alt" type="button" data-act="settings">Settings</button>' +
    '<button class="btn alt" type="button" data-act="' + (noGun ? 'giveup' : 'quit') + '">' + (noGun ? 'Give up' : 'Quit to menu') + '</button></div>');
}
function resumeGame() { G.paused = false; hidePanel(); duckMusic(1); }
function togglePause() {
  if (G.paused) { if (panelState.name === 'pause') { if (workingGun()) resumeGame(); } else if (panelState.name === 'market' || panelState.name === 'settings') backFromSub(); }
  else if (G.mode === 'play' || G.mode === 'boss' || G.mode === 'intro') uiPause();
}
function backFromSub() {
  var from = panelState.from;
  if (from === 'pause') uiPause(); else if (from === 'result') uiBossResult(); else if (from === 'over') uiGameOver(); else if (from === 'win') uiVictory(); else uiMenu();
}

// ----- market -----
function statBar(label, v) { return '<div class="stat">' + label + '<i><b style="width:' + Math.round(clamp(v, 0.03, 1) * 100) + '%"></b></i></div>'; }
function uiMarket(from) {
  if (from) panelState.from = from;
  panelState.name = 'market'; var tab = panelState.tab, inRun = (G.mode === 'play' || G.mode === 'boss' || G.mode === 'intro') && G.paused, h = '';
  var keepScroll = panel.scrollTop;
  h += '<div class="mhead"><h2>Market</h2><span class="wallet">' + coinsHtml(S.coins) + '</span></div>';
  h += '<div class="tabs"><button type="button" data-act="tab" data-v="guns"' + (tab === 'guns' ? ' class="on"' : '') + '>Guns</button><button type="button" data-act="tab" data-v="bgs"' + (tab === 'bgs' ? ' class="on"' : '') + '>Backgrounds</button></div>';
  h += '<div class="msg" id="mkMsg">' + esc(panelState.msg || '') + '</div><div class="grid">';
  if (tab === 'guns') {
    GUNS.forEach(function (g) {
      var own = S.owned.indexOf(g.id) >= 0, eq = (inRun ? G.gun : S.equipped) === g.id, pw = gunPower(g) / MAX_POWER;
      h += '<div class="card' + (eq ? ' eq' : '') + '"><div class="pv"><canvas width="64" height="96" data-gun="' + g.id + '"></canvas></div><h3>' + esc(g.name) + '</h3><div class="note">' + esc(g.note) + '</div>' +
        statBar('Damage', g.dmg * (g.pellets > 1 ? g.pellets * 0.7 : 1) / 90) + statBar('Rate', g.rate / 12) + statBar('Power', pw) + statBar('Health', g.hp / 700);
      if (own) {
        var rc = inRun ? repairCost(g.id) : 0;
        h += eq ? '<div class="price goldc">Equipped</div>' : '<button class="btn sm" type="button" data-act="equip" data-v="' + g.id + '">Equip</button>';
        if (rc > 0) h += '<button class="btn sm alt" type="button" data-act="repair" data-v="' + g.id + '"' + (S.coins < rc ? ' disabled' : '') + '>Repair ' + fmt(rc) + '</button>';
      } else h += '<div class="price"><i class="coin"></i>' + fmt(g.price) + '</div><button class="btn sm gold" type="button" data-act="buygun" data-v="' + g.id + '"' + (S.coins < g.price ? ' disabled' : '') + '>Buy</button>';
      h += '</div>';
    });
  } else {
    BG_INFO.forEach(function (b) {
      var own = S.bgOwned.indexOf(b.id) >= 0, on = S.bg === b.id;
      h += '<div class="card' + (on ? ' eq' : '') + '"><div class="pv bgp"><canvas width="128" height="72" data-bg="' + b.id + '"></canvas></div><h3>' + esc(b.name) + '</h3><div class="note">' + esc(b.note) + '</div>' +
        (own ? (on ? '<div class="price goldc">In use</div>' : '<button class="btn sm" type="button" data-act="usebg" data-v="' + b.id + '">Use</button>') : '<div class="price"><i class="coin"></i>' + fmt(b.price) + '</div><button class="btn sm gold" type="button" data-act="buybg" data-v="' + b.id + '"' + (S.coins < b.price ? ' disabled' : '') + '>Buy</button>') + '</div>';
    });
  }
  h += '</div><div class="btns"><button class="btn" type="button" data-act="back">Back</button></div>';
  showPanel(h, 'wide'); panel.scrollTop = keepScroll;
  var cs = panel.querySelectorAll('canvas[data-gun]'), i;
  for (i = 0; i < cs.length; i++) gunPreview(+cs[i].getAttribute('data-gun'), cs[i]);
  cs = panel.querySelectorAll('canvas[data-bg]');
  for (i = 0; i < cs.length; i++) { var g2 = cs[i].getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(BGS[+cs[i].getAttribute('data-bg')].scene, 0, 0, 128, 72); }
  if (G.mode === 'menu' || !inRun) musicPlay('shop', 0);
}
function marketAct(act, v) {
  var id = +v, g, msg = '';
  if (act === 'tab') { panelState.tab = v; panelState.msg = ''; return uiMarket(); }
  if (act === 'buygun') {
    g = GUNS[id];
    if (S.owned.indexOf(id) >= 0) msg = 'Already yours.'; else if (S.coins < g.price) { msg = 'Not enough সততা.'; sfx('deny'); }
    else { S.coins -= g.price; S.owned.push(id); S.owned.sort(function (a, b) { return a - b; }); G.gunHP[id] = g.hp; if (G.mode === 'play' || G.mode === 'boss') buildSlots(); dirty = true; hudDirty = true; sfx('buy'); msg = g.name + ' bought.'; persist(); }
  } else if (act === 'equip') {
    var inRun = (G.mode === 'play' || G.mode === 'boss') && G.paused;
    if (inRun) {
      if (G.gunHP[id] <= 0) { msg = 'That gun is broken. Repair it first.'; sfx('deny'); }
      else { G.gun = id; S.equipped = id; G.spin = 0; G.swapCd = 0; dirty = true; sfx('swap'); msg = GUNS[id].name + ' equipped.'; }
    } else { S.equipped = id; G.gun = id; dirty = true; sfx('swap'); msg = GUNS[id].name + ' equipped.'; }
  } else if (act === 'repair') { if (repairGun(id)) { sfx('buy'); msg = GUNS[id].name + ' repaired.'; if (G.needRepair) G.needRepair = 0; } else { msg = 'Not enough সততা.'; sfx('deny'); } }
  else if (act === 'buybg') {
    var b = BG_INFO[id]; if (S.bgOwned.indexOf(id) >= 0) msg = 'Already yours.'; else if (S.coins < b.price) { msg = 'Not enough সততা.'; sfx('deny'); }
    else { S.coins -= b.price; S.bgOwned.push(id); S.bg = id; dirty = true; hudDirty = true; sfx('buy'); msg = b.name + ' bought and set.'; persist(); }
  } else if (act === 'usebg') { S.bg = id; dirty = true; sfx('swap'); msg = BG_INFO[id].name + ' set.'; }
  panelState.msg = msg; uiMarket();
}

// ----- results -----
function uiBossResult() {
  var s = G.summary, k = s.k;
  musicPlay('shop', 0); duckMusic(1);
  showPanel('<div class="tag">Boss ' + k + ' of 10 defeated</div><h2>NiNishat falls</h2><p class="sub">' + esc(BOSS_TITLES[k]) + ' is down. Your guns are repaired and your lives are full.</p>' +
    '<dl class="results"><dt>Boss reward</dt><dd class="goldc">+' + fmt(s.boss) + ' ' + BN + '</dd><dt>Level reward</dt><dd class="goldc">+' + fmt(s.level) + ' ' + BN + '</dd>' + (s.bonus ? '<dt>Final bonus</dt><dd class="goldc">+' + fmt(s.bonus) + ' ' + BN + '</dd>' : '') + '<dt>Wallet</dt><dd>' + fmt(S.coins) + ' ' + BN + '</dd></dl>' +
    (k < 10 ? '<p>Next up: <b class="sub">' + esc(s.next) + '</b>' + (s.power ? '. New mutant power: <b class="sub">' + esc(s.power.name) + '</b> (' + esc(s.power.info) + ').' : '.') + '</p>' : '') +
    '<div class="btns"><button class="btn" type="button" data-act="next">' + (k >= 10 ? 'Finish' : 'Next level') + '</button><button class="btn gold" type="button" data-act="market">Market</button></div>');
  panelState.name = 'result'; panelState.from = 'result'; G.paused = false; hudDirty = true;
}
function uiGameOver() {
  var s = G.summary, why = { lives: 'Too many Hamims got away.', time: 'The boss broke your gun. Time ran out.', guns: 'All your guns broke.' }[G.reason] || 'Run over.';
  hudEl.hidden = false; btnPause.hidden = true; panelState.name = 'over'; panelState.from = 'over';
  showPanel('<div class="tag">Run over</div><h2>You lost</h2><p class="sub">' + why + '</p>' +
    '<dl class="results"><dt>Reached</dt><dd>Level ' + G.level + '</dd><dt>Score</dt><dd>' + fmt(G.score) + '</dd><dt>Wallet before</dt><dd>' + fmt(s.before) + ' ' + BN + '</dd><dt>Lost (half)</dt><dd class="bad">-' + fmt(s.lost) + ' ' + BN + '</dd><dt>You keep</dt><dd class="goldc">' + fmt(s.keep) + ' ' + BN + '</dd></dl>' +
    '<p>Your guns and backgrounds are safe. You start again from level 1.</p>' +
    '<div class="btns"><button class="btn" type="button" data-act="new">Play again</button><button class="btn gold" type="button" data-act="market">Market</button><button class="btn alt" type="button" data-act="menu">Menu</button></div>');
}
function uiVictory() {
  panelState.name = 'win'; panelState.from = 'win';
  showPanel('<div class="tag">All 50 levels cleared</div><h2>You won</h2><p class="sub">NiNishat is gone for good. Thank you for playing.</p>' +
    '<dl class="results"><dt>Score</dt><dd>' + fmt(G.score) + '</dd><dt>Wallet</dt><dd>' + fmt(S.coins) + ' ' + BN + '</dd></dl>' +
    '<div class="btns"><button class="btn" type="button" data-act="new">Play again</button><button class="btn gold" type="button" data-act="market">Market</button><button class="btn alt" type="button" data-act="menu">Menu</button></div>');
}

// ----- one click handler for every panel button -----
panel.addEventListener('click', function (ev) {
  var t = ev.target.closest ? ev.target.closest('[data-act]') : null; if (!t || t.disabled) return;
  auInit(); var act = t.getAttribute('data-act'), v = t.getAttribute('data-v');
  if (act !== 'equip' && act !== 'buygun' && act !== 'buybg' && act !== 'usebg' && act !== 'repair') sfx('ui');
  switch (act) {
    case 'diff': S.diff = v; dirty = true; uiMenu(); break;
    case 'new': S.run = null; startNew(); break;
    case 'continue': startContinue(); break;
    case 'market': panelState.from = panelState.name === 'menu' ? 'menu' : panelState.name; if (panelState.name === 'over') panelState.from = 'over'; panelState.msg = ''; uiMarket(); break;
    case 'settings': panelState.from = panelState.name; uiSettings(panelState.from); break;
    case 'resume': resumeGame(); break;
    case 'quit': snapshotRun(); persist(); G.paused = false; G.ents.length = 0; G.eprojs.length = 0; G.pprojs.length = 0; G.boss = null; duckMusic(1); uiMenu(); break;
    case 'giveup': G.paused = false; hidePanel(); gameOver('guns'); break;
    case 'back': panelState.msg = ''; backFromSub(); break;
    case 'menu': G.ents.length = 0; G.boss = null; uiMenu(); break;
    case 'next': hidePanel(); nextAfterBoss(); break;
    case 'music': S.music = v === '1'; applyAudioPrefs(); uiSettings(panelState.from); break;
    case 'sfx': S.sfx = v === '1'; applyAudioPrefs(); uiSettings(panelState.from); break;
    case 'quality': setQuality(v); uiSettings(panelState.from); break;
    default: marketAct(act, v);
  }
});

// ----- HUD and gun slots -----
var hudLast = { lives: -1, max: -1 }, slotEls = [], slotKey = '';
function buildSlots() {
  slotsEl.innerHTML = ''; slotEls = [];
  S.owned.forEach(function (id, n) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'slot'; b.setAttribute('aria-label', GUNS[id].name);
    b.innerHTML = '<canvas width="64" height="96"></canvas><span class="num">' + (id + 1) + '</span><span class="hp"><i></i></span><span class="cd" hidden></span>';
    gunPreview(id, b.querySelector('canvas'));
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); auInit(); if (!G.paused && (G.mode === 'play' || G.mode === 'boss')) { var r = swapGun(id); if (r === 'cooldown') { sfx('deny'); floatText(W / 2, H * 0.6, 'SWAP IN ' + G.swapCd.toFixed(1), '#ffd23f', 0); } else if (r === 'broken') sfx('deny'); } });
    slotsEl.appendChild(b); slotEls.push({ id: id, b: b, hp: b.querySelector('.hp i'), cd: b.querySelector('.cd') });
  });
}
function updateHud() {
  if (hudEl.hidden) return;
  var acc = G.shots ? Math.round(G.hits / G.shots * 100) + '%' : '--';
  $('hLevel').textContent = G.level; $('hAcc').textContent = acc; $('hScore').textContent = fmt(G.score); $('hCombo').textContent = 'x' + (1 + Math.min(G.combo, 30) * 0.01).toFixed(2); $('hCoins').textContent = fmt(S.coins);
  if (hudLast.lives !== G.lives || hudLast.max !== G.maxLives) {
    hudLast.lives = G.lives; hudLast.max = G.maxLives; var h = '';
    for (var i = 0; i < G.maxLives; i++) h += '<i class="life' + (i < G.lives ? '' : ' off') + '"></i>';
    $('hLives').innerHTML = h;
  }
  hudDirty = false;
}
function updateSlots() {
  if (slotsEl.hidden) return;
  var key = S.owned.join(','); if (key !== slotKey) { slotKey = key; buildSlots(); }
  for (var i = 0; i < slotEls.length; i++) {
    var s = slotEls[i], hp = G.gunHP[s.id], mx = GUNS[s.id].hp;
    s.hp.style.width = clamp(hp / mx, 0, 1) * 100 + '%'; s.b.classList.toggle('on', s.id === G.gun); s.b.classList.toggle('broken', hp <= 0);
    var cd = G.swapCd > 0 && s.id !== G.gun && hp > 0 && (G.mode === 'play' || G.mode === 'boss'); s.cd.hidden = !cd; if (cd) s.cd.textContent = Math.ceil(G.swapCd);
  }
}

// ----- input -----
var pointerId = -1;
function aimFrom(e) { var r = canvas.getBoundingClientRect(); G.aimX = (e.clientX - r.left) * (W / r.width); G.aimY = (e.clientY - r.top) * (H / r.height); }
canvas.addEventListener('pointerdown', function (e) {
  auInit(); G.touch = e.pointerType === 'touch' || e.pointerType === 'pen'; aimFrom(e);
  if (G.paused || (G.mode !== 'play' && G.mode !== 'boss')) return;
  e.preventDefault(); pointerId = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
  G.hold = true;
});
canvas.addEventListener('pointermove', function (e) { aimFrom(e); if (e.pointerType === 'mouse') G.touch = false; });
function endPtr(e) { if (e.pointerId === pointerId) { G.hold = false; pointerId = -1; } }
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr); canvas.addEventListener('lostpointercapture', endPtr);
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
window.addEventListener('keydown', function (e) {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  var k = e.key;
  if (k === 'p' || k === 'P' || k === 'Escape') { if (!e.repeat) { auInit(); togglePause(); } e.preventDefault(); }
  else if (k === 'm' || k === 'M') { S.music = S.sfx = !(S.music || S.sfx); applyAudioPrefs(); }
  else if (k >= '1' && k <= '8') { var id = +k - 1; if (!G.paused && (G.mode === 'play' || G.mode === 'boss') && S.owned.indexOf(id) >= 0) { var r = swapGun(id); if (r === 'cooldown' || r === 'broken') sfx('deny'); } }
  else if (k === ' ' || k === 'Enter') {
    if (G.mode === 'menu' && !overlay.hidden && panelState.name === 'menu') { e.preventDefault(); if (S.run) startContinue(); else startNew(); }
    else if ((G.mode === 'play' || G.mode === 'boss') && !G.paused && k === ' ') { e.preventDefault(); if (!e.repeat) { G.hold = true; G.aimX = G.aimX || W / 2; } }
  }
});
window.addEventListener('keyup', function (e) { if (e.key === ' ') G.hold = false; });
btnPause.addEventListener('click', function () { auInit(); togglePause(); });
btnMute.addEventListener('click', function () { auInit(); S.music = S.sfx = !(S.music || S.sfx); applyAudioPrefs(); if (S.music) { if (G.mode === 'menu') musicPlay('menu', 0); } });
document.addEventListener('visibilitychange', function () { if (document.hidden && !G.paused && (G.mode === 'play' || G.mode === 'boss')) uiPause(); });
window.addEventListener('blur', function () { G.hold = false; });
document.addEventListener('pointerdown', function () { auInit(); }, { once: false, passive: true });

// ----- loop and quality governor -----
var lastT = 0, fAcc = 0, fN = 0, goodT = 0, layoutPending = false;
function layoutSoon() { layoutPending = true; }
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  var raw = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (layoutPending) { layoutPending = false; layout(); }
  if (!G.paused && G.mode !== 'boot') { time += raw; update(raw * G.ts, raw); }
  else if (G.mode === 'boot') time += raw;
  if (G.mode === 'menu' && G.paused) G.paused = false;
  draw();
  if (hudDirty) updateHud();
  if (!slotsEl.hidden) { slotT += raw; if (slotT > 0.1) { slotT = 0; updateSlots(); } }
  // governor: only runs while playing
  if (S.quality === 'auto' && (G.mode === 'play' || G.mode === 'boss') && !G.paused) {
    fAcc += raw; fN++;
    if (fAcc > 2.5) {
      var avg = fAcc / fN * 1000; fAcc = 0; fN = 0;
      if (avg > 26 && qi > 1) { qi--; Q = QTAB[qi]; layout(); goodT = 0; }
      else if (avg < 15) { goodT += 2.5; if (goodT > 12 && qi < 3) { qi++; Q = QTAB[qi]; layout(); goodT = 0; } } else goodT = 0;
    }
  }
}
var slotT = 0;
if (window.ResizeObserver) new ResizeObserver(function () { layoutSoon(); }).observe(field); else window.addEventListener('resize', layoutSoon);
window.addEventListener('orientationchange', function () { setTimeout(layoutSoon, 250); });

// ----- boot: load the pictures, build the art, show the menu -----
function loadImg(src, cb) { var im = new Image(); im.onload = function () { cb(im); }; im.onerror = function () { cb(null); }; im.src = src; }
function boot() {
  loadSave(); setAudioFlags(S.music, S.sfx); syncMute();
  if (S.quality !== 'auto') qi = { low: 1, medium: 2, high: 3 }[S.quality] || 3; else qi = (window.devicePixelRatio > 2 || navigator.hardwareConcurrency <= 4) ? 2 : 3; Q = QTAB[qi];
  loadImg(IMG_TARGET, function (a) {
    loadImg(IMG_BOSS, function (b) {
      if (!a || !b) { panel.innerHTML = '<h2>Could not load the pictures.</h2>'; overlay.hidden = false; return; }
      buildHamim(a); buildBoss(b); buildBackgrounds(); buildGuns();
      layout(); G.mode = 'menu'; uiMenu(); layout();
      requestAnimationFrame(frame);
    });
  });
}
if (/debug/.test(location.hash)) {
  window.__HB = { ev: function (s) { return eval(s); } };
}
document.fonts && document.fonts.ready && document.fonts.ready.then(function () {});
boot();
