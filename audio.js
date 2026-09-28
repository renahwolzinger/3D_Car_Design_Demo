/**
 * Apex Hyper-EV Web Audio Synthesis Engine
 * Generates dynamic EV motor whine, aerodynamic wind whoosh, hydraulic door FX, and UI sounds
 * using native Web Audio API without requiring any external audio assets.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Motor sound nodes
    this.motorOsc = null;
    this.motorSubOsc = null;
    this.motorGain = null;
    this.motorFilter = null;

    // Wind sound nodes
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;

    this.currentSpeed = 0; // 0 to 100
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.isInitialized = true;
      this._initWind();
      this._initMotor();
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  resume() {
    if (!this.isInitialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.motorGain) {
      this.motorGain.gain.setValueAtTime(this.isMuted ? 0 : this._getMotorTargetGain(), this.ctx ? this.ctx.currentTime : 0);
    }
    if (this.windGain) {
      this.windGain.gain.setValueAtTime(this.isMuted ? 0 : this._getWindTargetGain(), this.ctx ? this.ctx.currentTime : 0);
    }
    return this.isMuted;
  }

  _initMotor() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Main dual-motor high-frequency EV inverter whine
    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'triangle';
    this.motorOsc.frequency.setValueAtTime(80, now);

    // Sub-harmonic resonant rumble
    this.motorSubOsc = this.ctx.createOscillator();
    this.motorSubOsc.type = 'sine';
    this.motorSubOsc.frequency.setValueAtTime(40, now);

    this.motorFilter = this.ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.setValueAtTime(300, now);
    this.motorFilter.Q.setValueAtTime(4.0, now);

    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.setValueAtTime(0, now);

    this.motorOsc.connect(this.motorFilter);
    this.motorSubOsc.connect(this.motorFilter);
    this.motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.ctx.destination);

    this.motorOsc.start(now);
    this.motorSubOsc.start(now);
  }

  _initWind() {
    if (!this.ctx) return;
    // Generate pink noise buffer for aerodynamic flow
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);

    this.windSource.start(0);
  }

  setDriveSpeed(speedMph) {
    this.currentSpeed = Math.max(0, Math.min(200, speedMph));
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const factor = this.currentSpeed / 200;

    // Pitch shifts upward with speed from 80Hz to 680Hz
    const targetFreq = 80 + factor * 580;
    const targetSub = 40 + factor * 220;
    const targetFilter = 350 + factor * 1400;

    this.motorOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.motorSubOsc.frequency.setTargetAtTime(targetSub, now, 0.1);
    this.motorFilter.frequency.setTargetAtTime(targetFilter, now, 0.1);

    const gain = factor > 0 ? 0.04 + factor * 0.12 : 0;
    this.motorGain.gain.setTargetAtTime(gain, now, 0.1);

    // Wind roar scales with vehicle velocity
    const windGainTarget = factor > 0 ? factor * 0.15 : 0;
    const windFreqTarget = 300 + factor * 1200;
    this.windGain.gain.setTargetAtTime(windGainTarget, now, 0.15);
    this.windFilter.frequency.setTargetAtTime(windFreqTarget, now, 0.15);
  }

  setWindTunnelActive(active, intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.windGain.gain.setTargetAtTime(0.12 * intensity, now, 0.4);
      this.windFilter.frequency.setTargetAtTime(500 + intensity * 600, now, 0.4);
    } else {
      this.windGain.gain.setTargetAtTime(0, now, 0.3);
    }
  }

  stopMotor() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.motorGain) this.motorGain.gain.setTargetAtTime(0, now, 0.2);
    if (this.windGain) this.windGain.gain.setTargetAtTime(0, now, 0.2);
  }

  playDoorSound(isOpen) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    // Pneumatic actuator whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOpen ? 220 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(isOpen ? 440 : 180, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // Mechanical latch click
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(800, t);
      click.frequency.exponentialRampToValueAtTime(120, t + 0.05);

      clickGain.gain.setValueAtTime(0.2, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      click.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      click.start(t);
      click.stop(t + 0.06);
    }, isOpen ? 320 : 360);
  }

  playModeChime() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.06, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.3);
    });
  }

  playClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playShutterSound() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const now = this.ctx.currentTime;

    // Dual-curtain camera shutter click
    [0, 0.06].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, now + offset);
      osc.frequency.exponentialRampToValueAtTime(120, now + offset + 0.04);

      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.04);
    });
  }

  _getMotorTargetGain() {
    return this.currentSpeed > 0 ? 0.04 + (this.currentSpeed / 200) * 0.12 : 0;
  }

  _getWindTargetGain() {
    return (this.currentSpeed / 200) * 0.15;
  }
}

export const sound = new SoundEngine();
