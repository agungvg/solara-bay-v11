// MAP / STATS meta screen: a real city map (dense street grid, 8 districts,
// markers, route line, labels + friendly/wary meters), progress tracks, mission
// ratings, career stats, the workshop + weapons & gear economy, and 3 save slots.
import { MISSIONS, MISSION_RATINGS } from './missions.js';
import { WEAPONS } from './weapons.js';
import { readSaves, saveSlotLabel } from './save.js';

const $ = (id) => document.getElementById(id);

const DISTRICTS = [
  { name: 'KUMALA STRAND', x: 250, y: 40, w: 150, h: 70, standing: 58, tone: '#2ee6c8' },
  { name: 'MARINA', x: 410, y: 40, w: 120, h: 70, standing: 71, tone: '#2ee6c8' },
  { name: 'LANTERN MARKET', x: 60, y: 150, w: 150, h: 80, standing: 74, tone: '#ffd21f' },
  { name: 'DOWNTOWN', x: 250, y: 150, w: 150, h: 90, standing: 42, tone: '#ff7a33' },
  { name: 'PALM HEIGHTS', x: 430, y: 150, w: 140, h: 80, standing: 66, tone: '#ffd21f' },
  { name: 'DOCKS', x: 60, y: 260, w: 150, h: 80, standing: 33, tone: '#ff7a33' },
  { name: 'SOLARA TOWER', x: 250, y: 270, w: 150, h: 80, standing: 21, tone: '#ff2e88' },
  { name: 'TARPON BRIDGE', x: 430, y: 260, w: 140, h: 80, standing: 47, tone: '#ff2e88' },
];

const TRACKS = [
  { name: 'STORY MISSIONS', done: 5, total: 8 },
  { name: 'STREET RACES', done: 3, total: 6 },
  { name: 'STUNT JUMPS', done: 7, total: 12 },
  { name: 'COLLECTIBLES', done: 11, total: 20 },
  { name: 'EXPORT LIST', done: 4, total: 9 },
  { name: 'DISTRICT JOBS', done: 9, total: 14 },
  { name: 'DISTRICTS FRIENDLY', done: 3, total: 8 },
  { name: 'CREW RECRUITED', done: 3, total: 5 },
];

const CAREER = [
  ['Cars stolen', '14'], ['Cops escaped', '23'], ['Highest wanted', '4 ★'],
  ['Distance driven', '312 km'], ['People taken out', '9'], ['Longest jump', '38 m'],
  ['Gold mission ratings', '2'], ['Hidden by locals', '6 times'],
];

const WORKSHOP = [
  { name: 'NITRO KIT', price: 2400, state: 'OWNED' },
  { name: 'ARMOUR PLATING', price: 1800, state: 'OWNED' },
  { name: 'TURBO TUNE', price: 3200, state: '$3,200' },
  { name: 'BULLETPROOF TYRES', price: 1500, state: '$1,500' },
  { name: 'SUNSET PAINT — PELO ORANGE', price: 900, state: 'OWNED' },
  { name: 'LOWERED SUSPENSION', price: 1100, state: '$1,100' },
];

export class MetaScreen {
  constructor(state) {
    this.state = state;
    this.buildMap();
    this.buildProgress();
    this.buildCareer();
    this.buildWorkshop();
    this.buildGear();
    this.buildSaves();
  }

