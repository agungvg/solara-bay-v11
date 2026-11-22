// Vehicles: hero sports car (silhouette first — S-curve body, tumblehome
// greenhouse, fender flares), black-and-white KPD police cars with POLICE door
// lettering, light bars and push bars, traffic, a scooter, a tank roadblock
// and the police helicopter with its searchlight cone.
import * as THREE from 'three';
import { policeDoorTexture, nineOneOneTexture } from './textures.js';

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

function wheel(r = 0.42, w = 0.34) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.25, metalness: 0.8 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

// Hero sports car: low wide body, sloped hood, tumblehome cabin, flared fenders,
// white centre stripe, rear spoiler, dented panels (dark patches + bent panels).
export function makeHeroCar(color = 0xff6a1a, dented = true) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101c2a, roughness: 0.12, metalness: 0.7 });
  // Main body: S-curve side masses — long hood, low cabin, wide haunches.
  g.add(box(1.95, 0.62, 4.6, paint, 0, 0.62, 0));
  const hood = box(1.8, 0.34, 1.5, paint, 0, 0.82, -1.55);
  hood.rotation.x = 0.1;
  g.add(hood);
  // Tumblehome greenhouse: narrower cabin, sloped windshield + rear glass.
  const cabin = box(1.55, 0.55, 2.1, glass, 0, 1.14, 0.25);
  cabin.rotation.x = -0.06;
  g.add(cabin);
  const roof = box(1.5, 0.12, 1.5, paint, 0, 1.42, 0.3);
  g.add(roof);
  // Fender flares over the wheels.
  for (const [x, z] of [[-0.95, -1.5], [0.95, -1.5], [-0.95, 1.5], [0.95, 1.5]]) {
    g.add(box(0.28, 0.3, 0.9, paint, x, 0.72, z));
  }
  // White centre stripe over hood + roof.
  g.add(box(0.34, 0.05, 4.4, new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }), 0, 1.0, -0.1, false));
  g.add(box(0.34, 0.05, 1.5, new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }), 0, 1.49, 0.3, false));
  // Headlights + grille + spoiler + exhausts.
  for (const x of [-0.62, 0.62]) {
    g.add(box(0.42, 0.14, 0.08, new THREE.MeshStandardMaterial({
      color: 0xfff6c8, emissive: 0xffe9a8, emissiveIntensity: 2.2,
    }), x, 0.72, -2.32, false));
  }
  g.add(box(1.1, 0.18, 0.08, dark, 0, 0.5, -2.32, false));
  for (const x of [-0.62, 0.62]) {
    g.add(box(0.42, 0.14, 0.08, new THREE.MeshStandardMaterial({
      color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2.2,
    }), x, 0.72, 2.32, false));
  }
  g.add(box(1.7, 0.08, 0.4, dark, 0, 1.28, 2.2));
  for (const x of [-0.5, 0.5]) {
    g.add(box(0.16, 0.1, 0.16, new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 }), x, 0.42, 2.32, false));
  }
  // Dented panels: dark crumpled patches on the flank + a bent front wing.
  if (dented) {
    const dentMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
    const dent = box(0.06, 0.5, 1.1, dentMat, -0.99, 0.7, 0.6, false);
    dent.rotation.z = 0.12;
    g.add(dent);
    const dent2 = box(0.5, 0.3, 0.06, dentMat, 0.5, 0.55, -2.33, false);
    g.add(dent2);
    const wing = box(0.5, 0.22, 0.7, paint, -0.85, 0.68, -1.9);
    wing.rotation.z = 0.18;
    g.add(wing);
  }
  for (const [x, z] of [[-0.92, -1.5], [0.92, -1.5], [-0.92, 1.5], [0.92, 1.5]]) {
    const w = wheel();
    w.position.set(x, 0.42, z);
    g.add(w);
  }
  g.userData.wheels = [];
  return g;
}

