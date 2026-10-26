// ---------- game data: guns, bosses, powers, climates, economy ----------
// Damage scale: a normal Hamim has 10 HP, the Water Pistol does 10 per shot.
var GUNS = [
  { id: 0, name: 'Water Pistol', note: 'Light blue plastic. Reliable, if a bit soft.', dmg: 10, rate: 2.2, pellets: 1, spread: 0, splash: 0, pierce: false, hp: 220, price: 0,
    balls: ['#4fc3ff', '#9be3ff', '#ffffff'], tex: 'Plastic' },
  { id: 1, name: 'Splat Revolver', note: 'Brass and wood. Slow, but each shot lands hard.', dmg: 20, rate: 1.6, pellets: 1, spread: 0, splash: 0, pierce: false, hp: 260, price: 120,
    balls: ['#ff6b4a', '#ffd23f', '#ff3d8b'], tex: 'Brass and wood' },
  { id: 2, name: 'Twin Pop', note: 'Two striped barrels. Fast and sweet.', dmg: 14, rate: 3.2, pellets: 1, spread: 0, splash: 0, pierce: false, hp: 300, price: 340,
    balls: ['#ff3b5c', '#ffffff', '#ff8fa3'], tex: 'Candy stripes' },
  { id: 3, name: 'Rainbow SMG', note: 'Chrome body, rainbow stripe. Sprays a lot of paint.', dmg: 11, rate: 6, pellets: 1, spread: 0, splash: 0, pierce: false, hp: 340, price: 780,
    balls: ['#ff3b3b', '#ff9d2e', '#ffe23b', '#3bd65a', '#33b6ff', '#8a4dff'], tex: 'Chrome' },
  { id: 4, name: 'Paint Shotgun', note: 'Rusty and loud. Five pellets per blast.', dmg: 13, rate: 1.15, pellets: 5, spread: 0.075, splash: 0, pierce: false, hp: 400, price: 1500,
    balls: ['#ff4fa3', '#35e6ff', '#ffe15a'], tex: 'Rusted metal' },
  { id: 5, name: 'Gloop Launcher', note: 'Slime blobs that splash everything nearby.', dmg: 85, rate: 1.0, pellets: 1, spread: 0, splash: 0.085, pierce: false, hp: 460, price: 2600,
    balls: ['#37d67a', '#7dffb2'], tex: 'Slime' },
  { id: 6, name: 'Neon Minigun', note: 'Spins up, then never stops. Glows in the dark.', dmg: 12, rate: 12, pellets: 1, spread: 0, splash: 0, pierce: false, hp: 540, price: 4200,
    balls: ['#35e6ff', '#ff3bd1'], tex: 'Neon', spin: true },
  { id: 7, name: 'Golden Honesty Blaster', note: 'Pure gold. Pierces shields and blasts crowds.', dmg: 60, rate: 6, pellets: 1, spread: 0, splash: 0.05, pierce: true, hp: 700, price: 7000,
    balls: ['#ffd54a', '#fff3b0', '#ffffff'], tex: 'Gold' }
];
function gunPower(g) { return g.dmg * g.rate * (g.pellets > 1 ? 1.25 : 1) * (g.splash ? 1.3 : 1) * (g.pierce ? 1.25 : 1); }
var MAX_POWER = gunPower(GUNS[7]);

// Mutant powers. Power k unlocks after boss k is defeated.
var POWERS = [
  null,
  { id: 1, name: 'Sprinter', col: '#ffe15a', info: 'Much faster' },
  { id: 2, name: 'Watchful', col: '#35e6ff', info: 'Dodges some shots' },
  { id: 3, name: 'Thick Skin', col: '#b8863b', info: 'Takes more hits' },
  { id: 4, name: 'Zigzag', col: '#7dff7a', info: 'Hard to track' },
  { id: 5, name: 'Shielded', col: '#8fd0ff', info: 'First hit breaks a shield' },
  { id: 6, name: 'Winged', col: '#ffffff', info: 'Flies' },
  { id: 7, name: 'Sneaky', col: '#b26bff', info: 'Fades in and out' },
  { id: 8, name: 'Healer', col: '#4be38a', info: 'Heals other mutants' },
  { id: 9, name: 'Splitter', col: '#ff9d2e', info: 'Splits when hit' },
  { id: 10, name: 'Rage', col: '#ff3b3b', info: 'Faster as it gets hurt' }
];

var BOSS_TITLES = ['', 'THE BUZZ', 'THE STINGER', 'HIVE GUARD', 'SWARM LORD', "QUEEN'S BLADE", 'WINGED TERROR', 'PHANTOM DRONE', 'HONEY WARDEN', 'APEX STINGER', 'THE FINAL BUZZ'];
// Colour theme per boss: hue shift (degrees) on his picture, saturation / lightness tweaks, aura colour.
var BOSS_LOOK = [
  null,
  { hue: 0, sat: 1.0, lum: 0, aura: [255, 210, 60] },
  { hue: -38, sat: 1.15, lum: -0.02, aura: [255, 110, 40] },
  { hue: 80, sat: 1.1, lum: 0, aura: [90, 255, 90] },
  { hue: 160, sat: 1.15, lum: 0, aura: [60, 235, 255] },
  { hue: 215, sat: 1.1, lum: -0.03, aura: [90, 130, 255] },
  { hue: 262, sat: 1.1, lum: 0, aura: [180, 100, 255] },
  { hue: 300, sat: 1.2, lum: 0, aura: [255, 70, 220] },
  { hue: 345, sat: 1.25, lum: -0.1, aura: [255, 50, 70] },
  { hue: 0, sat: 0.15, lum: 0.18, aura: [235, 240, 255] },
  { hue: 330, sat: 1.3, lum: -0.18, aura: [255, 30, 90] }
];

