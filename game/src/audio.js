// Audio: everything is synthesised with Web Audio — engine hum, two-tone KPD
// siren, gunshots, pickup blips and a radio jingle. No audio files, no network.
// The context starts suspended and resumes on the first user gesture.
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
    this.radioTimer = 0;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.4;
      this.master.connect(this.ctx.destination);
      // Engine: low sawtooth + a little noise, gain follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren: two-tone triangle, slow wail.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 660;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEngine(speedKmh, driving) {
    if (!this.ctx) return;
    this.engineOsc.frequency.value = 50 + speedKmh * 1.1;
    this.engineGain.gain.value = driving ? 0.05 + Math.min(0.09, speedKmh * 0.0006) : 0.02;
  }

  setSiren(wanted) {
    if (!this.ctx) return;
    const on = wanted > 0;
    this.sirenGain.gain.value = on ? 0.045 : 0;
    if (on) this.sirenOsc.frequency.value = 620 + 180 * Math.sin(performance.now() / 420);
  }

  blip(freq = 880, dur = 0.09, type = 'sine', vol = 0.15) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  gunshot() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(g); g.connect(this.master);
    src.start();
  }

  // A tiny island-pop radio jingle, four bars, pentatonic.
  radioJingle() {
    if (!this.ctx || this.muted) return;
    const notes = [523, 587, 659, 784, 659, 587, 523, 440];
    notes.forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.08), i * 140);
    });
  }

  update(dt, state) {
    if (!this.ctx) return;
    this.setEngine(state.speedKmh, state.driving);
    this.setSiren(state.wanted);
    this.radioTimer += dt;
    if (this.radioTimer > 24) { this.radioTimer = 0; this.radioJingle(); }
  }
}