// KPD police sedan: black hood/roof/rear, white doors with big POLICE lettering,
// roof light bar (red/blue), push bar, 911 on the rear quarter.
export function makePoliceCar() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.35, metalness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101c2a, roughness: 0.12, metalness: 0.7 });
  g.add(box(1.9, 0.6, 4.4, white, 0, 0.6, 0));
  g.add(box(1.85, 0.3, 1.4, black, 0, 0.78, -1.45)); // black hood
  g.add(box(1.85, 0.28, 1.1, black, 0, 0.78, 1.6));  // black trunk
  g.add(box(1.6, 0.55, 2.0, glass, 0, 1.1, 0.15));    // cabin
  g.add(box(1.55, 0.1, 1.6, black, 0, 1.4, 0.15));    // black roof panel
  // POLICE door lettering, both sides.
  const doorTex = policeDoorTexture();
  for (const s of [-1, 1]) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6),
      new THREE.MeshBasicMaterial({ map: doorTex }));
    door.position.set(s * 0.97, 0.62, 0.1);
    door.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(door);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25),
      new THREE.MeshBasicMaterial({ map: nineOneOneTexture() }));
    q.position.set(s * 0.97, 0.62, 1.75);
    q.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(q);
  }
  // Roof light bar: red left, blue right, flashing in live play.
  const barBase = box(1.3, 0.1, 0.3, black, 0, 1.5, 0.15, false);
  g.add(barBase);
  const red = box(0.55, 0.16, 0.28, new THREE.MeshStandardMaterial({
    color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 3,
  }), -0.33, 1.58, 0.15, false);
  const blue = box(0.55, 0.16, 0.28, new THREE.MeshStandardMaterial({
    color: 0x2050ff, emissive: 0x2050ff, emissiveIntensity: 3,
  }), 0.33, 1.58, 0.15, false);
  g.add(red); g.add(blue);
  g.userData.lightRed = red; g.userData.lightBlue = blue;
  // Push bar on the nose.
  g.add(box(1.7, 0.5, 0.12, black, 0, 0.55, -2.26, false));
  g.add(box(0.12, 0.5, 0.3, black, -0.7, 0.55, -2.2, false));
  g.add(box(0.12, 0.5, 0.3, black, 0.7, 0.55, -2.2, false));
  for (const x of [-0.62, 0.62]) {
    g.add(box(0.4, 0.14, 0.08, new THREE.MeshStandardMaterial({
      color: 0xfff6c8, emissive: 0xffe9a8, emissiveIntensity: 2,
    }), x, 0.7, -2.22, false));
  }
  for (const [x, z] of [[-0.9, -1.45], [0.9, -1.45], [-0.9, 1.45], [0.9, 1.45]]) {
    const w = wheel(0.4, 0.3);
    w.position.set(x, 0.4, z);
    g.add(w);
  }
  return g;
}

// Plain traffic sedan in a bright colour.
export function makeTrafficCar(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101c2a, roughness: 0.15, metalness: 0.6 });
  g.add(box(1.85, 0.62, 4.2, paint, 0, 0.6, 0));
  g.add(box(1.55, 0.55, 2.0, glass, 0, 1.08, 0.1));
  g.add(box(1.5, 0.1, 1.6, paint, 0, 1.38, 0.1));
  for (const x of [-0.6, 0.6]) {
    g.add(box(0.38, 0.13, 0.08, new THREE.MeshStandardMaterial({
      color: 0xfff6c8, emissive: 0xffe9a8, emissiveIntensity: 1.6,
    }), x, 0.68, -2.12, false));
  }
  for (const [x, z] of [[-0.88, -1.4], [0.88, -1.4], [-0.88, 1.4], [0.88, 1.4]]) {
    const w = wheel(0.38, 0.3);
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

// Scooter + rider, the beachfront traffic tell.
export function makeScooter() {
  const g = new THREE.Group();
  const body = box(0.5, 0.5, 1.7, new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.4, metalness: 0.3 }), 0, 0.55, 0);
  g.add(body);
  const seat = box(0.45, 0.12, 0.7, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 }), 0, 0.85, 0.45);
  g.add(seat);
  for (const z of [-0.7, 0.7]) {
    const w = wheel(0.26, 0.16);
    w.position.set(0, 0.26, z);
    g.add(w);
  }
  // Rider: torso, helmet, legs.
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.8 });
  const torso = box(0.42, 0.55, 0.3, shirt, 0, 1.15, 0.4);
  g.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.3 }));
  helmet.position.set(0, 1.55, 0.4);
  helmet.castShadow = true;
  g.add(helmet);
  for (const x of [-0.16, 0.16]) {
    g.add(box(0.13, 0.5, 0.13, skin, x, 0.85, 0.1));
  }
  return g;
}

