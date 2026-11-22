// People: a varied crowd (different heights, shirt/pants colours, skin tones,
// caps, bags, poses — never identical dolls), the third-person player, armed
// guards with rifles, and the downed enemy with its pulsing red ring.
import * as THREE from 'three';
import { makeRng } from './rng.js';

const SHIRTS = [0xff3b30, 0xffd21f, 0x39d353, 0xff7a33, 0x2ee6c8, 0x7b2fbe, 0xf4f6f8, 0x1971c2, 0xff8fab, 0x8a6a45];
const PANTS = [0x1c2a3a, 0x3a3f47, 0x6b4a2a, 0x2c3e55, 0x5a4a6a, 0x8a8a8a, 0x222222];
const SKINS = [0xf2c9a0, 0xc98d64, 0x8a5a32, 0x6b4423, 0xe8b88a, 0x5a3a22];

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// One pedestrian. `variety` picks height, colours, cap, bag and pose from the
// seeded rng, so a crowd of forty reads as forty people, not forty copies.
export function makePedestrian(rng, opts = {}) {
  const g = new THREE.Group();
  const height = opts.height ?? rng.range(1.55, 1.95);
  const s = height / 1.75;
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin ?? rng.pick(SKINS), roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? rng.pick(SHIRTS), roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? rng.pick(PANTS), roughness: 0.9 });
  const legH = 0.78 * s, torsoH = 0.62 * s;
  // Legs (two, slightly apart; one may step forward for a walking pose).
  const step = opts.walking ? rng.range(-0.18, 0.18) : 0;
  g.add(box(0.16 * s, legH, 0.16 * s, pants, -0.11 * s, legH / 2, step));
  g.add(box(0.16 * s, legH, 0.16 * s, pants, 0.11 * s, legH / 2, -step));
  // Torso + arms (arms swing opposite when walking; one may carry a bag).
  const torso = box(0.46 * s, torsoH, 0.26 * s, shirt, 0, legH + torsoH / 2, 0);
  g.add(torso);
  const armSwing = opts.walking ? rng.range(-0.25, 0.25) : 0;
  g.add(box(0.12 * s, 0.55 * s, 0.12 * s, shirt, -0.3 * s, legH + torsoH - 0.28 * s, armSwing));
  g.add(box(0.12 * s, 0.55 * s, 0.12 * s, shirt, 0.3 * s, legH + torsoH - 0.28 * s, -armSwing));
  // Head: skin-tone box with a darker hair cap; never a flat sticker face.
  const headY = legH + torsoH + 0.16 * s;
  g.add(box(0.3 * s, 0.32 * s, 0.28 * s, skin, 0, headY, 0));
  const hairCol = rng.pick([0x14161a, 0x3a2a1a, 0x6b4a22, 0x8a8a8a, 0x222222]);
  g.add(box(0.32 * s, 0.1 * s, 0.3 * s, new THREE.MeshStandardMaterial({ color: hairCol, roughness: 1 }), 0, headY + 0.16 * s, 0, false));
  // Cap on some, bag on others, long hair on others still.
  if (opts.cap || rng.chance(0.3)) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.09 * s, 10),
      new THREE.MeshStandardMaterial({ color: rng.pick([0xff3b30, 0xffd21f, 0x1971c2, 0x39d353]), roughness: 0.8 }));
    cap.position.set(0, headY + 0.2 * s, 0);
    cap.castShadow = true;
    g.add(cap);
    g.add(box(0.2 * s, 0.03 * s, 0.14 * s, cap.material, 0, headY + 0.17 * s, 0.2 * s, false));
  } else if (rng.chance(0.3)) {
    g.add(box(0.3 * s, 0.42 * s, 0.1 * s, new THREE.MeshStandardMaterial({ color: 0x6b4a22, roughness: 1 }), 0, headY - 0.08 * s, -0.17 * s, false));
  }
  if (opts.bag || rng.chance(0.28)) {
    g.add(box(0.12 * s, 0.3 * s, 0.2 * s, new THREE.MeshStandardMaterial({ color: rng.pick([0xff2e88, 0x2ee6c8, 0xff7a33]), roughness: 0.8 }), 0.32 * s, legH + 0.25 * s, 0, false));
  }
  g.userData.height = height;
  return g;
}

