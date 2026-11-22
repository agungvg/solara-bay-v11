// Screenshot staging: each of the 4 dossier shots is a deterministic scene
// built from the real game — same world, same systems, frozen at a chosen
// moment. The camera, the time-of-day preset, the traffic, the HUD state and
// the dialogue are all set here, from the reference images, so the frame is
// what a short game really looks like.
import * as THREE from 'three';
import { makeHeroCar, makePoliceCar, makeTrafficCar, makeScooter, makeTank, makeHeli } from './vehicles.js';
import { makeDownedEnemy, makeGuard } from './people.js';

function setCar(group, x, z, heading) {
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return group;
}

// A black van at the end of the market aisle (foot shot).
function makeVan() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.5, metalness: 0.3 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    g.add(m); return m;
  };
  box(2.0, 0.9, 4.6, dark, 0, 0.75, 0);
  box(1.9, 1.1, 2.6, dark, 0, 1.7, 0.7);
  const glass = new THREE.MeshStandardMaterial({ color: 0x101c2a, roughness: 0.15, metalness: 0.6 });
  box(1.8, 0.7, 0.2, glass, 0, 1.7, -0.65);
  for (const x of [-0.65, 0.65]) {
    box(0.4, 0.14, 0.08, new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a8, emissiveIntensity: 1.8 }), x, 0.8, -2.32);
  }
  return g;
}

