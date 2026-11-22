// Solara Bay — main orchestrator. Boots the renderer (ACES + PCFSoft shadows,
// sRGB), owns the game state, runs the fixed-step simulation, follows the
// camera, wires input → actions, and exposes the debug/playtest API the
// screenshot and playtest drivers use. Shot mode (?shot=cover|foot|chase|meta)
// stages a deterministic frame; playtest mode (?playtest=1) runs mission 1
// by autopilot and reports the result on window.__playtest.
import * as THREE from 'three';
import { SkySystem } from './sky.js';
import { City } from './city.js';
import { makeHeroCar, makePoliceCar, makeTrafficCar, makeHeli } from './vehicles.js';
import { makePlayer, buildCrowd } from './people.js';
import { MissionRunner, MISSIONS } from './missions.js';
import { PoliceSystem } from './police.js';
import { WeaponSystem } from './weapons.js';
import { AudioSystem } from './audio.js';
import { InputSystem } from './input.js';
import { Minimap } from './minimap.js';
import { Hud } from './hud.js';
import { MetaScreen } from './meta.js';
import { stageShot } from './shots.js';
import { runPlaytest } from './playtest.js';
import { readSaves, writeSave, emptySave } from './save.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;

const MARKERS = {
  heroCar: () => ({ x: 0, z: 30 }),
  safehouse: { x: 28, z: 88 },
  courier: { x: 0, z: 36 },
  package: { x: 0, z: 30 },
  exit: { x: 0, z: 56 },
  bridge: { x: 0, z: -45 },
  pier: { x: -30, z: -80 },
  garage: { x: 52, z: 44 },
  docks: { x: -52, z: 95 },
  rooftop: { x: 36, z: 100 },
  vault: { x: 36, z: 95 },
  beach: { x: 20, z: -70 },
  yacht: { x: 8, z: -110 },
};

const DISTRICTS = [
  { test: (x, z) => z < -58, name: 'KUMALA STRAND', street: 'Strand Boulevard', standing: 58 },
  { test: (x, z) => x < -14 && z >= 20 && z <= 60, name: 'LANTERN MARKET', street: 'Pasaru Lane', standing: 74 },
  { test: (x, z) => x > 30 && z < -58, name: 'MARINA', street: 'Yacht Row', standing: 71 },
  { test: (x, z) => z > 70, name: 'DOWNTOWN', street: 'Solara Avenue', standing: 42 },
  { test: (x, z) => x < -40, name: 'DOCKS', street: 'Harbour Road', standing: 33 },
  { test: () => true, name: 'KUMALA STRAND', street: 'Strand Boulevard', standing: 58 },
];

export class Game {
  constructor() {
    this.errors = [];
    window.addEventListener('error', (e) => this.errors.push(`error: ${e.message}`));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(`rejection: ${e.reason}`));