// Tank roadblock: olive hull, tracks, turret + long barrel, angled across the lane.
export function makeTank() {
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a5a34, roughness: 0.85, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22241f, roughness: 0.9 });
  for (const x of [-1.15, 1.15]) {
    g.add(box(0.7, 0.9, 4.6, dark, x, 0.55, 0));
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.74, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a3f35, roughness: 0.8 }));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.4, -1.8 + i * 0.9);
      w.castShadow = true;
      g.add(w);
    }
  }
  g.add(box(2.2, 0.8, 4.2, olive, 0, 1.35, 0));
  const turret = box(1.5, 0.7, 1.9, olive, 0, 2.05, 0.2);
  g.add(turret);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.2, 8), dark);
  barrel.rotation.x = Math.PI / 2 - 0.08;
  barrel.position.set(0, 2.1, -2.4);
  barrel.castShadow = true;
  g.add(barrel);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 10), dark);
  hatch.position.set(0, 2.45, 0.4);
  g.add(hatch);
  return g;
}

// Police helicopter: rounded body, tail boom, main + tail rotors, skids and a
// big searchlight cone (translucent) aimed at the road below.
export function makeHeli() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4a6a8a, roughness: 0.4, metalness: 0.4,
    emissive: 0x35506e, emissiveIntensity: 0.55,
  });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), bodyMat);
  body.scale.set(1, 0.85, 1.7);
  body.castShadow = true;
  g.add(body);
  const belly = box(1.7, 0.8, 2.6, white, 0, -0.9, 0.3);
  g.add(belly);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x9fd4f5, roughness: 0.1, metalness: 0.6 }));
  glass.scale.set(1, 0.7, 0.9);
  glass.position.set(0, 0.2, -1.4);
  g.add(glass);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 4.6, 8), bodyMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.3, 3.6);
  boom.castShadow = true;
  g.add(boom);
  const fin = box(0.12, 1.2, 0.9, bodyMat, 0, 1.0, 5.6);
  g.add(fin);
  // Main rotor: two long blades, spinning in live play.
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = box(9.5, 0.08, 0.45, new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6 }), 0, 0, 0, false);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.7;
  g.add(rotor);
  g.userData.rotor = rotor;
  const tailRotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = box(1.8, 0.08, 0.2, dark2(), 0, 0, 0, false);
    blade.rotation.y = a;
    tailRotor.add(blade);
  }
  tailRotor.position.set(0.4, 0.9, 5.6);
  tailRotor.rotation.z = Math.PI / 2;
  g.add(tailRotor);
  // Skids.
  for (const x of [-1.1, 1.1]) {
    g.add(box(0.12, 0.12, 3.4, dark2(), x, -1.6, 0));
    g.add(box(0.1, 0.7, 0.1, dark2(), x, -1.25, -1));
    g.add(box(0.1, 0.7, 0.1, dark2(), x, -1.25, 1));
  }
  // Searchlight cone: translucent white, additive — the chase's key light shape.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.0, 22, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.08,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }),
  );
  cone.position.set(0, -12.2, -1.5);
  cone.rotation.x = 0.12;
  g.add(cone);
  g.userData.cone = cone;
  return g;
}

function dark2() {
  return new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.6 });
}
