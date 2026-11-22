// Sky + clouds + light presets. One time-of-day parameter drives the sky dome,
// the fog, the sun and the cloud tint together (Tier 1 gradient dome + Tier 2
// billboard clouds: flattened sphere clusters, DoubleSide, fog:false, slow drift).
// Fog colour === horizon colour at every keyframe. Adapted to three r160.
import * as THREE from 'three';
import { makeRng } from './rng.js';

export const PRESETS = {
  // NOON — the game's base identity: bright blue sky, high white sun.
  noon: {
    top: 0x2f7fe0, mid: 0x7db8f0, horizon: 0xcfe8ff, fog: 0xcfe8ff,
    sunColor: 0xfff6e0, sunIntensity: 3.0, sunPos: [55, 130, 45],
    hemiSky: 0xbfe0ff, hemiGround: 0x8a7a5a, hemiIntensity: 0.9,
    exposure: 1.05, cloud: 0xffffff, cloudUnderside: 0xe8f2ff,
    fillIntensity: 0.35, fillColor: 0xffffff,
  },
  // GOLDEN HOUR — pink/orange/purple sunset with clouds, the chase look.
  golden: {
    top: 0x6b4a9e, mid: 0xff7a4d, horizon: 0xffb347, fog: 0xff9e66,
    sunColor: 0xffb36b, sunIntensity: 2.2, sunPos: [-95, 26, -70],
    hemiSky: 0xff9e7a, hemiGround: 0x5a3a4a, hemiIntensity: 0.7,
    exposure: 1.0, cloud: 0xffd9c2, cloudUnderside: 0xff9e8a,
    fillIntensity: 0.9, fillColor: 0xffd9a8,
  },
  // NIGHT — deep blue, stars, moon; neon carries the scene.
  night: {
    top: 0x050914, mid: 0x0d1b3d, horizon: 0x24355e, fog: 0x1c2a52,
    sunColor: 0x9db8ff, sunIntensity: 0.35, sunPos: [-40, 90, -30],
    hemiSky: 0x24355e, hemiGround: 0x0a0c12, hemiIntensity: 0.35,
    exposure: 0.9, cloud: 0x8fa3c8, cloudUnderside: 0x4a5a80,
    fillIntensity: 0.25, fillColor: 0x9db8ff,
  },
  // RAIN — flat grey, low sun, wet streets.
  rain: {
    top: 0x5a6a7a, mid: 0x7d8b9a, horizon: 0xa8b4c0, fog: 0xa8b4c0,
    sunColor: 0xdfe8f0, sunIntensity: 1.4, sunPos: [30, 80, 20],
    hemiSky: 0xa8b4c0, hemiGround: 0x4a4a44, hemiIntensity: 0.8,
    exposure: 0.95, cloud: 0xdde4ea, cloudUnderside: 0x9aa6b2,
    fillIntensity: 0.5, fillColor: 0xdfe8f0,
  },
};

function skyMaterial(preset) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(preset.top) },
      midColor: { value: new THREE.Color(preset.mid) },
      horizonColor: { value: new THREE.Color(preset.horizon) },
      sunDir: { value: new THREE.Vector3(...preset.sunPos).normalize() },
      sunColor: { value: new THREE.Color(preset.sunColor) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // pin the dome to the far plane
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor;
      uniform vec3 sunDir; uniform vec3 sunColor;
      void main() {
        float h = clamp(vDir.y, -0.08, 1.0);
        vec3 col = h > 0.45
          ? mix(midColor, topColor, smoothstep(0.45, 1.0, h))
          : mix(horizonColor, midColor, smoothstep(0.0, 0.45, h));
        float sunAmt = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(sunAmt, 220.0) * 1.4;   // sun disc
        col += sunColor * pow(sunAmt, 8.0) * 0.28;    // warm halo
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// One cloud = a cluster of flattened spheres, bright white, never fogged out.
function makeCloud(rng) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.28,
    roughness: 1, metalness: 0, fog: false,
  });
  const puffs = 4 + rng.int(0, 3);
  for (let i = 0; i < puffs; i++) {
    const r = rng.range(5, 9);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat);
    puff.position.set(rng.range(-7, 7), rng.range(-1, 1.6), rng.range(-3, 3));
    puff.scale.y = 0.42;
    group.add(puff);
  }
  group.userData.mat = mat;
  return group;
}

export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.rng = makeRng(77);
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(620, 32, 16), skyMaterial(PRESETS.noon));
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(0xfff6e0, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.near = 1; cam.far = 420;
    cam.left = -110; cam.right = 110; cam.top = 110; cam.bottom = -110;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.3;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x8a7a5a, 0.9);
    scene.add(this.hemi);

    // Warm bounce fill from behind the camera: lifts the shadow sides of cars
    // and buildings at golden hour, so nothing ever reads near-black.
    this.fill = new THREE.DirectionalLight(0xffd9a8, 0.9);
    this.fill.position.set(40, 50, 80);
    scene.add(this.fill);

    this.clouds = [];
    // In-frame cloud band: LOW enough to sit inside a level chase-camera
    // frame (y 30–55, z -40..-150), spread across the sky above the boulevard
    // so the cover reads blue sky + fluffy white clouds, not an empty dome.
    const spots = [
      [-52, 40, -90], [-28, 48, -120], [4, 38, -105], [34, 44, -80], [58, 50, -115],
      [-70, 34, -40], [-18, 52, -60], [22, 36, -30], [66, 42, -45], [-42, 46, -20],
      [8, 55, -140], [-58, 58, -130], [48, 60, -135], [0, 34, -150],
    ];
    for (const [x, y, z] of spots) {
      const cloud = makeCloud(this.rng);
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(this.rng.range(1.3, 2.2));
      cloud.userData.drift = this.rng.range(0.4, 1.1);
      scene.add(cloud);
      this.clouds.push(cloud);
    }
    this.stars = this.makeStars();
    scene.add(this.stars);
    this.applyPreset('noon');
  }

  makeStars() {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 420; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const e = this.rng.range(0.15, 1.4);
      const r = 580;
      pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 });
    return new THREE.Points(geo, mat);
  }

  applyPreset(name) {
    const p = PRESETS[name];
    this.preset = name;
    const m = this.dome.material;
    m.uniforms.topColor.value.set(p.top);
    m.uniforms.midColor.value.set(p.mid);
    m.uniforms.horizonColor.value.set(p.horizon);
    m.uniforms.sunDir.value.set(...p.sunPos).normalize();
    m.uniforms.sunColor.value.set(p.sunColor);
    this.scene.fog = new THREE.Fog(p.fog, 130, 520);
    this.sun.color.set(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sun.position.set(...p.sunPos);
    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.fill.color.set(p.fillColor);
    this.fill.intensity = p.fillIntensity;
    this.renderer.toneMappingExposure = p.exposure;
    for (const c of this.clouds) {
      c.userData.mat.color.set(p.cloud);
      c.userData.mat.emissive.set(p.cloudUnderside);
      c.userData.mat.emissiveIntensity = name === 'night' ? 0.12 : 0.28;
    }
    this.stars.material.opacity = name === 'night' ? 0.9 : 0;
  }

  // Slow wind drift; clouds wrap around the playfield instead of regenerating.
  update(dt, time) {
    for (const c of this.clouds) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 150) c.position.x = -150;
    }
    void time;
  }
}
