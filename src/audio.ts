import { CONFIG } from './config';
import type { BadEndType } from './texts';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  private lcdMasterGain: GainNode | null = null;
  private realityMasterGain: GainNode | null = null;
  private riverGainNode: GainNode | null = null;
  private sirenGainNode: GainNode | null = null;
  private sirenOscA: OscillatorNode | null = null;

  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private alertTimerSec: number = 0;
  private alertHighTone: boolean = true;
  private sirenPhase: number = 0;

  public initOnUserGesture(): void {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 2.0);
    this.brownNoiseBuffer = this.createBrownNoiseBuffer(this.ctx, 4.0);

    this.lcdMasterGain = this.ctx.createGain();
    this.lcdMasterGain.gain.value = 0.7;
    this.lcdMasterGain.connect(this.ctx.destination);

    this.realityMasterGain = this.ctx.createGain();
    this.realityMasterGain.gain.value = 0.9;
    this.realityMasterGain.connect(this.ctx.destination);

    this.setupRiverAmbience();
    this.setupDistantSiren();
    this.isInitialized = true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.lcdMasterGain && this.realityMasterGain) {
      const now = this.ctx.currentTime;
      this.lcdMasterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, now, 0.04);
      this.realityMasterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.9, now, 0.04);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.2;
    }
    return buffer;
  }

  private setupRiverAmbience(): void {
    if (!this.ctx || !this.brownNoiseBuffer || !this.realityMasterGain) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.brownNoiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    this.riverGainNode = this.ctx.createGain();
    this.riverGainNode.gain.value = 0.085;

    // LFO modulation between 0.05 and 0.12
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.16;

    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.value = 0.035;

    lfo.connect(lfoDepth);
    lfoDepth.connect(this.riverGainNode.gain);

    source.connect(filter);
    filter.connect(this.riverGainNode);
    this.riverGainNode.connect(this.realityMasterGain);

    source.start();
    lfo.start();
  }

  private setupDistantSiren(): void {
    if (!this.ctx || !this.realityMasterGain) return;

    const oscA = this.ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 520;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.sirenGainNode = this.ctx.createGain();
    this.sirenGainNode.gain.value = 0.0;

    oscA.connect(filter);
    filter.connect(this.sirenGainNode);
    this.sirenGainNode.connect(this.realityMasterGain);

    oscA.start();
    this.sirenOscA = oscA;
  }

  /**
   * Dry plastic button click sound (Bandpass 1800Hz, Q=3.0, 0.015s envelope)
   */
  public playPlasticButtonClick(): void {
    if (!this.ctx || !this.noiseBuffer || !this.realityMasterGain || this.isMuted) {
      return;
    }

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + (Math.random() - 0.5) * 180, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.realityMasterGain);

    noise.start(now);
    noise.stop(now + 0.018);
  }

  /**
   * 8-bit movement step sound (Square wave, 120Hz, 0.03s)
   */
  public playMoveStep(): void {
    if (!this.ctx || !this.lcdMasterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.lcdMasterGain);

    osc.start(now);
    osc.stop(now + 0.032);
  }

  /**
   * 8-bit weapon switch blip
   */
  public playWeaponSwitch(): void {
    if (!this.ctx || !this.lcdMasterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(495, now + 0.035);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.lcdMasterGain);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * 8-bit ignition sound (Noise + Lowpass sweep 800Hz -> 200Hz over 0.2s, scaled by weapon power)
   */
  public playIgnition(weaponIndex: number): void {
    if (!this.ctx || !this.noiseBuffer || !this.lcdMasterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.2 + weaponIndex * 0.09;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startFreq = weaponIndex >= 2 ? 1100 : 800;
    const endFreq = weaponIndex === 3 ? 95 : 200;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = this.ctx.createGain();
    const peakGain = 0.18 + weaponIndex * 0.06;
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.lcdMasterGain);

    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  /**
   * Canti Manifestation: Distorted alternative-rock guitar power chord + feedback (3.5s)
   * D2 (73.4Hz), A2 (110Hz), D3 (146.8Hz) + Feedback harmonic (1174.6Hz)
   */
  public playCantiGuitarFeedback(): void {
    if (!this.ctx || !this.realityMasterGain || !this.lcdMasterGain || this.isMuted) {
      return;
    }

    const now = this.ctx.currentTime;
    const duration = CONFIG.TIME.MANIFESTATION_DURATION_SEC;

    // Temporarily mute dry 8-bit LCD sounds during the 3.5s climax
    this.lcdMasterGain.gain.setValueAtTime(0.0, now);
    this.lcdMasterGain.gain.setValueAtTime(0.7, now + duration);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(420);
    shaper.oversample = '4x';

    const cabinetFilter = this.ctx.createBiquadFilter();
    cabinetFilter.type = 'lowpass';
    cabinetFilter.frequency.setValueAtTime(2400, now);
    cabinetFilter.frequency.linearRampToValueAtTime(1650, now + duration);

    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.14;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.32;
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);

    const masterChordGain = this.ctx.createGain();
    masterChordGain.gain.setValueAtTime(0.01, now);
    masterChordGain.gain.linearRampToValueAtTime(0.32, now + 0.06);
    masterChordGain.gain.setValueAtTime(0.28, now + duration - 0.35);
    masterChordGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    const chordFreqs = [73.42, 110.0, 146.83];
    for (const freq of chordFreqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 14, now);
      osc.connect(shaper);
      osc.start(now);
      osc.stop(now + duration);
    }

    // High-pitched amplifier feedback harmonic (D6: 1174.6Hz) swelling in
    const feedbackOsc = this.ctx.createOscillator();
    feedbackOsc.type = 'sawtooth';
    feedbackOsc.frequency.setValueAtTime(1174.66, now);
    const fbGain = this.ctx.createGain();
    fbGain.gain.setValueAtTime(0.001, now);
    fbGain.gain.exponentialRampToValueAtTime(0.16, now + 1.4);
    fbGain.gain.exponentialRampToValueAtTime(0.002, now + duration);

    feedbackOsc.connect(fbGain);
    fbGain.connect(shaper);
    feedbackOsc.start(now);
    feedbackOsc.stop(now + duration);

    shaper.connect(cabinetFilter);
    cabinetFilter.connect(masterChordGain);
    cabinetFilter.connect(delay);
    delay.connect(masterChordGain);
    masterChordGain.connect(this.realityMasterGain);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 44100;
    const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public playBadEndSound(type: BadEndType): void {
    if (!this.ctx || !this.realityMasterGain || !this.lcdMasterGain || this.isMuted) {
      return;
    }

    const now = this.ctx.currentTime;

    if (type === 'suffocation') {
      // Abrupt cut-off of 8-bit sound
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(55, now + 0.18);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.18);
      osc.connect(gain);
      gain.connect(this.lcdMasterGain);
      osc.start(now);
      osc.stop(now + 0.19);
      return;
    }

    if (type === 'destruction') {
      // Intense roaring burnout
      this.playIgnition(3);
      return;
    }

    // Arrested: Sharp police whistle (dual detuned high sine + FM trill)
    const whistleA = this.ctx.createOscillator();
    const whistleB = this.ctx.createOscillator();
    whistleA.type = 'sine';
    whistleB.type = 'triangle';
    whistleA.frequency.setValueAtTime(2820, now);
    whistleB.frequency.setValueAtTime(2950, now);

    const trill = this.ctx.createOscillator();
    trill.frequency.value = 26;
    const trillGain = this.ctx.createGain();
    trillGain.gain.value = 85;
    trill.connect(trillGain);
    trillGain.connect(whistleA.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.setValueAtTime(0.22, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

    whistleA.connect(gain);
    whistleB.connect(gain);
    gain.connect(this.realityMasterGain);

    trill.start(now);
    whistleA.start(now);
    whistleB.start(now);
    trill.stop(now + 0.8);
    whistleA.stop(now + 0.8);
    whistleB.stop(now + 0.8);
  }

  public updateContinuousAudio(
    dt: number,
    suffocation: number,
    destruction: number,
    isPlaying: boolean,
    isManifesting: boolean,
  ): void {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Update distant siren when Destruction >= 35%
    if (this.sirenGainNode && this.sirenOscA) {
      if (isPlaying && destruction >= CONFIG.GAUGE.SIREN_DESTRUCTION_THRESHOLD) {
        const intensity = Math.min(
          1,
          (destruction - CONFIG.GAUGE.SIREN_DESTRUCTION_THRESHOLD) / 55,
        );
        const targetGain = 0.025 + intensity * 0.085;
        this.sirenGainNode.gain.setTargetAtTime(targetGain, now, 0.25);

        this.sirenPhase += dt * 1.35;
        const sirenFreq = Math.sin(this.sirenPhase * Math.PI * 2) >= 0 ? 650 : 520;
        this.sirenOscA.frequency.setTargetAtTime(sirenFreq, now, 0.06);
      } else {
        this.sirenGainNode.gain.setTargetAtTime(0.0, now, 0.3);
      }
    }

    // 2. Danger alert alternating beep (880Hz / 440Hz) when S >= 80% or D >= 80%
    if (!isPlaying || isManifesting) return;

    const isCritical =
      suffocation >= CONFIG.GAUGE.DANGER_THRESHOLD ||
      destruction >= CONFIG.GAUGE.DANGER_THRESHOLD;
    if (!isCritical) {
      this.alertTimerSec = 0;
      return;
    }

    this.alertTimerSec -= dt;
    if (this.alertTimerSec <= 0) {
      this.alertTimerSec = 0.34;
      this.alertHighTone = !this.alertHighTone;
      this.playDangerBeep(this.alertHighTone ? 880 : 440);
    }
  }

  private playDangerBeep(freq: number): void {
    if (!this.ctx || !this.lcdMasterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.lcdMasterGain);

    osc.start(now);
    osc.stop(now + 0.095);
  }
}
