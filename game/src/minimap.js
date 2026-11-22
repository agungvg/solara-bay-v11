// Circular minimap: a 2D canvas the HUD draws each tick — the street grid,
// the beach and ocean, seven district labels, the player arrow, police blips,
// the mission marker and the north indicator. The map presents state; it never
// mutates the world (markers are read from the game state by stable id).
const DISTRICTS = [
  { id: 'kumala', name: 'KUMALA STRAND', x: 0, z: -55, color: '#2ee6c8' },
  { id: 'lantern', name: 'LANTERN MARKET', x: -28, z: 40, color: '#ffd21f' },
  { id: 'marina', name: 'MARINA', x: 42, z: -60, color: '#2ee6c8' },
  { id: 'downtown', name: 'DOWNTOWN', x: 10, z: 85, color: '#ff7a33' },
  { id: 'docks', name: 'DOCKS', x: -52, z: 95, color: '#ff7a33' },
  { id: 'pier', name: 'KUMALA PIER', x: -30, z: -85, color: '#2ee6c8' },
  { id: 'heights', name: 'PALM HEIGHTS', x: 52, z: 45, color: '#ffd21f' },
  { id: 'bridge', name: 'TARPON BRIDGE', x: 0, z: -110, color: '#ff2e88' },
];

export const DISTRICT_NAMES = DISTRICTS.map((d) => d.name);

// World (x -90..90, z -130..130) maps onto the canvas; the view follows the player.
export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(state) {
    const ctx = this.ctx;
    const S = this.canvas.width; // 284
    const scale = S / 220; // world units -> px, centred on the player
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    const px = state.player.x, pz = state.player.z;
    const X = (x) => S / 2 + (x - px) * scale;
    const Z = (z) => S / 2 + (z - pz) * scale;
    // Ocean (top of the world) + sand.
    ctx.fillStyle = '#0d2233'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#1e7f9e';
    ctx.fillRect(0, 0, S, Math.max(0, Z(-86) + 26 * scale));
    ctx.fillStyle = '#ecd9a4';
    ctx.fillRect(0, Math.max(0, Z(-86)), S, 26 * scale);
    // City blocks.
    ctx.fillStyle = '#31435c';
    for (let gx = -80; gx <= 80; gx += 20) {
      for (let gz = -60; gz <= 120; gz += 20) {
        if (Math.abs(gx) < 12) continue; // the boulevard gap
        ctx.fillRect(X(gx) - 8 * scale, Z(gz) - 8 * scale, 16 * scale, 16 * scale);
      }
    }
    // Streets.
    ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(0), 0); ctx.lineTo(X(0), S);
    for (const z of [-20, 20, 60, 100]) { ctx.moveTo(0, Z(z)); ctx.lineTo(S, Z(z)); }
    ctx.stroke();
    // District dots + labels.
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(X(d.x), Z(d.z), 4, 0, Math.PI * 2); ctx.fill();
    }
    // Mission marker (pulsing yellow diamond).
    if (state.missionMarker) {
      const m = state.missionMarker;
      const pulse = 6 + 2.5 * Math.sin(performance.now() / 220);
      ctx.fillStyle = '#ffd21f';
      ctx.save();
      ctx.translate(X(m.x), Z(m.z));
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      ctx.restore();
    }
    // Police blips (red) + player arrow (white, heading up).
    ctx.fillStyle = '#ff3b30';
    for (const p of state.policeBlips ?? []) {
      ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(state.player.heading ?? 0);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // North indicator.
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', S / 2, 20);
    ctx.restore();
  }
}