// The player, seen from behind in third person: teal jacket, dark jeans, cap.
export function makePlayer() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0x0b7285, roughness: 0.8 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.9 });
  g.add(box(0.17, 0.8, 0.17, jeans, -0.12, 0.4, 0));
  g.add(box(0.17, 0.8, 0.17, jeans, 0.12, 0.4, 0));
  g.add(box(0.5, 0.66, 0.3, jacket, 0, 1.13, 0));
  g.add(box(0.13, 0.58, 0.13, jacket, -0.32, 1.1, 0));
  g.add(box(0.13, 0.58, 0.13, jacket, 0.32, 1.1, 0));
  // Holstered pistol on the hip (the armed-player read).
  g.add(box(0.08, 0.22, 0.3, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5 }), 0.3, 0.85, -0.05, false));
  g.add(box(0.32, 0.34, 0.3, skin, 0, 1.63, 0));
  g.add(box(0.34, 0.1, 0.32, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 1 }), 0, 1.82, 0, false));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.8 }));
  cap.position.set(0, 1.84, 0);
  cap.castShadow = true;
  g.add(cap);
  g.add(box(0.22, 0.03, 0.15, cap.material, 0, 1.81, 0.22, false));
  return g;
}

// Armed guard: dark vest, helmet, rifle held across the chest.
export function makeGuard() {
  const g = new THREE.Group();
  const vest = new THREE.MeshStandardMaterial({ color: 0x2c3430, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 });
  g.add(box(0.17, 0.8, 0.17, pants, -0.12, 0.4, 0));
  g.add(box(0.17, 0.8, 0.17, pants, 0.12, 0.4, 0));
  g.add(box(0.52, 0.68, 0.32, vest, 0, 1.14, 0));
  g.add(box(0.13, 0.56, 0.13, vest, -0.33, 1.1, 0.06));
  g.add(box(0.13, 0.56, 0.13, vest, 0.33, 1.1, 0.06));
  g.add(box(0.32, 0.32, 0.3, skin, 0, 1.64, 0));
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3f35, roughness: 0.8 }));
  helm.position.set(0, 1.78, 0);
  helm.scale.y = 0.75;
  helm.castShadow = true;
  g.add(helm);
  // Rifle across the chest.
  const rifle = box(0.07, 0.07, 0.95, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.5 }), 0.05, 1.25, 0.3);
  rifle.rotation.x = 0.35;
  g.add(rifle);
  return g;
}

// The downed enemy: body lying flat on the ground in the aisle, orange jacket,
// one arm out — plus a pulsing red ring so the eye finds it at a glance.
export function makeDownedEnemy() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff7a33, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  // Legs stretched out along +Z, torso, head, one arm flung wide.
  g.add(box(0.2, 0.18, 0.85, pants, -0.13, 0.12, 0.75));
  g.add(box(0.2, 0.18, 0.85, pants, 0.13, 0.12, 0.75));
  g.add(box(0.52, 0.3, 0.75, jacket, 0, 0.18, -0.05));
  g.add(box(0.32, 0.28, 0.3, skin, 0, 0.16, -0.62));
  g.add(box(0.14, 0.14, 0.7, jacket, -0.42, 0.1, -0.15));
  const arm = box(0.14, 0.14, 0.6, skin, 0.4, 0.1, 0.35);
  arm.rotation.y = 0.7;
  g.add(arm);
  // Dropped rifle beside the body.
  const rifle = box(0.07, 0.07, 0.95, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.5 }), 0.75, 0.08, -0.3);
  rifle.rotation.y = 0.5;
  g.add(rifle);
  // Pulsing red ring on the ground around the body.
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 32),
    new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  g.userData.ring = ring;
  return g;
}

// Build the market crowd: dense, varied, walking the aisle in both directions.
export function buildCrowd(scene, count = 42) {
  const rng = makeRng(4242);
  const crowd = new THREE.Group();
  const walkers = [];
  for (let i = 0; i < count; i++) {
    const ped = makePedestrian(rng, { walking: true });
    const lane = rng.pick([-3.4, -1.6, 1.6, 3.4]);
    const z = rng.range(24, 52);
    ped.position.set(lane + rng.range(-0.7, 0.7), 0, z);
    ped.rotation.y = lane < 0 ? Math.PI / 2 + rng.range(-0.3, 0.3) : -Math.PI / 2 + rng.range(-0.3, 0.3);
    if (rng.chance(0.25)) ped.rotation.y = rng.range(0, Math.PI * 2); // browsers at stalls
    crowd.add(ped);
    walkers.push({ mesh: ped, speed: rng.range(0.4, 1.0), dir: lane < 0 ? -1 : 1, lane });
  }
  // A few beachgoers on the sand too.
  for (let i = 0; i < 8; i++) {
    const ped = makePedestrian(rng, { walking: false });
    ped.position.set(rng.range(-70, 70), 0, rng.range(-78, -64));
    ped.rotation.y = rng.range(0, Math.PI * 2);
    crowd.add(ped);
  }
  scene.add(crowd);
  return { group: crowd, walkers };
}