  buildMap() {
    const svg = $('city-map');
    let s = '';
    // Ocean + sand at the top of the map.
    s += '<rect x="0" y="0" width="640" height="70" fill="#1e7f9e"/>';
    s += '<rect x="0" y="70" width="640" height="14" fill="#ecd9a4"/>';
    s += '<text x="18" y="30" fill="#bfe9ff" font-size="13" font-weight="900">SOLARA BAY — THE SEA</text>';
    s += '<text x="628" y="30" fill="#ffffff" font-size="12" text-anchor="end">⛵ MARINA · 3 YACHTS</text>';
    // Dense street grid.
    s += '<g stroke="#3d526e" stroke-width="3">';
    for (let x = 40; x <= 620; x += 42) s += `<line x1="${x}" y1="84" x2="${x}" y2="420"/>`;
    for (let y = 110; y <= 400; y += 34) s += `<line x1="0" y1="${y}" x2="640" y2="${y}"/>`;
    s += '</g>';
    s += '<g stroke="#7d94b5" stroke-width="7">';
    s += '<line x1="320" y1="84" x2="320" y2="420"/>';
    s += '<line x1="0" y1="180" x2="640" y2="180"/>';
    s += '</g>';
    // District blocks with labels + standing meters.
    for (const d of DISTRICTS) {
      s += `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="6" fill="#16283e" stroke="${d.tone}" stroke-width="2"/>`;
      s += `<text x="${d.x + 10}" y="${d.y + 20}" fill="#ffffff" font-size="12" font-weight="900">${d.name}</text>`;
      s += `<rect x="${d.x + 10}" y="${d.y + 30}" width="${d.w - 20}" height="6" rx="3" fill="#ffffff22"/>`;
      s += `<rect x="${d.x + 10}" y="${d.y + 30}" width="${(d.w - 20) * d.standing / 100}" height="6" rx="3" fill="${d.tone}"/>`;
      s += `<text x="${d.x + 10}" y="${d.y + 52}" fill="#bfe9ff" font-size="11">${d.standing >= 70 ? 'FRIENDLY' : d.standing >= 40 ? 'NEUTRAL' : 'WARY'} · ${d.standing}</text>`;
    }
    // Route line: Strand Blvd → the pier, with markers.
    s += '<polyline points="320,132 320,200 180,200 180,132 120,132" fill="none" stroke="#ff5b5b" stroke-width="4" stroke-dasharray="10 6"/>';
    s += '<circle cx="320" cy="132" r="8" fill="#ffd21f" stroke="#111" stroke-width="2"/><text x="334" y="136" fill="#ffd21f" font-size="12" font-weight="900">YOU</text>';
    s += '<circle cx="120" cy="132" r="8" fill="#ff2e88" stroke="#fff" stroke-width="2"/><text x="108" y="136" fill="#ff2e88" font-size="12" font-weight="900" text-anchor="end">NEXT JOB</text>';
    s += '<circle cx="600" cy="55" r="6" fill="#2ee6c8"/><text x="588" y="59" fill="#2ee6c8" font-size="11" text-anchor="end">YACHT</text>';
    s += '<circle cx="500" cy="320" r="6" fill="#ffffff"/><text x="512" y="324" fill="#ffffff" font-size="11">GARAGE</text>';
    svg.innerHTML = s;
  }

  buildProgress() {
    $('progress-bars').innerHTML = TRACKS.map((t) => {
      const pct = Math.round((t.done / t.total) * 100);
      return `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${t.name}</span><b>${t.done}/${t.total}</b></div>
      <div class="pbar"><i style="width:${pct}%"></i></div>`;
    }).join('')
      + `<div class="mrow"><span>Mission ratings</span><b>${MISSION_RATINGS.slice(0, 5).join(' · ')}</b></div>`;
  }

  buildCareer() {
    $('career-stats').innerHTML = CAREER.map(([k, v]) => `<div class="mrow"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  buildWorkshop() {
    $('workshop-list').innerHTML = WORKSHOP.map((w) => (
      `<div class="shop-item"><span>${w.name}</span><span class="${w.state === 'OWNED' ? 'own' : 'price'}">${w.state}</span></div>`
    )).join('')
      + `<div style="font-size:12px;color:#bfe9ff;margin-top:6px">“You break it, I bill it.” — Lio, mechanic</div>`;
  }

  buildGear() {
    $('gear-list').innerHTML = WEAPONS.map((w) => (
      `<div class="shop-item"><span>${w.slot} · ${w.name} ${w.icon}</span><span class="${w.locked ? 'lock' : 'own'}">${w.locked ? 'LOCKED' : w.ammo === Infinity ? '∞' : w.ammo + ' RDS'}</span></div>`
    )).join('');
  }

  buildSaves() {
    const saves = readSaves();
    $('save-slots').innerHTML = saves.map((s, i) => (
      `<div class="shop-item"><span>SLOT ${i + 1}</span><span style="font-size:12px">${saveSlotLabel(s)}</span></div>`
    )).join('');
  }

  show() {
    this.buildSaves();
    $('meta-cash').textContent = `$${this.state.cash.toLocaleString('en-US')}`;
    $('meta-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
  }

  hide() {
    $('meta-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
  }
}

export { MISSIONS };
