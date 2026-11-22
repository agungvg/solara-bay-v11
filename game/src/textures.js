// Procedural canvas textures: road, facades, sand, water, plaza, neon signs.
// Nothing is fetched — every texture is drawn in code, so the game plays offline.
import * as THREE from 'three';

function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

// Asphalt with a dashed centre line and worn edge lines; tiled along the road.
export function roadTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#3a3f47'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${20 + Math.random() * 40 | 0},${20 + Math.random() * 40 | 0},${25 + Math.random() * 40 | 0},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 5);
    }
    g.fillStyle = '#e8c832';
    g.fillRect(w / 2 - 14, 0, 5, h); g.fillRect(w / 2 + 9, 0, 5, h);
    g.fillStyle = '#f4f6f8';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 3, y + 8, 6, 34);
    g.fillStyle = 'rgba(244,246,248,0.85)';
    g.fillRect(8, 0, 4, h); g.fillRect(w - 12, 0, 4, h);
  }, 1, 6);
}

// Wet asphalt for the golden-hour chase: darker, glossier, neon streaks baked in.
export function wetRoadTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#2e323c'; g.fillRect(0, 0, w, h);
    const streaks = ['#ff2e88', '#ff7a33', '#2ee6c8', '#ffd21f', '#7b2fbe'];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = streaks[i % streaks.length];
      g.globalAlpha = 0.10 + Math.random() * 0.16;
      const x = Math.random() * w, len = 40 + Math.random() * 160;
      g.fillRect(x, Math.random() * h, 3 + Math.random() * 6, len);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#e8c832';
    g.fillRect(w / 2 - 14, 0, 5, h); g.fillRect(w / 2 + 9, 0, 5, h);
    g.fillStyle = '#f4f6f8';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 3, y + 8, 6, 34);
  }, 1, 6);
}

// Warm sunlit facade: painted wall + lit window grid + a shopfront band at the base.
export function facadeTexture(base, trim, lit = 0.85) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    g.fillStyle = trim; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 34, w, 34);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const x = 14 + col * 40, y = 24 + row * 38;
        const on = Math.random() < lit;
        g.fillStyle = on ? '#ffe9a8' : '#2c3e55';
        g.fillRect(x, y, 26, 24);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
        g.strokeRect(x, y, 26, 24);
        if (on) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, y, 26, 5); }
      }
    }
    g.fillStyle = '#20242c';
    g.fillRect(10, h - 30, 90, 26); g.fillRect(150, h - 30, 90, 26);
  });
}

// Glass tower: blue glass with bright mullion grid and sky glints.
export function glassTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#9fd4f5'); grad.addColorStop(0.5, '#5aa8dd'); grad.addColorStop(1, '#2f6ea8');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 26, 18);
  });
}

// Beach sand with speckle, footprints and shell flecks.
export function sandTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ecd9a4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const s = Math.random();
      g.fillStyle = s < 0.5 ? 'rgba(190,160,105,0.5)' : s < 0.85 ? 'rgba(255,246,214,0.6)' : 'rgba(214,120,90,0.5)';
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    g.strokeStyle = 'rgba(150,120,70,0.35)';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 14, 0, Math.PI * 2);
      g.stroke();
    }
  }, 6, 6);
}

// Ocean: teal water with soft wave streaks and foam flecks.
export function waterTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e7f9e'); grad.addColorStop(0.5, '#2aa5c4'); grad.addColorStop(1, '#16607e');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * h, x = Math.random() * w, len = 30 + Math.random() * 70;
      g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + len * 0.3, y - 4, x + len * 0.6, y + 4, x + len, y);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }, 8, 8);
}

// Market plaza cobbles: warm stone grid with worn patches.
export function plazaTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b59a78'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const v = 150 + Math.random() * 60 | 0;
      g.fillStyle = `rgb(${v},${v * 0.86 | 0},${v * 0.62 | 0})`;
      g.fillRect(x + 1, y + 1, 30, 30);
    }
    g.fillStyle = 'rgba(60,40,20,0.18)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 6, 4);
  }, 8, 8);
}

// Big black POLICE door lettering on a white door (Lyso's police-car ref).
export function policeDoorTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#0b0e13';
  g.font = '900 104px Arial, Helvetica, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POLICE', 256, 86);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Small "911" rear-quarter marking.
export function nineOneOneTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#0b0e13';
  g.font = '900 40px Arial, Helvetica, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('911', 64, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Neon shop sign text (FRUIT, TACOS, FISH) drawn on a dark board.
export function neonSignTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#12060d'; g.fillRect(0, 0, 512, 128);
  g.font = '900 84px Arial, Helvetica, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(word, 256, 68);
  g.shadowBlur = 0;
  g.strokeStyle = color; g.lineWidth = 4;
  g.strokeRect(6, 6, 500, 116);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sidewalk slabs with a warm tint.
export function sidewalkTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9bda6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,70,50,0.5)'; g.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(90,70,50,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, 4, 4);
}
