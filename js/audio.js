// 8-bit Chiptune Audio Engine using Web Audio API

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = (typeof localStorage !== 'undefined' && localStorage.getItem('firestarter_muted') === 'true');
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.cityRatio = 0.4;
    this.initialized = false;
  }

  setCityRatio(ratio) {
    this.cityRatio = (typeof ratio === 'number') ? ratio : 0.4;
  }

  init() {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('firestarter_muted', String(this.muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
    }
    return this.muted;
  }

  setMuted(val) {
    this.muted = !!val;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('firestarter_muted', String(this.muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  // --- Core Synthesis Utilities ---

  playTone(freq, type = 'square', duration = 0.1, gainVal = 0.3, pitchSlideTo = null) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (pitchSlideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, pitchSlideTo), now + duration);
      }

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (_) {}
  }

  playNoise(duration = 0.2, gainVal = 0.3, lowpassFreq = null) {
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      let targetNode = gain;
      if (lowpassFreq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(lowpassFreq, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + duration);
        noise.connect(filter);
        targetNode = filter;
      } else {
        noise.connect(gain);
      }

      gain.connect(this.masterGain);
      noise.start(now);
    } catch (_) {}
  }

  // --- Specific Sound Effects ---

  sfxMatch() {
    this.ensureContext();
    this.playNoise(0.08, 0.2, 1200);
    this.playTone(480, 'square', 0.12, 0.18, 720);
  }

  sfxLighter() {
    this.ensureContext();
    this.playTone(1200, 'square', 0.04, 0.3, 1600);
    setTimeout(() => this.playNoise(0.16, 0.25, 800), 40);
  }

  sfxMolotov() {
    this.ensureContext();
    this.playTone(320, 'triangle', 0.18, 0.25, 180);
    setTimeout(() => {
      this.playNoise(0.35, 0.45, 1600);
      this.playTone(200, 'square', 0.25, 0.2, 90);
    }, 180);
  }

  sfxBombPlant() {
    this.ensureContext();
    this.playTone(880, 'sine', 0.08, 0.25);
    setTimeout(() => this.playTone(1100, 'sine', 0.08, 0.25), 90);
  }

  sfxBombTick() {
    this.ensureContext();
    this.playTone(1760, 'square', 0.03, 0.15);
  }

  sfxExplosion() {
    this.ensureContext();
    this.playNoise(0.65, 0.5, 500);
    this.playTone(110, 'sawtooth', 0.5, 0.4, 25);
  }

  sfxWater() {
    this.ensureContext();
    this.playNoise(0.2, 0.22, 900);
    this.playTone(300, 'sine', 0.18, 0.15, 450);
  }

  sfxPoliceAlert() {
    this.ensureContext();
    this.playTone(920, 'square', 0.12, 0.35, 1150);
    setTimeout(() => this.playTone(1380, 'square', 0.16, 0.35, 1650), 110);
  }

  sfxPoliceWhistle() {
    this.ensureContext();
    this.playTone(2200, 'square', 0.07, 0.2);
    setTimeout(() => this.playTone(2600, 'square', 0.09, 0.22), 60);
  }

  sfxFirefighterSiren() {
    this.ensureContext();
    this.playTone(650, 'sawtooth', 0.18, 0.2, 850);
  }

  sfxItemSwitch() {
    this.ensureContext();
    this.playTone(600, 'triangle', 0.05, 0.2, 900);
  }

  sfxMenuSelect() {
    this.ensureContext();
    this.playTone(523, 'square', 0.06, 0.25);
    setTimeout(() => this.playTone(784, 'square', 0.08, 0.3), 50);
  }

  sfxItemCollect() {
    this.ensureContext();
    this.playTone(659, 'square', 0.06, 0.25);
    setTimeout(() => this.playTone(880, 'square', 0.08, 0.3), 60);
    setTimeout(() => this.playTone(1046, 'square', 0.12, 0.35), 130);
  }

  sfxStun() {
    this.ensureContext();
    this.playTone(1500, 'sine', 0.08, 0.2, 1800);
    setTimeout(() => this.playTone(2000, 'sine', 0.08, 0.22, 2400), 70);
    setTimeout(() => this.playTone(2600, 'sine', 0.12, 0.25, 3000), 140);
  }

  sfxDash() {
    this.ensureContext();
    this.playNoise(0.06, 0.15, 1000);
  }

  sfxTensionBonus() {
    this.ensureContext();
    this.playTone(1320, 'sine', 0.05, 0.10, 1760);
  }

  sfxBreakAway() {
    this.ensureContext();
    this.playTone(220, 'sawtooth', 0.12, 0.4, 80);
    this.playNoise(0.18, 0.35, 800);
    setTimeout(() => this.playTone(440, 'triangle', 0.1, 0.25, 220), 50);
  }

  sfxPolicePanic() {
    this.ensureContext();
    this.playTone(1200, 'square', 0.08, 0.3, 1800);
    setTimeout(() => this.playTone(1800, 'square', 0.08, 0.3, 2400), 70);
    setTimeout(() => this.playTone(2400, 'square', 0.15, 0.35, 1200), 140);
  }

  sfxGameOver(reasonId) {
    this.ensureContext();
    this.stopBGM();
    if (reasonId === 'FULL_BURN') {
      // Hollow extinction resonance & desolate wind
      this.playNoise(0.8, 0.28, 400);
      this.playTone(440, 'triangle', 0.45, 0.25, 220);
      setTimeout(() => this.playTone(330, 'triangle', 0.55, 0.25, 110), 300);
      setTimeout(() => this.playNoise(0.9, 0.22, 200), 550);
      setTimeout(() => this.playTone(110, 'sine', 1.0, 0.2, 55), 750);
    } else if (reasonId === 'CRUSHED') {
      // Heavy crushing descending tritone
      this.playTone(280, 'sawtooth', 0.25, 0.35, 140);
      setTimeout(() => this.playTone(140, 'sawtooth', 0.3, 0.4, 70), 200);
      setTimeout(() => this.playNoise(0.5, 0.45, 250), 400);
    } else {
      // Arrested: harsh siren cutoff
      this.playTone(950, 'square', 0.15, 0.35, 750);
      setTimeout(() => this.playTone(720, 'square', 0.15, 0.35, 540), 140);
      setTimeout(() => this.playTone(480, 'square', 0.4, 0.4, 240), 280);
    }
  }

  // --- 8-Bit Procedural BGM (FLCL Firestarter Theme) ---
  // A melancholic, driving minor-key groove evoking 90s anime & Game Boy soundtracks

  startBGM() {
    if (this.bgmPlaying) return;
    if (typeof window === 'undefined') return;
    this.ensureContext();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Melody notes (in Hz, 0 = rest)
    // Scale: D minor / F major (D, E, F, G, A, Bb, C)
    const melody = [
      293.66, 0, 349.23, 0, 440.00, 0, 392.00, 349.23, // D4, F4, A4, G4, F4
      329.63, 0, 293.66, 0, 261.63, 0, 293.66, 0,      // E4, D4, C4, D4
      440.00, 0, 466.16, 0, 440.00, 392.00, 349.23, 0, // A4, Bb4, A4, G4, F4
      329.63, 349.23, 329.63, 0, 293.66, 0, 0, 0        // E4, F4, E4, D4
    ];

    const bass = [
      146.83, 146.83, 146.83, 146.83, 174.61, 174.61, 196.00, 174.61, // D3, F3, G3, F3
      130.81, 130.81, 146.83, 146.83, 116.54, 116.54, 146.83, 146.83, // C3, D3, Bb2, D3
      174.61, 174.61, 196.00, 196.00, 174.61, 174.61, 146.83, 146.83,
      130.81, 130.81, 146.83, 146.83, 146.83, 146.83, 146.83, 146.83
    ];

    const baseStepDuration = 155; // ~97 BPM 16th notes

    const tick = () => {
      if (!this.bgmPlaying) return;
      if (!this.muted && this.ctx) {
        const step = this.bgmStep % 32;

        const isFrenzy = this.cityRatio <= 0.12;
        const isLonely = this.cityRatio <= 0.30;
        const isDense = this.cityRatio >= 0.75;

        // Lead melody
        const mFreq = melody[step];
        if (mFreq > 0) {
          if (isFrenzy && Math.random() < 0.28) {
            // High pitch frenzy glitch
            this.playTone(mFreq * 1.5, 'square', 0.08, 0.12);
          } else if (isLonely && Math.random() < 0.35) {
            // Desolate pauses when the city is disappearing (whispering cold wind)
            this.playNoise(0.08, 0.03, 700);
          } else {
            this.playTone(mFreq, isLonely ? 'triangle' : 'square', 0.12, 0.11);
          }
        }

        // Bass channel (heavier sawtooth under dense city sprawl)
        const bFreq = bass[step];
        if (bFreq > 0 && step % 2 === 0) {
          this.playTone(bFreq, isDense ? 'sawtooth' : 'triangle', 0.22, isDense ? 0.22 : 0.18);
        }

        // Noise percussion (snare on 4, 12, 20, 28)
        if (step % 8 === 4) {
          this.playNoise(0.05, 0.08, 1200);
        } else if (step % 4 === 0) {
          // Subtle kick or frantic heartbeat pulse
          this.playTone(isFrenzy ? 75 : 90, 'sine', 0.07, isFrenzy ? 0.18 : 0.12, 30);
        }
      }

      this.bgmStep++;
      const currentStepDuration = (this.cityRatio <= 0.12) ? 122 : baseStepDuration;
      this.bgmTimer = setTimeout(tick, currentStepDuration);
    };

    tick();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audio = new SoundSystem();
