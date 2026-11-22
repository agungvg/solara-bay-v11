// Solara Bay itself: beachfront boulevard, ocean + marina, bright warm city,
// palm-lined streets, the pier and Ferris wheel, the lantern market.
// All geometry is procedural (boxes + canvas textures); the layout is seeded
// so every load builds the same city.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import {
  roadTexture, wetRoadTexture, facadeTexture, glassTexture, sandTexture,
  waterTexture, plazaTexture, sidewalkTexture, neonSignTexture,
} from './textures.js';

const FACADE_COLORS = [
  ['#ffd9a0', '#e8a34c'], ['#ffb37a', '#d97b3f'], ['#ffe9c4', '#c98f4a'],
  ['#ff9e7a', '#c96a4a'], ['#f7c873', '#b98a2e'], ['#a8d8c8', '#5a9a8a'],
  ['#f2b8c6', '#b06a80'], ['#ffd166', '#c98a1e'],
];

function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

export class City {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(20261122);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildGround();
    this.buildRoads();
    this.buildBuildings();
    this.buildPalms();
    this.buildBeach();
    this.buildFerrisWheel();
    this.buildMarket();
    this.buildProps();
  }

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({ color: 0x9aa08a, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 40);
    ground.receiveShadow = true;
    this.group.add(ground);
    // Grass verges with a little colour variation.
    const grass = new THREE.MeshStandardMaterial({ color: 0x6f9e52, roughness: 1 });
    for (const [x, z, w, d] of [[-38, 10, 46, 150], [38, 10, 46, 150], [-30, 105, 60, 40], [30, 105, 60, 40]]) {
      const g = box(w, 0.1, d, grass, x, 0.02, z, false);
      g.receiveShadow = true;
      this.group.add(g);
    }
  }

  buildRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.85, metalness: 0 });
    const wetMat = new THREE.MeshStandardMaterial({ map: wetRoadTexture(), roughness: 0.28, metalness: 0.25 });
    this.roadMat = roadMat;
    this.wetMat = wetMat;
    // Strand Boulevard: the main north-south chase road, sea at its far end.
    const blvd = new THREE.Mesh(new THREE.PlaneGeometry(15, 200), roadMat);
    blvd.rotation.x = -Math.PI / 2;
    blvd.position.set(0, 0.02, 30);
    blvd.receiveShadow = true;
    this.group.add(blvd);
    this.blvd = blvd;
    // Cross streets.
    for (const z of [-20, 20, 60, 100]) {
      const cross = new THREE.Mesh(new THREE.PlaneGeometry(120, 10), roadMat);
      cross.rotation.x = -Math.PI / 2;
      cross.position.set(0, 0.02, z);
      cross.receiveShadow = true;
      this.group.add(cross);
    }
    // Sidewalks flanking the boulevard.
    const walkMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(), roughness: 0.95 });
    for (const x of [-9.5, 9.5]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, 200), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.06, 30);
      walk.receiveShadow = true;
      this.group.add(walk);
    }
    // Golden-hour wet look: swap the boulevard material and add neon strips.
    this.neonStrips = [];
    const neonCols = [0xff2e88, 0x2ee6c8, 0xffd21f, 0xff7a33];
    for (let i = 0; i < 10; i++) {
      const strip = box(0.35, 0.1, 5, new THREE.MeshStandardMaterial({
        color: neonCols[i % 4], emissive: neonCols[i % 4], emissiveIntensity: 2.2,
      }), i % 2 === 0 ? -7.4 : 7.4, 0.12, -30 + i * 14, false);
      strip.visible = false;
      this.group.add(strip);
      this.neonStrips.push(strip);
    }
  }

  setWet(wet) {
    this.blvd.material = wet ? this.wetMat : this.roadMat;
    for (const s of this.neonStrips) s.visible = wet;
  }

  buildBuildings() {
    const rng = this.rng;
    const blocks = [];
    // Bright warm facades line both sides of the boulevard; heights vary 8–42.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const z = -48 + i * 18 + rng.range(-2, 2);
        const w = rng.range(10, 16), d = rng.range(10, 16), h = rng.range(8, 30);
        blocks.push({ x: side * rng.range(17, 24), z, w, d, h, glass: rng.chance(0.3) });
      }
    }
    // Downtown towers further back, tall but sunlit, never near-black.
    for (let i = 0; i < 7; i++) {
      blocks.push({
        x: rng.range(-70, 70), z: rng.range(75, 125),
        w: rng.range(12, 18), d: rng.range(12, 18), h: rng.range(28, 46), glass: rng.chance(0.55),
      });
    }
    for (const b of blocks) {
      const [base, trim] = FACADE_COLORS[this.rng.int(0, FACADE_COLORS.length - 1)];
      const mat = b.glass
        ? new THREE.MeshStandardMaterial({ map: glassTexture(), roughness: 0.25, metalness: 0.35 })
        : new THREE.MeshStandardMaterial({ map: facadeTexture(base, trim), roughness: 0.9, metalness: 0 });
      const tower = box(b.w, b.h, b.d, mat, b.x, b.h / 2, b.z);
      this.group.add(tower);
      // Roof cap + a lit rooftop box so the skyline reads at every height.
      const cap = box(b.w * 0.7, 1.2, b.d * 0.7,
        new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }), b.x, b.h + 0.6, b.z);
      this.group.add(cap);
      if (this.rng.chance(0.5)) {
        const lit = box(2, 1.4, 2, new THREE.MeshStandardMaterial({
          color: 0xffe9a8, emissive: 0xffd21f, emissiveIntensity: 1.4,
        }), b.x + b.w * 0.25, b.h + 1.4, b.z, false);
        this.group.add(lit);
      }
    }
    // Stepped pyramid landmark (bright sandstone) + curved glass tower.
    const pyrMat = new THREE.MeshStandardMaterial({ color: 0xf2c98a, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const s = 18 - i * 3.4;
      this.group.add(box(s, 5, s, pyrMat, -34, 2.5 + i * 5, -38));
    }
    // Curved glass tower: a FULL round tower (never a half shell — the open
    // side rendered black from the street), glass with a faint emissive lift.
    const curve = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 9, 34, 24),
      new THREE.MeshStandardMaterial({
        map: glassTexture(), roughness: 0.2, metalness: 0.4,
        emissive: 0x2a4258, emissiveIntensity: 0.4,
      }),
    );
    curve.position.set(36, 17, -34);
    curve.castShadow = true; curve.receiveShadow = true;
    this.group.add(curve);
  }

  makePalm(height = 9) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.34, height, 7),
      new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 }),
    );
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    g.add(trunk);
    // Fanned fronds: 9 long flattened cones drooping outward from the crown.
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x2f9e4f, roughness: 0.9, side: THREE.DoubleSide,
    });
    const frondMat2 = new THREE.MeshStandardMaterial({
      color: 0x46b95e, roughness: 0.9, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.85, 5.2, 4), i % 2 ? frondMat : frondMat2);
      frond.scale.set(1, 1, 0.16);
      frond.position.set(Math.cos(a) * 1.9, height + 0.5, Math.sin(a) * 1.9);
      frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      frond.rotation.y = -a;
      frond.castShadow = true;
      g.add(frond);
    }
    const nuts = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a22, roughness: 1 }),
    );
    nuts.position.y = height + 0.2;
    g.add(nuts);
    return g;
  }

  buildPalms() {
    // Palms line BOTH sides of the boulevard, all the way to the beach.
    for (let z = -52; z <= 118; z += 12) {
      for (const x of [-11.5, 11.5]) {
        const palm = this.makePalm(this.rng.range(8, 11));
        palm.position.set(x + this.rng.range(-0.6, 0.6), 0, z + this.rng.range(-1.5, 1.5));
        palm.rotation.y = this.rng.range(0, Math.PI * 2);
        this.group.add(palm);
      }
    }
    // A few broad-leaf shade trees on the grass verges (Lyso's sky/trees ref).
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d8a3a, roughness: 1 });
    for (let i = 0; i < 8; i++) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.4, 7),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }));
      trunk.position.y = 1.7; trunk.castShadow = true;
      t.add(trunk);
      for (let j = 0; j < 3; j++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(this.rng.range(2.2, 3.4), 10, 8), leafMat);
        leaf.position.set(this.rng.range(-1.6, 1.6), 4 + j * 0.9, this.rng.range(-1.6, 1.6));
        leaf.scale.y = 0.7; leaf.castShadow = true;
        t.add(leaf);
      }
      t.position.set(this.rng.pick([-30, -24, 26, 32]), 0, this.rng.range(-10, 90));
      this.group.add(t);
    }
  }

  buildBeach() {
    // Sand strip, then the ocean plane with the marina.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 26),
      new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.03, -73);
    sand.receiveShadow = true;
    this.group.add(sand);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 150),
      new THREE.MeshStandardMaterial({ map: waterTexture(), roughness: 0.35, metalness: 0.15 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.15, -160);
    water.receiveShadow = true;
    this.group.add(water);
    // Beach umbrellas + sunbathers on the sand.
    const umbrellaCols = [0xff2e88, 0xffd21f, 0x2ee6c8, 0xff7a33, 0x7b2fbe];
    for (let i = 0; i < 9; i++) {
      const x = -70 + i * 16 + this.rng.range(-4, 4);
      const z = -66 - this.rng.range(0, 12);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 }));
      pole.position.set(x, 1.2, z); pole.castShadow = true;
      this.group.add(pole);
      const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: umbrellaCols[i % 5], roughness: 0.8, side: THREE.DoubleSide }));
      top.position.set(x, 2.7, z); top.castShadow = true;
      this.group.add(top);
      const towel = box(1.1, 0.08, 2.2, new THREE.MeshStandardMaterial({ color: umbrellaCols[(i + 2) % 5], roughness: 1 }),
        x + 2.4, 0.1, z + 1, false);
      this.group.add(towel);
    }
    // The yacht: BIG, white hull + tall white sail, close to the boulevard's
    // sea end so the marina proof is unmistakable in the cover.
    this.yacht = this.makeYacht();
    this.yacht.scale.setScalar(2.0);
    // Dead ahead down the boulevard axis: the sightline is clear of buildings,
    // so the yacht sits at the vanishing point in the sea.
    this.yacht.position.set(8, -0.1, -110);
    this.yacht.rotation.y = -0.5;
    this.group.add(this.yacht);
    // A second sailboat further out + the pier with lamp posts.
    const boat2 = this.makeYacht(0.55);
    boat2.position.set(-58, -0.1, -128);
    boat2.rotation.y = 0.7;
    this.group.add(boat2);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
    for (let z = -84; z > -128; z -= 4) {
      this.group.add(box(6, 0.3, 3.6, pierMat, -30, 0.25, z, false));
    }
    for (let z = -88; z > -126; z -= 12) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
      lamp.position.set(-32.5, 1.7, z);
      this.group.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd21f, emissiveIntensity: 2 }));
      bulb.position.set(-32.5, 3.3, z);
      this.group.add(bulb);
    }
  }

  makeYacht(scale = 1) {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.1 });
    const hull = box(4.4, 1.8, 13, white, 0, 0.9, 0);
    g.add(hull);
    // Tapered bow.
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 4), white);
    bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.55);
    bow.position.set(0, 0.9, -8.4);
    bow.castShadow = true;
    g.add(bow);
    // Teal hull stripe (the marina-yacht ref's waterline accent).
    const stripe = box(4.5, 0.35, 12.6, new THREE.MeshStandardMaterial({ color: 0x1e7f9e, roughness: 0.5 }), 0, 0.45, 0, false);
    g.add(stripe);
    const deck = box(3.8, 0.25, 11.5, new THREE.MeshStandardMaterial({ color: 0xc98f4a, roughness: 0.9 }), 0, 1.9, 0, false);
    g.add(deck);
    const cabin = box(3, 1.6, 5.5, white, 0, 2.8, 1);
    g.add(cabin);
    const windows = box(3.1, 0.6, 5.2, new THREE.MeshStandardMaterial({ color: 0x16324a, roughness: 0.15, metalness: 0.5 }), 0, 3.1, 1, false);
    g.add(windows);
    // Tall mast + big triangular sail — the yacht's unmistakable silhouette.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 11, 6), white);
    mast.position.set(0, 7.5, -1);
    mast.castShadow = true;
    g.add(mast);
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0); sailShape.lineTo(0, 10); sailShape.lineTo(5.4, 0.6); sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide }),
    );
    sail.position.set(0.2, 2.6, -1);
    sail.castShadow = true;
    g.add(sail);
    g.scale.setScalar(scale);
    return g;
  }

  buildFerrisWheel() {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.5, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.5, emissive: 0xa88400, emissiveIntensity: 0.5 }));
    rim.castShadow = true;
    g.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(13, 0.5, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.5, emissive: 0x881144, emissiveIntensity: 0.5 }));
    rim2.position.z = -0.8;
    g.add(rim2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = box(0.35, 26, 0.35, new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.5 }),
        Math.cos(a) * 0, 0, 0, false);
      spoke.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0);
      spoke.rotation.z = a - Math.PI / 2;
      g.add(spoke);
      const pod = box(1.6, 1.4, 1.4, new THREE.MeshStandardMaterial({
        color: [0xff2e88, 0x2ee6c8, 0xffd21f, 0xff7a33][i % 4], roughness: 0.6,
      }), Math.cos(a) * 13, Math.sin(a) * 13, 0);
      g.add(pod);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    g.add(hub);
    // A-frame legs.
    for (const s of [-1, 1]) {
      const leg = box(0.8, 17, 0.8, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 }), s * 5, 8, 0);
      leg.rotation.z = s * 0.32;
      leg.castShadow = true;
      g.add(leg);
    }
    g.position.set(-38, 24, -95);
    g.scale.setScalar(1.3);
    this.group.add(g);
    this.ferrisWheel = g;
  }

  buildMarket() {
    // Lantern Market: stalls with striped awnings + neon signs on the plaza
    // at the z=40 cross street — the foot-mission ground.
    this.market = new THREE.Group();
    const stallCols = [0xff2e88, 0xffd21f, 0x2ee6c8, 0xff7a33, 0x7b2fbe];
    const words = ['FRUIT', 'TACOS', 'FISH', 'SPICE', 'FLOWER', 'JUICE'];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 28 + Math.floor(i / 2) * 9;
      const stall = new THREE.Group();
      const counter = box(4.4, 1.1, 2.2, new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 }), 0, 0.55, 0);
      stall.add(counter);
      const awn = box(4.8, 0.18, 2.8, new THREE.MeshStandardMaterial({ color: stallCols[i % 5], roughness: 0.8 }), 0, 2.6, 0, false);
      awn.rotation.x = 0.12;
      stall.add(awn);
      for (const px of [-1.9, 1.9]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }));
        pole.position.set(px, 1.3, 1.2);
        stall.add(pole);
      }
      // Goods on the counter: fruit piles in bright colours.
      for (let j = 0; j < 5; j++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6),
          new THREE.MeshStandardMaterial({ color: [0xff3b30, 0xffd21f, 0x39d353, 0xff7a33, 0x7b2fbe][j], roughness: 0.7 }));
        fruit.position.set(-1.6 + j * 0.8, 1.3, this.rng.range(-0.5, 0.5));
        stall.add(fruit);
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7),
        new THREE.MeshBasicMaterial({ map: neonSignTexture(words[i], '#ff2e88'), transparent: false }));
      sign.position.set(0, 3.0, 0);
      stall.add(sign);
      stall.position.set(side * 6.5, 0, z);
      stall.rotation.y = side > 0 ? Math.PI : 0;
      this.market.add(stall);
    }
    // String lights across the aisle.
    for (let z = 30; z <= 48; z += 6) {
      for (let x = -5; x <= 5; x += 2) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5),
          new THREE.MeshStandardMaterial({
            color: 0xffe9a8, emissive: [0xffd21f, 0xff2e88, 0x2ee6c8][Math.abs(x + z) % 3], emissiveIntensity: 2.4,
          }));
        bulb.position.set(x, 3.6 + Math.sin(x * 0.8) * 0.25, z);
        this.market.add(bulb);
      }
    }
    this.group.add(this.market);
  }

  buildProps() {
    // Traffic-light poles, hydrant, benches, bins along the boulevard.
    const dark = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.7, metalness: 0.4 });
    for (const z of [-20, 20, 60, 100]) {
      for (const x of [-8, 8]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.4, 6), dark);
        pole.position.set(x, 2.2, z + 5);
        pole.castShadow = true;
        this.group.add(pole);
        const head = box(0.5, 1.1, 0.4, dark, x, 4.4, z + 5, false);
        this.group.add(head);
        const lamp = box(0.34, 0.3, 0.1, new THREE.MeshStandardMaterial({
          color: 0x39d353, emissive: 0x39d353, emissiveIntensity: 2.5,
        }), x, 4.6, z + 5.25, false);
        this.group.add(lamp);
      }
    }
    const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xe03131, roughness: 0.6 }));
    hydrant.position.set(-8.6, 0.4, 12);
    hydrant.castShadow = true;
    this.group.add(hydrant);
    for (const z of [0, 44, 84]) {
      this.group.add(box(2.4, 0.5, 0.8, new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }), 9.2, 0.45, z));
      this.group.add(box(0.5, 1, 0.7, new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.9 }), -9.2, 0.5, z + 6));
    }
  }
}
