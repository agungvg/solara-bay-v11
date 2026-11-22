// Weapons: six slots with ammo, tracers and hit feedback. Slot 1 is fists
// (infinite); the rest spend ammo and reload from the player's reserve.
import * as THREE from 'three';

export const WEAPONS = [
  { slot: 1, name: 'FISTS', icon: '✊', ammo: Infinity, reserve: Infinity, damage: 12, rate: 0.45, range: 2.2, auto: false },
  { slot: 2, name: '.38', icon: '🔫', ammo: 60, reserve: 120, damage: 22, rate: 0.3, range: 42, auto: false },
  { slot: 3, name: 'SMG', icon: '🔫', ammo: 30, reserve: 60, damage: 14, rate: 0.09, range: 38, auto: true },
  { slot: 4, name: '12G', icon: '💥', ammo: 18, reserve: 24, damage: 55, rate: 0.8, range: 22, auto: false },
  { slot: 5, name: 'AR-9', icon: '🎯', ammo: 45, reserve: 90, damage: 30, rate: 0.12, range: 60, auto: true, locked: false },
  { slot: 6, name: 'RPG', icon: '🚀', ammo: 0, reserve: 0, damage: 120, rate: 1.4, range: 70, auto: false, locked: true },
];

export class WeaponSystem {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.slots = WEAPONS.map((w) => ({ ...w }));
    this.active = 3; // SMG selected by default, as in the cover
    this.cooldown = 0;
    this.tracers = [];
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
  }

  get current() { return this.slots[this.active - 1]; }

  select(slot) {
    if (slot < 1 || slot > 6) return false;
    const w = this.slots[slot - 1];
    if (w.locked) return false;
    this.active = slot;
    return true;
  }

  // Fire from `origin` toward `dir`; returns the hit result or a failure reason.
  fire(origin, dir, targets) {
    const w = this.current;
    if (this.cooldown > 0) return { ok: false, reason: 'cooldown' };
    if (w.ammo <= 0) return { ok: false, reason: 'no ammo' };
    this.cooldown = w.rate;
    if (w.ammo !== Infinity) w.ammo -= 1;
    const hit = this.raycast(origin, dir, targets, w.range);
    this.spawnTracer(origin, hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(w.range)));
    if (hit) hit.target.health -= w.damage;
    return { ok: true, hit: hit ? hit.target.id : null, damage: w.damage };
  }

  raycast(origin, dir, targets, range) {
    let best = null;
    for (const t of targets) {
      const to = t.position.clone().sub(origin);
      const along = to.dot(dir);
      if (along < 0 || along > range) continue;
      const perp = to.clone().addScaledVector(dir, -along).length();
      if (perp < 1.4 && (!best || along < best.along)) best = { target: t, point: origin.clone().addScaledVector(dir, along), along };
    }
    return best;
  }

  spawnTracer(from, to) {
    const len = from.distanceTo(to);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), this.tracerMat);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.lookAt(to);
    mesh.userData.life = 0.09;
    this.scene.add(mesh);
    this.tracers.push(mesh);
  }

  reload() {
    const w = this.current;
    if (w.ammo === Infinity || w.reserve <= 0) return false;
    const need = (w.slot === 3 ? 30 : w.slot === 2 ? 60 : 18) - w.ammo;
    const take = Math.min(need, w.reserve);
    w.ammo += take;
    w.reserve -= take;
    return take > 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.life -= dt;
      if (t.userData.life <= 0) {
        this.scene.remove(t);
        this.tracers.splice(i, 1);
      }
    }
  }
}
