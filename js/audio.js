// audio.js - Web Audio API procedural sounds

const Audio = {
  ctx: null,
  enabled: true,
  masterGain: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio not available');
      this.enabled = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  setEnabled(v) {
    this.enabled = v;
    if (this.masterGain) {
      this.masterGain.gain.value = v ? 0.3 : 0;
    }
  },

  // Play a simple tone
  _tone(freq, duration, type = 'sine', gainVal = 0.3) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  // Noise burst
  _noise(duration, gainVal = 0.15) {
    if (!this.ctx || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  },

  // Sound effects
  click() {
    this._tone(800, 0.08, 'square', 0.1);
  },

  hover() {
    this._tone(600, 0.04, 'sine', 0.05);
  },

  diceRoll() {
    // Multiple rapid clicks to simulate dice clatter
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this._noise(0.03, 0.2);
        this._tone(200 + Math.random() * 400, 0.05, 'square', 0.08);
      }, i * 60 + Math.random() * 30);
    }
  },

  diceResult() {
    this._tone(440, 0.15, 'sine', 0.2);
    setTimeout(() => this._tone(660, 0.15, 'sine', 0.15), 100);
  },

  hit() {
    this._noise(0.15, 0.3);
    this._tone(100, 0.2, 'sawtooth', 0.2);
  },

  criticalHit() {
    this._noise(0.2, 0.4);
    this._tone(80, 0.3, 'sawtooth', 0.3);
    setTimeout(() => this._tone(60, 0.2, 'sawtooth', 0.2), 100);
  },

  heal() {
    this._tone(440, 0.1, 'sine', 0.15);
    setTimeout(() => this._tone(554, 0.1, 'sine', 0.12), 100);
    setTimeout(() => this._tone(659, 0.15, 'sine', 0.1), 200);
  },

  death() {
    this._tone(200, 0.3, 'sawtooth', 0.2);
    setTimeout(() => this._tone(150, 0.3, 'sawtooth', 0.15), 150);
    setTimeout(() => this._tone(100, 0.5, 'sawtooth', 0.1), 300);
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this._tone(n, 0.3, 'sine', 0.2), i * 150);
    });
  },

  defeat() {
    const notes = [400, 350, 300, 200];
    notes.forEach((n, i) => {
      setTimeout(() => this._tone(n, 0.4, 'sawtooth', 0.15), i * 200);
    });
  },

  encounter() {
    this._tone(330, 0.2, 'sine', 0.15);
    setTimeout(() => this._tone(440, 0.3, 'sine', 0.12), 150);
  },

  buttonClick() {
    this._tone(660, 0.06, 'square', 0.08);
    this._tone(880, 0.06, 'sine', 0.05);
  },

  skillUse() {
    this._tone(600, 0.1, 'sine', 0.2);
    setTimeout(() => this._tone(900, 0.15, 'sine', 0.15), 80);
    this._noise(0.1, 0.1);
  },

  bombExplode() {
    this._noise(0.4, 0.5);
    this._tone(60, 0.5, 'sawtooth', 0.3);
    this._tone(40, 0.6, 'square', 0.2);
  },

  poison() {
    this._tone(200, 0.2, 'sine', 0.1);
    setTimeout(() => this._tone(250, 0.15, 'sine', 0.08), 100);
    setTimeout(() => this._tone(180, 0.2, 'sine', 0.06), 200);
  },

  newDay() {
    this._tone(440, 0.2, 'sine', 0.15);
    setTimeout(() => this._tone(550, 0.2, 'sine', 0.12), 200);
    setTimeout(() => this._tone(660, 0.3, 'sine', 0.1), 400);
  }
};
