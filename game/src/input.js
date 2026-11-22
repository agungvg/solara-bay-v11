// Input: browser keys and mouse mapped to semantic actions the simulation
// consumes — never raw keys inside the sim. WASD drive/walk, E enter/exit,
// F shoot, 1–6 weapons, M map, Space handbrake, Shift sprint, R retry.
export class InputSystem {
  constructor() {
    this.keys = new Set();
    this.actions = { throttle: 0, steer: 0, brake: false, sprint: false };
    this.pressed = new Set(); // edge-triggered, consumed once per frame
    this.mouseDown = false;
    this.onAction = null; // (name) => void, for discrete actions
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (this.onAction) {
        if (e.code === 'KeyE') this.onAction('enterExit');
        if (e.code === 'KeyF') this.onAction('shoot');
        if (e.code === 'KeyM') this.onAction('map');
        if (e.code === 'KeyR') this.onAction('retry');
        if (e.code === 'KeyC') this.onAction('camera');
        if (/^Digit[1-6]$/.test(e.code)) this.onAction(`weapon${e.code.slice(5)}`);
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousedown', () => { this.mouseDown = true; if (this.onAction) this.onAction('shoot'); });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
  }

  get down() { return this.keys; }

  // Continuous axes, refreshed every tick from the held keys.
  poll() {
    const k = this.keys;
    const fwd = k.has('KeyW') || k.has('ArrowUp');
    const back = k.has('KeyS') || k.has('ArrowDown');
    const left = k.has('KeyA') || k.has('ArrowLeft');
    const right = k.has('KeyD') || k.has('ArrowRight');
    this.actions.throttle = fwd ? 1 : back ? -0.6 : 0;
    this.actions.steer = (left ? -1 : 0) + (right ? 1 : 0);
    this.actions.brake = k.has('Space');
    this.actions.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    return this.actions;
  }

  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  endFrame() { this.pressed.clear(); }
}