export function stageShot(game, name) {
  const s = game.state;
  const scene = game.scene;
  game.clearShotActors();
  game.meta.hide();
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('meta-screen').classList.add('hidden');
  game.city.setWet(false);

  if (name === 'cover') {
    // COVER — daytime beachfront chase, NOON. Bright blue sky + fluffy clouds,
    // palms, beach + umbrellas, ocean + the BIG yacht, orange hero at 111 KM/H,
    // white police cars ahead + behind, a scooter, a tank roadblock to the side,
    // a big heli low with a searchlight cone, the Ferris wheel on the skyline.
    game.sky.applyPreset('noon');
    game.camera.fov = 42; game.camera.updateProjectionMatrix();
    game.setCamera(new THREE.Vector3(3.5, 6.5, 32), new THREE.Vector3(0, 3.5, -15));
    const hero = makeHeroCar(0xff6a1a, true);
    setCar(hero, 0.5, 8, 0.06);
    game.addShotActor(hero);
    s.driving = true; s.vehicleName = 'RUKAN PELO GT'; s.speedKmh = 111; s.condition = 62;
    s.heroCar = hero;
    const policeAhead = [makePoliceCar(), makePoliceCar()];
    setCar(policeAhead[0], -3.5, -14, 0.1); setCar(policeAhead[1], 3.8, -26, -0.08);
    const policeBehind = makePoliceCar();
    setCar(policeBehind, -4.5, 24, Math.PI + 0.1);
    game.addShotActor(policeAhead[0]); game.addShotActor(policeAhead[1]); game.addShotActor(policeBehind);
    const trafficCols = [0xe03131, 0x1971c2, 0xffd21f, 0xf4f6f8];
    const trafficPos = [[3.2, -14, 0.05], [-3.6, -52, -0.05], [2.2, -62, 0.1], [-2.4, 34, Math.PI]];
    trafficPos.forEach(([x, z, h], i) => {
      const t = makeTrafficCar(trafficCols[i % 4]);
      setCar(t, x, z, h);
      game.addShotActor(t);
    });
    const scooter = makeScooter();
    scooter.position.set(5.6, 0, -3); scooter.rotation.y = 0.15;
    game.addShotActor(scooter);
    const tank = makeTank();
    tank.position.set(-6.5, 0, -4); tank.rotation.y = 0.5;
    game.addShotActor(tank);
    const heli = makeHeli();
    heli.scale.setScalar(1.25);
    heli.position.set(-4, 20, -28);
    heli.rotation.y = 0.4;
    game.addShotActor(heli);
    s.heli = heli;
    s.policePositions = [
      new THREE.Vector3(-3.5, 0, -14), new THREE.Vector3(3.8, 0, -26),
      new THREE.Vector3(-4.5, 0, 24), new THREE.Vector3(-4, 20, -28),
      new THREE.Vector3(2.5, 0, -55), new THREE.Vector3(-5, 0, -62),
    ];
    Object.assign(s, {
      missionIndex: 5, stageIndex: 2, missionTimer: 23, cash: 18450, wanted: 4,
      health: 72, armour: 55, clock: '12:00', district: 'KUMALA STRAND', street: 'Strand Boulevard',
      standing: 58, radio: 'OMBO 98.4 — Island Pop',
      dialogue: "He's making for Kumala Pier! Ram the Regent before it reaches the water!",
      player: { x: 0.5, z: 8, heading: 0 },
      missionMarker: { x: 0, z: -60 },
    });
    game.missions.start(5);
    game.missions.stageIndex = 2;
    game.missions.timer = 23;
    game.police.raise(4, 'shot:cover');
    return;
  }

  if (name === 'foot') {
    // FOOT — daytime street/market. Dense varied crowd, stalls, a CLEARLY VISIBLE
    // downed enemy in the aisle, the player from behind, armed guards, the van.
    game.sky.applyPreset('noon');
    game.camera.fov = 46; game.camera.updateProjectionMatrix();
    game.setCamera(new THREE.Vector3(0.6, 3.1, 56.5), new THREE.Vector3(-0.4, 1.5, 32));
    game.playerMesh.position.set(-0.8, 0, 50);
    game.playerMesh.rotation.y = Math.PI; // back to camera, facing the aisle
    game.playerMesh.visible = true;
    const downed = makeDownedEnemy();
    downed.scale.setScalar(1.3);
    downed.position.set(2.2, 0, 44);
    downed.rotation.y = 0.35;
    game.addShotActor(downed);
    game.downedEnemy = downed;
    // Clear a patch of crowd around the downed enemy so the body reads.
    for (const w of game.crowd.walkers) {
      if (Math.hypot(w.mesh.position.x - 2.2, w.mesh.position.z - 44) < 3.2) {
        w.mesh.position.x = w.mesh.position.x < 0 ? -4.6 : 4.6;
      }
    }
    const guard1 = makeGuard(); guard1.position.set(-3.6, 0, 36); guard1.rotation.y = 2.6;
    const guard2 = makeGuard(); guard2.position.set(3.9, 0, 33); guard2.rotation.y = -2.4;
    game.addShotActor(guard1); game.addShotActor(guard2);
    const van = makeVan();
    van.position.set(0, 0, 28); van.rotation.y = Math.PI;
    game.addShotActor(van);
    const scooter = makeScooter();
    scooter.position.set(-5.5, 0, 46); scooter.rotation.y = 1.2;
    game.addShotActor(scooter);
    s.policePositions = [new THREE.Vector3(-3.6, 0, 36), new THREE.Vector3(3.9, 0, 33), new THREE.Vector3(5, 0, 30)];
    Object.assign(s, {
      missionIndex: 1, stageIndex: 1, missionTimer: 94, cash: 7270, wanted: 2,
      health: 95, armour: 27, clock: '14:30', district: 'LANTERN MARKET', street: 'Pasaru Lane',
      standing: 74, radio: 'LANTERN FM — Night Market Mix', driving: false, speedKmh: 6,
      dialogue: 'Kiki: two guards on the courier. Drop them quiet and take the package.',
      player: { x: -0.8, z: 50, heading: Math.PI },
      missionMarker: { x: 0, z: 36 },
    });
    game.missions.start(1);
    game.missions.stageIndex = 1;
    game.missions.timer = 94;
    game.police.raise(2, 'shot:foot');
    game.hud.showHint('DUCK BY A STALL TO HIDE', 60000);
    return;
  }

  if (name === 'chase') {
    // CHASE — GOLDEN-HOUR SUNSET, not dark night. Pink/orange/purple sky with
    // clouds, a big heli with a spotlight cone fully framed, white police cars,
    // colourful buildings, palms, wet-street neon reflections, red hero at 111.
    game.sky.applyPreset('golden');
    game.city.setWet(true);
    game.camera.fov = 42; game.camera.updateProjectionMatrix();
    game.setCamera(new THREE.Vector3(1.5, 5.6, 34), new THREE.Vector3(0, 2.6, -18));
    const hero = makeHeroCar(0xd61f26, true);
    setCar(hero, 0, 12, 0.05);
    game.addShotActor(hero);
    s.driving = true; s.vehicleName = 'VELOZ COMET RS'; s.speedKmh = 111; s.condition = 84;
    s.heroCar = hero;
    const policeAhead = [makePoliceCar(), makePoliceCar()];
    setCar(policeAhead[0], -3.4, -10, 0.08); setCar(policeAhead[1], 3.6, -22, -0.06);
    game.addShotActor(policeAhead[0]); game.addShotActor(policeAhead[1]);
    const trafficPos = [[3.0, -8, 0.05], [-3.2, -44, -0.04], [2.6, -56, 0.08]];
    const trafficCols = [0xffd21f, 0x2ee6c8, 0xf4f6f8];
    trafficPos.forEach(([x, z, h], i) => {
      const t = makeTrafficCar(trafficCols[i]);
      setCar(t, x, z, h);
      game.addShotActor(t);
    });
    const heli = makeHeli();
    heli.scale.setScalar(1.3);
    heli.position.set(-2.5, 18, -20);
    heli.rotation.y = -0.5;
    game.addShotActor(heli);
    s.heli = heli;
    s.policePositions = [
      new THREE.Vector3(-3.4, 0, -10), new THREE.Vector3(3.6, 0, -22),
      new THREE.Vector3(-2.5, 18, -20), new THREE.Vector3(5, 0, -48),
    ];
    Object.assign(s, {
      missionIndex: 2, stageIndex: 0, missionTimer: 107, cash: 12860, wanted: 3,
      health: 88, armour: 40, clock: '17:45', district: 'MALECÓN CELESTE', street: 'Tarpon Bridge',
      standing: 47, radio: 'CELESTE 98.1 — Malecón Mirage',
      dialogue: "Marco: the boat sails in two minutes! Shake that chopper and get to the pier!",
      player: { x: 0, z: 12, heading: 0 },
      missionMarker: { x: -30, z: -80 },
    });
    game.missions.start(2);
    game.missions.stageIndex = 0;
    game.missions.timer = 107;
    game.police.raise(3, 'shot:chase');
    return;
  }

  if (name === 'meta') {
    // META — MAP/STATS screen. The 3D city stays behind the opaque screen.
    game.sky.applyPreset('noon');
    game.camera.fov = 42; game.camera.updateProjectionMatrix();
    game.setCamera(new THREE.Vector3(8.5, 5.4, 26), new THREE.Vector3(-0.5, 3.2, -30));
    Object.assign(s, { cash: 21340, wanted: 0, missionIndex: 5, stageIndex: 2, missionTimer: 0 });
    game.missions.start(5);
    game.missions.stageIndex = 2;
    game.police.raise(0, 'shot:meta');
    game.meta.show();
    return;
  }

  // Unknown shot name falls back to the cover.
  stageShot(game, 'cover');
}