    this.canvas = $('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera.position.set(10, 6, 40);

    this.sky = new SkySystem(this.scene, this.renderer);
    this.city = new City(this.scene);
    this.crowd = buildCrowd(this.scene, 42);

    // Live actors (hidden in shot mode; shots add their own staged actors).
    this.liveGroup = new THREE.Group();
    this.scene.add(this.liveGroup);
    this.heroCar = makeHeroCar(0xff6a1a, true);
    this.heroCar.position.set(0, 0, 30);
    this.liveGroup.add(this.heroCar);
    this.regent = makeTrafficCar(0x8a1a1a);
    this.regent.position.set(0, 0, -20);
    this.regent.visible = false;
    this.liveGroup.add(this.regent);
    this.policeCars = [];
    for (let i = 0; i < 4; i++) {
      const pc = makePoliceCar();
      pc.position.set(-20 - i * 6, 0, 60 + i * 8);
      this.liveGroup.add(pc);
      this.policeCars.push(pc);
    }
    this.traffic = [];
    const trafficCols = [0xe03131, 0x1971c2, 0xffd21f, 0xf4f6f8, 0x2ee6c8, 0xff7a33];
    for (let i = 0; i < 6; i++) {
      const t = makeTrafficCar(trafficCols[i]);
      t.position.set(i % 2 === 0 ? -3.4 : 3.4, 0, -50 + i * 26);
      t.rotation.y = i % 2 === 0 ? 0 : Math.PI;
      this.liveGroup.add(t);
      this.traffic.push({ mesh: t, speed: 8 + (i % 3) * 2.5, dir: i % 2 === 0 ? -1 : 1 });
    }
    this.heli = makeHeli();
    this.heli.position.set(20, 32, 40);
    this.liveGroup.add(this.heli);

    this.playerMesh = makePlayer();
    this.playerMesh.position.set(2, 0, 34);
    this.playerMesh.rotation.y = Math.PI;
    this.scene.add(this.playerMesh);

    // Shot actors: a separate group the staging code fills and clears.
    this.shotGroup = new THREE.Group();
    this.scene.add(this.shotGroup);
    this.shotActors = [];

    // Mission marker: floating yellow diamond + light beam.
    this.marker = new THREE.Group();
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd21f }));
    diamond.position.y = 3.2;
    this.marker.add(diamond);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 7;
    this.marker.add(beam);
    this.marker.userData.diamond = diamond;
    this.scene.add(this.marker);

    // ---- state ------------------------------------------------------------
    this.state = {
      cash: 2450, rp: 0, rank: 1, wanted: 0, health: 100, armour: 0,
      speedKmh: 0, driving: false, vehicleName: 'RUKAN PELO GT', condition: 62,
      clock: '12:00', district: 'KUMALA STRAND', street: 'Strand Boulevard', standing: 58,
      radio: 'OMBO 98.4 — Island Pop',
      dialogue: 'Mira: the Rukan Pelo GT is parked on Strand Blvd. Take it and bring it to the safehouse.',
      stageIndex: 0, missionTimer: 0, missionIndex: 0,
      player: { x: 2, z: 34, heading: Math.PI },
      missionMarker: { x: 0, z: 30 },
      policeBlips: [],
      weapons: [], activeWeapon: 3,
      failReason: null,
    };
    this.sim = {
      car: { x: 0, z: 30, heading: 0, speed: 0 },
      player: { x: 2, z: 34, heading: Math.PI, speed: 0 },
      regent: { x: 0, z: -20, health: 3, wrecked: false },
      escapeTimer: 0, sightTimer: 0, rams: 0, downs: 0,
      time: 0, clockMinutes: 12 * 60,
    };
    this.guards = [];

    // ---- systems ----------------------------------------------------------
    this.missions = new MissionRunner(this.state);
    this.police = new PoliceSystem(this.state);
    this.weapons = new WeaponSystem(this.scene, this.state);
    this.audio = new AudioSystem();
    this.input = new InputSystem();
    this.minimap = new Minimap($('minimap'));
    this.hud = new Hud(this.minimap);
    this.meta = new MetaScreen(this.state);
    this.input.onAction = (name) => this.handleAction(name);

    this.started = false;
    this.shotMode = false;
    this.cameraFixed = false;
    this.camPos = new THREE.Vector3(10, 6, 40);
    this.camTarget = new THREE.Vector3(0, 2, 0);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    $('btn-start').addEventListener('click', () => { this.audio.resume(); this.startLive(false); });
    $('btn-continue').addEventListener('click', () => { this.audio.resume(); this.continueSave(); });
    $('btn-back').addEventListener('click', () => this.meta.hide());

    // Debug / automation API.
    window.__game = this;
    window.__ready = false;
    window.__errors = this.errors;
    window.__playtest = null;
  }

  // ---- shot support -------------------------------------------------------
  setCamera(pos, target) {
    this.cameraFixed = true;
    this.camPos.copy(pos);
    this.camTarget.copy(target);
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  addShotActor(obj) {
    this.shotGroup.add(obj);
    this.shotActors.push(obj);
  }

  clearShotActors() {
    for (const a of this.shotActors) this.shotGroup.remove(a);
    this.shotActors = [];
    this.liveGroup.visible = false;
    this.playerMesh.visible = false;
    this.marker.visible = true;
  }

  // ---- live play ----------------------------------------------------------
  startLive(skipStartScreen) {
    if (skipStartScreen) $('start-screen').classList.add('hidden');
    else $('start-screen').classList.add('hidden');
    this.started = true;
    this.liveGroup.visible = true;
    this.playerMesh.visible = true;
    this.missions.start(0);
    this.state.cash = 2450;
    this.state.dialogue = MISSIONS[0].briefing;
    this.hud.showHint('HOLD W TO DRIVE · E ENTER / EXIT · F SHOOT · M MAP', 6000);
    // Mission 1 starts in the car for the playtest; a human player starts on
    // foot next to it and presses E. The autopilot enters instantly.
    this.state.driving = true;
    this.sim.car = { x: 0, z: 30, heading: 0, speed: 0 };
    this.heroCar.position.set(0, 0, 30);
  }

  continueSave() {
    const saves = readSaves();
    const save = saves[0];
    if (save) {
      this.state.cash = save.cash;
      this.state.rp = save.rp;
      this.missions.start(Math.min(save.missionsDone, 7));
    }
    this.startLive(false);
  }

  handleAction(name) {
    if (!this.started) return;
    if (name === 'map') {
      if ($('meta-screen').classList.contains('hidden')) this.meta.show();
      else this.meta.hide();
      return;
    }
    if (name === 'retry') { this.missions.start(this.missions.missionIndex); return; }
    if (name.startsWith('weapon')) {
      this.weapons.select(Number(name.slice(6)));
      this.state.activeWeapon = this.weapons.active;
      return;
    }
    if (name === 'enterExit') this.enterExitCar();
    if (name === 'shoot') this.shoot();
    if (name === 'camera') this.cameraFixed = false;
  }

  enterExitCar() {
    if (this.shotMode) return;
    const s = this.state, sim = this.sim;
    if (s.driving) {
      s.driving = false;
      sim.player.x = sim.car.x + 2.2;
      sim.player.z = sim.car.z + 1;
      sim.player.heading = sim.car.heading;
      this.playerMesh.visible = true;
    } else {
      const dx = sim.player.x - sim.car.x, dz = sim.player.z - sim.car.z;
      if (Math.hypot(dx, dz) < 4.5) {
        s.driving = true;
        this.playerMesh.visible = false;
        this.audio.blip(660, 0.12, 'sine', 0.12);
      }
    }
  }

  shoot() {
    const s = this.state;
    if (s.driving) return;
    const origin = new THREE.Vector3(this.sim.player.x, 1.5, this.sim.player.z);
    const dir = new THREE.Vector3(-Math.sin(this.sim.player.heading), 0, -Math.cos(this.sim.player.heading));
    const targets = this.guards.filter((g) => g.health > 0).map((g) => ({
      id: g.id, position: g.mesh.position, health: g.health,
    }));
    const res = this.weapons.fire(origin, dir, targets);
    if (res.ok) {
      this.audio.gunshot();
      const g = this.guards.find((x) => x.id === res.hit);
      if (g) {
        g.health -= res.damage;
        if (g.health <= 0) {
          g.mesh.rotation.x = -Math.PI / 2;
          g.mesh.position.y = 0.3;
          this.sim.downs += 1;
          this.hud.showToast('GUARD DOWN', `${this.sim.downs} down`);
        }
      }
      if (this.police.wanted < 2) this.police.commitCrime('shoot');
    } else if (res.reason === 'no ammo') {
      this.hud.showHint('NO AMMO — PRESS R TO RELOAD (hold still)', 2500);
    }
  }

  markerPosition() {
    const stage = this.missions.stage;
    if (!stage) return { x: 0, z: 30 };
    const t = stage.target;
    if (t === 'heroCar') return { x: this.sim.car.x, z: this.sim.car.z };
    if (t === 'regent') return { x: this.sim.regent.x, z: this.sim.regent.z };
    const m = MARKERS[t];
    return m ? { x: m.x, z: m.z } : { x: 0, z: 30 };
  }

  // ---- simulation (fixed step, render-independent) -------------------------
  stepSim(dt, actions) {
    const s = this.state, sim = this.sim;
    sim.time += dt;
    this.missions.update(dt);
    // Clock: one game minute per 10 real seconds from noon (live play only;
    // shots stage their own clock).
    if (!this.shotMode) {
      sim.clockMinutes = 12 * 60 + Math.floor(sim.time / 10);
      const hh = Math.floor(sim.clockMinutes / 60) % 24;
      const mm = sim.clockMinutes % 60;
      s.clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    // In shot mode the staged state IS the truth: the sim must not overwrite
    // the staged speed, player position or district with live-sim values.
    if (!this.shotMode && s.driving) {
      const car = sim.car;
      const accel = actions.throttle > 0 ? 14 : 0;
      car.speed += actions.throttle * accel * dt;
      if (actions.brake) car.speed -= Math.sign(car.speed) * 22 * dt;
      car.speed -= car.speed * 0.35 * dt;
      car.speed = Math.max(-8, Math.min(31, car.speed));
      if (Math.abs(car.speed) > 0.5) {
        car.heading += actions.steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed);
      }
      car.x += -Math.sin(car.heading) * car.speed * dt;
      car.z += -Math.cos(car.heading) * car.speed * dt;
      if (car.x < -88 || car.x > 88) { car.x = Math.max(-88, Math.min(88, car.x)); car.speed *= 0.6; }
      if (car.z < -56 || car.z > 125) { car.z = Math.max(-56, Math.min(125, car.z)); car.speed *= 0.6; }
      this.heroCar.position.set(car.x, 0, car.z);
      this.heroCar.rotation.y = car.heading;
      s.speedKmh = Math.abs(car.speed) * 3.6;
      s.player.x = car.x; s.player.z = car.z; s.player.heading = car.heading;
      // Ram the Regent (mission 6): close + fast = a hit.
      if (this.missions.missionIndex === 5 && !sim.regent.wrecked) {
        const d = Math.hypot(car.x - sim.regent.x, car.z - sim.regent.z);
        if (d < 4.2 && Math.abs(car.speed) > 6) {
          sim.rams += 1;
          sim.regent.health -= 1;
          car.speed *= 0.5;
          this.police.commitCrime('ram');
          this.hud.showToast('RAMMED!', `Hit ${sim.rams}/3 — the Regent is buckling`);
          this.audio.blip(180, 0.25, 'square', 0.2);
          if (sim.regent.health <= 0) {
            sim.regent.wrecked = true;
            this.regent.rotation.z = 0.12;
            this.hud.showToast('REGENT WRECKED', 'Now vanish before the KPD boxes you in');
          }
        }
      }
    } else if (!this.shotMode) {
      const p = sim.player;
      const speed = actions.sprint ? 7 : 4;
      const mx = actions.steer;
      const mz = actions.throttle;
      const len = Math.hypot(mx, mz) || 1;
      p.x += (mx / len) * speed * dt * (mz !== 0 || mx !== 0 ? 1 : 0);
      p.z += (-mz / len) * speed * dt * (mz !== 0 || mx !== 0 ? 1 : 0);
      p.x = Math.max(-88, Math.min(88, p.x));
      p.z = Math.max(-58, Math.min(125, p.z));
      if (mx !== 0 || mz !== 0) p.heading = Math.atan2(-mx, mz);
      this.playerMesh.position.set(p.x, 0, p.z);
      this.playerMesh.rotation.y = p.heading;
      s.speedKmh = (mx !== 0 || mz !== 0) ? speed * 3.6 : 0;
      s.player.x = p.x; s.player.z = p.z; s.player.heading = p.heading;
    }

    // Regent drives toward the pier in mission 6.
    if (this.missions.missionIndex === 5 && !sim.regent.wrecked && this.started) {
      sim.regent.z -= 9 * dt;
      if (sim.regent.z < -56) sim.regent.z = -56;
      this.regent.position.set(sim.regent.x, 0, sim.regent.z);
      this.regent.visible = true;
    }

    // Traffic flows along the boulevard and wraps.
    for (const t of this.traffic) {
      t.mesh.position.z += t.dir * t.speed * dt;
      if (t.mesh.position.z < -56) t.mesh.position.z = 122;
      if (t.mesh.position.z > 122) t.mesh.position.z = -56;
    }
    // Crowd strolls the market aisle.
    for (const w of this.crowd.walkers) {
      w.mesh.position.z += w.dir * w.speed * dt;
      if (w.mesh.position.z > 54) w.mesh.position.z = 24;
      if (w.mesh.position.z < 24) w.mesh.position.z = 54;
    }
    // Heli shadows the player; its rotor spins.
    const hp = new THREE.Vector3(s.player.x + 6, 30, s.player.z + 8);
    this.heli.position.lerp(hp, 1 - Math.pow(0.5, dt));
    this.heli.userData.rotor.rotation.y += dt * 22;
    // Police pursuit: cars close on the player, distances stay live. In shot
    // mode the staged positions are the truth, so the HUD distances match the
    // cars the frame actually shows.
    const unitPos = [];
    if (this.shotMode && s.policePositions?.length) {
      for (const p of s.policePositions) unitPos.push(p.clone());
    } else {
      this.policeCars.forEach((pc, i) => {
        if (!this.police.units[i]?.active) { unitPos.push(pc.position.clone()); return; }
        const dx = s.player.x - pc.position.x, dz = s.player.z - pc.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const speed = 12 + this.police.wanted * 1.6;
        pc.position.x += (dx / d) * speed * dt;
        pc.position.z += (dz / d) * speed * dt;
        pc.rotation.y = Math.atan2(-dx, -dz);
        unitPos.push(pc.position.clone());
      });
    }
    // AIR-1 only joins the chase at 4 stars: below that the heli is not an
    // active unit, and it must never block an escape by shadowing the player.
    if (this.shotMode && s.policePositions?.length) {
      // (shot positions already include the heli where the frame shows it)
    } else if (this.police.wanted >= 4) {
      unitPos.push(this.heli.position.clone());
    }
    const playerVec = new THREE.Vector3(s.player.x, 0, s.player.z);
    this.police.update(dt, playerVec, unitPos);
    s.policeBlips = this.policeCars.slice(0, this.police.activeCount).map((pc) => ({ x: pc.position.x, z: pc.position.z }));
    // Escape: 40 m clear of every unit for 4 s drops a wanted star. The hero
    // car (31 m/s) outruns KPD cars (15 m/s), so a clean getaway is earnable
    // on this map; a helicopter shadowing the player never counts toward it.
    const nearest = Math.min(...unitPos.map((p) => p.distanceTo(playerVec)));
    if (this.police.wanted > 0 && nearest > 40) {
      sim.escapeTimer += dt;
      if (sim.escapeTimer > 4) { this.police.lower(this.police.wanted - 1, 'escaped'); sim.escapeTimer = 0; }
    } else sim.escapeTimer = 0;

    // Mission stage checks.
    const stage = this.missions.stage;
    if (stage && this.missions.status === 'active') {
      const px = s.player.x, pz = s.player.z;
      if (stage.objective === 'reachCar' && (s.driving || Math.hypot(px - sim.car.x, pz - sim.car.z) < 3.5)) {
        this.advanceStage();
      } else if (stage.objective === 'reachMarker') {
        const wp = this.markerPosition();
        if (Math.hypot(px - wp.x, pz - wp.z) < 5) this.advanceStage();
      } else if (stage.objective === 'ramTarget' && sim.rams >= (stage.count ?? 3)) {
        this.advanceStage();
      } else if (stage.objective === 'downEnemies' && sim.downs >= (stage.count ?? 2)) {
        this.advanceStage();
      } else if (stage.objective === 'loseWanted' && this.police.wanted === 0) {
        this.advanceStage();
      } else if (stage.objective === 'breakSight') {
        if (!this.police.inSight) {
          sim.sightTimer += dt;
          if (sim.sightTimer > 3) this.advanceStage();
        } else sim.sightTimer = 0;
      }
    }

    // District + standing follow the player (live play only; shots stage theirs).
    if (!this.shotMode) {
      const d = DISTRICTS.find((x) => x.test(s.player.x, s.player.z));
      s.district = d.name; s.street = d.street; s.standing = d.standing;
    }
    s.stageIndex = this.missions.stageIndex;
    s.missionIndex = this.missions.missionIndex;
    s.missionTimer = this.missions.timer;
    s.wanted = this.police.wanted;
    s.activeWeapon = this.weapons.active;
    s.weapons = this.weapons.slots;
    s.missionMarker = this.markerPosition();
    this.weapons.update(dt);
    this.audio.update(dt, s);
    this.sky.update(dt, sim.time);
    // Marker bob + Ferris wheel + yacht sway.
    this.marker.position.set(s.missionMarker.x, 0, s.missionMarker.z);
    this.marker.userData.diamond.rotation.y += dt * 2;
    this.marker.userData.diamond.position.y = 3.2 + Math.sin(sim.time * 2) * 0.25;
    this.city.ferrisWheel.rotation.z += dt * 0.05;
    this.city.yacht.rotation.z = Math.sin(sim.time * 0.5) * 0.015;
  }

  advanceStage() {
    const ev = this.missions.completeStage();
    if (ev === 'stageComplete') {
      const next = this.missions.stage;
      if (next?.objective === 'loseWanted') this.police.raise(2, 'stage:tail');
      this.hud.showToast('STAGE CLEAR', next ? next.label : '');
      this.audio.blip(990, 0.15, 'sine', 0.15);
    } else if (ev === 'missionComplete') {
      this.hud.showToast('MISSION COMPLETE', `+$${this.missions.mission.cash.toLocaleString('en-US')}`);
      this.audio.radioJingle();
      const saves = readSaves();
      const save = emptySave();
      save.cash = this.state.cash; save.rp = this.state.rp;
      save.missionsDone = this.missions.missionIndex + 1;
      writeSave(0, save);
      if (this.missions.missionIndex + 1 < MISSIONS.length) {
        this.missions.start(this.missions.missionIndex + 1);
        this.state.dialogue = this.missions.mission.briefing;
      }
    }
  }

  // ---- frame ----------------------------------------------------------------
  renderFrame() {
    const s = this.state;
    if (!this.cameraFixed) {
      // Chase camera: behind the car or behind the player, smoothed.
      const px = s.player.x, pz = s.player.z, h = s.player.heading;
      const fx = -Math.sin(h), fz = -Math.cos(h);
      const dist = s.driving ? 10.5 : 6.5;
      const height = s.driving ? 4.6 : 3.1;
      const want = new THREE.Vector3(px - fx * dist, height, pz - fz * dist);
      this.camPos.lerp(want, 0.08);
      this.camTarget.lerp(new THREE.Vector3(px + fx * 12, 1.6, pz + fz * 12), 0.12);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camTarget);
    }
    // Police light bars flash red/blue in turns.
    const flash = Math.floor(this.sim.time * 3) % 2 === 0;
    for (const pc of this.policeCars) {
      if (pc.userData.lightRed) pc.userData.lightRed.material.emissiveIntensity = flash ? 3.5 : 0.4;
      if (pc.userData.lightBlue) pc.userData.lightBlue.material.emissiveIntensity = flash ? 0.4 : 3.5;
    }
    if (this.downedEnemy) {
      const r = this.downedEnemy.userData.ring;
      const pulse = 0.55 + 0.35 * Math.sin(this.sim.time * 4);
      r.material.opacity = pulse;
      const sc = 1 + 0.12 * Math.sin(this.sim.time * 4);
      r.scale.setScalar(sc);
    }
    if (this.started || this.shotMode) this.hud.update(s, this.missions.mission, this.police);
    this.renderer.render(this.scene, this.camera);
  }

  run() {
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    const playtest = params.get('playtest') === '1';
    const freeze = params.get('freeze') === '1';
    let acc = 0;
    let last = performance.now();
    if (shot) {
      this.shotMode = true;
      stageShot(this, shot);
      this.stepSim(STEP, { throttle: 0, steer: 0, brake: false, sprint: false });
      this.renderFrame();
      if (freeze) {
        window.__ready = true;
        return;
      }
    }
    if (playtest) {
      this.renderFrame();
      window.__playtest = runPlaytest(this);
      window.__ready = true;
      return;
    }
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (this.started && !this.shotMode) {
        acc += dt;
        while (acc >= STEP) {
          this.stepSim(STEP, this.input.poll());
          acc -= STEP;
        }
        this.input.endFrame();
      }
      this.renderFrame();
      if (!window.__ready) window.__ready = true;
    };
    requestAnimationFrame(loop);
  }
}

const game = new Game();
game.run();