// Climates: index 0 is the clear start, then one more for each boss defeated.
var CLIMATES = [
  { name: 'Clear Skies', tint: [0, 0, 0, 0], pcol: ['#ffffff'], shape: 0, snd: 1, wind: 0, rainS: 0 },
  { name: 'Warm Breeze', tint: [255, 200, 110, 0.07], leaves: 1, pcol: ['#ffe27a', '#9be86a'], shape: 1, snd: 1.05, wind: 0.25, rainS: 0 },
  { name: 'Drizzle', tint: [70, 110, 160, 0.15], rain: 0.45, dark: 0.08, pcol: ['#9fd0ff', '#ffffff'], shape: 2, snd: 0.95, wind: 0.2, rainS: 0.3 },
  { name: 'Thunderstorm', tint: [40, 50, 100, 0.26], rain: 1, light: 1, dark: 0.18, pcol: ['#fff27a', '#9fd0ff'], shape: 3, snd: 0.9, wind: 0.4, rainS: 0.75 },
  { name: 'Thick Fog', tint: [200, 210, 225, 0.16], fog: 1, pcol: ['#e6eef5', '#ffffff'], shape: 4, snd: 0.85, wind: 0.25, rainS: 0 },
  { name: 'Snowfall', tint: [170, 210, 255, 0.15], snow: 1, pcol: ['#d6f0ff', '#ffffff'], shape: 5, snd: 1.15, wind: 0.35, rainS: 0 },
  { name: 'Sandstorm', tint: [235, 160, 70, 0.2], sand: 1, dark: 0.08, pcol: ['#f5c978', '#d9a04a'], shape: 6, snd: 0.9, wind: 0.85, rainS: 0 },
  { name: 'Ember Rain', tint: [255, 70, 20, 0.16], ember: 1, dark: 0.1, pcol: ['#ff9d2e', '#ff4a10'], shape: 7, snd: 0.8, wind: 0.3, rainS: 0 },
  { name: 'Meteor Shower', tint: [120, 60, 200, 0.2], meteor: 1, light: 0.35, dark: 0.22, pcol: ['#c9a0ff', '#ffffff'], shape: 8, snd: 1.2, wind: 0.2, rainS: 0 },
  { name: 'Blood Eclipse', tint: [200, 20, 40, 0.22], aurora: 1, dark: 0.3, pcol: ['#ff4d6a', '#ffb0b8'], shape: 9, snd: 0.75, wind: 0.35, rainS: 0 },
  { name: 'Glitch Collapse', tint: [150, 0, 255, 0.18], glitch: 1, dark: 0.2, pcol: ['#35e6ff', '#ff3bd1'], shape: 10, snd: 1, wind: 0.2, rainS: 0 }
];

var DIFFS = {
  easy: { name: 'Easy', speed: 0.82, lives: 7, take: 0.7, boss: 0.8, atk: 1.2, spawn: 1.15 },
  normal: { name: 'Normal', speed: 1, lives: 5, take: 1, boss: 1, atk: 1, spawn: 1 },
  hard: { name: 'Hard', speed: 1.15, lives: 4, take: 1.3, boss: 1.2, atk: 0.82, spawn: 0.88 }
};

// ---------- difficulty curve: climbs, then flattens so it never becomes unplayable ----------
function speedMul(n) { return 1 + 0.8 * (1 - Math.exp(-(n - 1) / 16)); }
function spawnGap(n) { return 0.8 + 0.8 * Math.exp(-(n - 1) / 14); }
function maxWalkers(n) { return 3 + Math.floor(n / 8); }
function levelQuota(n) { return 9 + Math.floor(n / 4); }
function bossHp(k) { return Math.round(800 * Math.pow(1.48, k - 1)); }
// ---------- economy (the currency is called সততা) ----------
function coinsNormal(stage) { return 1 + stage; }
function coinsMutant(stage) { return 12 + 10 * stage; }
function coinsLevel(stage) { return 10 + 6 * stage; }
function coinsBoss(k) { return 120 + 150 * k; }

var BG_INFO = [
  { id: 0, name: 'Pixel Meadow', note: 'Sunny hills and tall trees. Where it all starts.', price: 0 },
  { id: 1, name: 'Neon City', note: 'A synthwave night with a glowing grid floor.', price: 400 },
  { id: 2, name: 'Desert Ruins', note: 'Sunset dunes and crumbling stone.', price: 800 },
  { id: 3, name: 'Lava Citadel', note: 'A volcano, a dark castle and drifting embers.', price: 1400 }
];
