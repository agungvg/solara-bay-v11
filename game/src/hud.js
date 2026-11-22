// HUD: every DOM panel names its authoritative source field. Wanted, cash,
// mission, police distances, weapon ammo and speed all come from the game
// state — the HUD never invents a number. Critical info is never colour-only:
// stars, text and position all carry the state.
import { WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor(minimap) {
    this.minimap = minimap;
    this.buildWeapons();
    this.buildCrew();
  }

  buildWeapons() {
    const wrap = $('weapons');
    wrap.innerHTML = '';
    for (const w of WEAPONS) {
      const div = document.createElement('div');
      div.className = `wslot${w.locked ? ' locked' : ''}`;
      div.id = `wslot-${w.slot}`;
      div.innerHTML = `<span class="n">${w.slot}</span><span class="ic">${w.icon}</span>${w.name}<br><span class="ammo">${w.locked ? 'LOCKED' : w.ammo === Infinity ? '∞' : w.ammo}</span>`;
      wrap.appendChild(div);
    }
  }

  buildCrew() {
    const wrap = $('crew');
    const crew = [
      { av: 'MK', cls: '', name: 'SWAP PLATES', who: 'Mira · Driver', cd: 'Z' },
      { av: '21', cls: 'b', name: 'QUICK FIX', who: 'Lio · Mechanic', cd: 'X' },
      { av: 'K', cls: 'c', name: 'EYES OUT', who: 'Kiki · Lookout', cd: 'C' },
    ];
    wrap.innerHTML = '';
    for (const c of crew) {
      const div = document.createElement('div');
      div.className = 'crew-card';
      div.innerHTML = `<div class="av ${c.cls}">${c.av}</div><div><b>${c.name}</b><span>${c.who}</span></div><div class="cd">${c.cd}</div>`;
      wrap.appendChild(div);
    }
  }

  // One full refresh from the game state; called every frame (cheap DOM writes
  // are guarded by change checks where they matter).
  update(state, mission, police) {
    $('mission-tag').textContent = `MISSION ${mission.id}`;
    $('mission-kind').textContent = mission.kind;
    $('mission-sub').textContent = mission.stages[Math.min(state.stageIndex, mission.stages.length - 1)].label;
    $('stage-fill').style.width = `${((state.stageIndex + 1) / mission.stages.length) * 100}%`;
    $('stage-label').textContent = `STAGE ${Math.min(state.stageIndex + 1, mission.stages.length)}/${mission.stages.length}`;
    $('mission-next').textContent = mission.stages[Math.min(state.stageIndex + 1, mission.stages.length - 1)]?.label ?? 'Done';
    $('timer-text').textContent = formatTime(state.missionTimer);
    $('cash').textContent = `$${state.cash.toLocaleString('en-US')}`;
    $('clock').textContent = state.clock;
    const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    $('wanted').innerHTML = stars.split('').map((s, i) => (i < state.wanted ? s : `<span class="off">${s}</span>`)).join('');
    $('insight').style.display = police.inSight ? '' : 'none';
    $('insight').textContent = police.inSight ? 'IN SIGHT' : '';
    $('air-tag').style.display = state.wanted >= 3 ? '' : 'none';
    $('rp-fill').style.width = `${(state.rp % 5200) / 52}%`;
    // Police panel: named units, roles, live distances.
    const active = police.units.filter((u) => u.active).slice(0, 5);
    $('unit-count').textContent = `${police.activeCount} UNITS`;
    $('unit-table').innerHTML = active.map((u) => (
      `<tr><td>${u.name}</td><td>${u.role}</td><td class="d">${u.distance} m</td><td class="r"><span class="role ${u.cls}">${u.role.split(' ')[0]}</span></td></tr>`
    )).join('');
    $('unit-more').textContent = police.activeCount > 5 ? `+${police.activeCount - 5} more` : 'all units on screen';
    $('unit-more').style.display = police.activeCount > 0 ? '' : 'none';
    $('police-panel').style.display = police.activeCount > 0 ? '' : 'none';
    // District + vitals.
    $('district-name').textContent = state.district;
    $('district-street').textContent = state.street;
    $('district-meter').style.width = `${state.standing}%`;
    $('district-standing').textContent = `${state.standing >= 70 ? 'FRIENDLY' : state.standing >= 40 ? 'NEUTRAL' : 'WARY'} · ${state.standing}`;
    $('health-num').textContent = state.health;
    $('health-bar').style.width = `${state.health}%`;
    $('armour-num').textContent = state.armour;
    $('armour-bar').style.width = `${state.armour}%`;
    // Weapons.
    for (const w of state.weapons) {
      const el = $(`wslot-${w.slot}`);
      if (!el) continue;
      el.classList.toggle('active', w.slot === state.activeWeapon);
      el.querySelector('.ammo').textContent = w.locked ? 'LOCKED' : w.ammo === Infinity ? '∞' : `${w.ammo}${w.reserve ? `/${w.reserve}` : ''}`;
    }
    // Speed + vehicle.
    $('vehicle').textContent = state.driving ? state.vehicleName : 'ON FOOT — ' + state.district;
    $('cond-num').textContent = state.driving ? `${state.condition}% DENTED` : '—';
    $('cond-fill').style.width = `${state.condition}%`;
    $('speed').innerHTML = `${Math.round(state.speedKmh)} <small>KM/H</small>`;
    $('radio-line').textContent = `♪ ${state.radio}`;
    $('dialogue-line').textContent = state.dialogue;
    // Minimap.
    this.minimap.draw({
      player: { x: state.player.x, z: state.player.z, heading: state.player.heading },
      missionMarker: state.missionMarker,
      policeBlips: state.policeBlips,
    });
  }

  showToast(big, sub, ms = 2600) {
    const t = $('objective-toast');
    $('toast-big').textContent = big;
    $('toast-sub').textContent = sub;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), ms);
  }

  showHint(text, ms = 5000) {
    const h = $('hint');
    h.textContent = text;
    h.classList.remove('hidden');
    setTimeout(() => h.classList.add('hidden'), ms);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
