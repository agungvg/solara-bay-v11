// Wanted + police: a 0–5 state machine with named KPD units, roles and live
// distances. Police modes: patrol → pursue (inside the leash) → search (last
// known position) → recover. Every transition records its reason.
import * as THREE from 'three';

export const UNIT_ROSTER = [
  { name: 'KITE-1', role: 'MARKSMAN', cls: 'mark' },
  { name: 'MARLIN-3', role: 'SHORE WATCH', cls: 'shore' },
  { name: 'CORAL-48', role: 'RAMMING', cls: 'ram' },
  { name: 'CORAL-85', role: 'FLANKING', cls: 'flank' },
  { name: 'CORAL-43', role: 'RAMMING', cls: 'ram' },
  { name: 'AIR-1', role: 'SPOTLIGHT', cls: 'spot' },
  { name: 'BULWARK-2', role: 'ROADBLOCK', cls: 'block' },
];

const WANTED_NAMES = ['CLEAN', 'NOTICED', 'CHASED', 'HUNTED', 'MANHUNT', 'LOCKDOWN'];

export class PoliceSystem {
  constructor(state) {
    this.state = state;
    this.wanted = 0;
    this.mode = 'patrol'; // patrol | pursue | search | recover
    this.lastKnown = new THREE.Vector3(0, 0, 0);
    this.searchTimer = 0;
    this.units = UNIT_ROSTER.map((u) => ({ ...u, distance: 0, active: false }));
    this.log = [];
  }

  get wantedName() { return WANTED_NAMES[this.wanted]; }

  // How many units respond at this wanted level.
  get activeCount() {
    return [0, 2, 3, 4, 6, 7][this.wanted];
  }

  raise(level, reason) {
    const before = this.wanted;
    this.wanted = Math.max(0, Math.min(5, level));
    if (this.wanted > before) {
      this.mode = 'pursue';
      this.log.push({ t: this.state.time, from: before, to: this.wanted, reason });
    }
    this.syncUnits();
    return this.wanted;
  }

  lower(level, reason) {
    const before = this.wanted;
    this.wanted = Math.max(0, Math.min(5, level));
    if (this.wanted < before) {
      this.mode = this.wanted === 0 ? 'recover' : 'search';
      this.searchTimer = 12;
      this.log.push({ t: this.state.time, from: before, to: this.wanted, reason });
    }
    this.syncUnits();
    return this.wanted;
  }

  syncUnits() {
    this.units.forEach((u, i) => { u.active = i < this.activeCount; });
  }

  commitCrime(kind) {
    if (kind === 'ram' || kind === 'shoot') this.raise(Math.min(5, this.wanted + 1), `crime_seen:${kind}`);
    else if (kind === 'steal') this.raise(Math.max(this.wanted, 1), 'crime_seen:steal');
  }

  // Distances are live: measured from each unit's car/heli to the player.
  update(dt, playerPos, unitPositions) {
    for (let i = 0; i < this.units.length; i++) {
      const pos = unitPositions[i];
      this.units[i].distance = pos ? Math.round(pos.distanceTo(playerPos)) : 999;
    }
    if (this.mode === 'pursue') {
      this.lastKnown.copy(playerPos);
      this.searchTimer = 12;
    } else if (this.mode === 'search') {
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) this.lower(this.wanted - 1, 'timer_expired');
    }
    void dt;
  }

  // The player is "in sight" while any active unit is close and pursuing.
  get inSight() {
    return this.mode === 'pursue' && this.units.some((u) => u.active && u.distance < 60);
  }
}
