import type { AudioSettings } from '@/types/tsukuyomi';

type SfxKind = 'activate' | 'complete';

const SFX_PATHS: Record<SfxKind, string> = {
  activate: '/audio/sharingan-activate.mp3',
  complete: '/audio/tsukuyomi-complete.mp3',
};

interface AmbientNodes {
  rainSource: AudioBufferSourceNode | null;
  rainGain: GainNode | null;
  windSource: AudioBufferSourceNode | null;
  windLfo: OscillatorNode | null;
  windGain: GainNode | null;
  binauralLeft: OscillatorNode | null;
  binauralRight: OscillatorNode | null;
  binauralGain: GainNode | null;
}

/**
 * Global Web Audio API singleton with HTML5 MP3 fallback support.
 * Lives outside React lifecycle so ambient audio never cuts when switching tabs.
 */
class TsukuyomiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private unavailableFiles = new Set<string>();
  private lastSettings: AudioSettings = {
    muted: false,
    sfxVolume: 0.7,
    rainVolume: 0,
    windVolume: 0,
    binauralVolume: 0,
  };

  private nodes: AmbientNodes = {
    rainSource: null,
    rainGain: null,
    windSource: null,
    windLfo: null,
    windGain: null,
    binauralLeft: null,
    binauralRight: null,
    binauralGain: null,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.lastSettings.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Autoplay policy will unlock on next user gesture.
      });
    }

    return this.ctx;
  }

  public async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore if browser rejects before gesture
      }
    }
    this.applyAmbientVolumes();
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }

    const durationSeconds = 4;
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // Paul Kellet's pink noise filter for warm organic rain & wind texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  private ensureRainGraph(ctx: AudioContext): GainNode {
    if (this.nodes.rainGain && this.nodes.rainSource) {
      return this.nodes.rainGain;
    }

    const source = ctx.createBufferSource();
    source.buffer = this.getPinkNoiseBuffer(ctx);
    source.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 320;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2600;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    source.start();
    this.nodes.rainSource = source;
    this.nodes.rainGain = gain;
    return gain;
  }

  private ensureWindGraph(ctx: AudioContext): GainNode {
    if (this.nodes.windGain && this.nodes.windSource) {
      return this.nodes.windGain;
    }

    const source = ctx.createBufferSource();
    source.buffer = this.getPinkNoiseBuffer(ctx);
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 340;
    bandpass.Q.value = 2.4;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.14;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;

    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(bandpass);
    bandpass.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    source.start();
    lfo.start();
    this.nodes.windSource = source;
    this.nodes.windLfo = lfo;
    this.nodes.windGain = gain;
    return gain;
  }

  private ensureBinauralGraph(ctx: AudioContext): GainNode {
    if (this.nodes.binauralGain && this.nodes.binauralLeft) {
      return this.nodes.binauralGain;
    }

    // 40Hz Gamma focus beat (100Hz Left / 140Hz Right)
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = 100;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = 140;

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -0.85;

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 0.85;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    leftOsc.connect(leftPan);
    rightOsc.connect(rightPan);
    leftPan.connect(gain);
    rightPan.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    leftOsc.start();
    rightOsc.start();
    this.nodes.binauralLeft = leftOsc;
    this.nodes.binauralRight = rightOsc;
    this.nodes.binauralGain = gain;
    return gain;
  }

  public syncSettings(settings: AudioSettings): void {
    this.lastSettings = settings;
    const anyAmbientActive =
      !settings.muted &&
      (settings.rainVolume > 0 ||
        settings.windVolume > 0 ||
        settings.binauralVolume > 0);

    if (!this.ctx && !anyAmbientActive) {
      return;
    }

    this.applyAmbientVolumes();
  }

  private applyAmbientVolumes(): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const settings = this.lastSettings;
    this.masterGain.gain.setTargetAtTime(settings.muted ? 0 : 1, now, 0.04);

    if (settings.rainVolume > 0 || this.nodes.rainGain) {
      const rainGain = this.ensureRainGraph(ctx);
      rainGain.gain.setTargetAtTime(
        settings.muted ? 0 : settings.rainVolume * 0.42,
        now,
        0.08,
      );
    }

    if (settings.windVolume > 0 || this.nodes.windGain) {
      const windGain = this.ensureWindGraph(ctx);
      windGain.gain.setTargetAtTime(
        settings.muted ? 0 : settings.windVolume * 0.48,
        now,
        0.08,
      );
    }

    if (settings.binauralVolume > 0 || this.nodes.binauralGain) {
      const binauralGain = this.ensureBinauralGraph(ctx);
      binauralGain.gain.setTargetAtTime(
        settings.muted ? 0 : settings.binauralVolume * 0.14,
        now,
        0.1,
      );
    }
  }

  private async tryPlayHtml5Audio(kind: SfxKind): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const src = SFX_PATHS[kind];
    if (this.unavailableFiles.has(src)) {
      return false;
    }

    try {
      const audio = new Audio(src);
      audio.volume = Math.min(1, Math.max(0, this.lastSettings.sfxVolume));
      await audio.play();
      return true;
    } catch {
      this.unavailableFiles.add(src);
      return false;
    }
  }

  public async playSharinganActivate(): Promise<void> {
    if (this.lastSettings.muted || this.lastSettings.sfxVolume <= 0) return;

    const playedMp3 = await this.tryPlayHtml5Audio('activate');
    if (playedMp3) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const vol = this.lastSettings.sfxVolume * 0.28;

    // Resonant Sharingan eye-spin sweep (sawtooth + sub sine + filtered whoosh)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.55);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(52, now + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(1900, now + 0.18);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.58);
    filter.Q.value = 3.2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(vol, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc.connect(filter);
    sub.connect(env);
    filter.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.68);
    sub.stop(now + 0.68);
  }

  public async playTsukuyomiComplete(): Promise<void> {
    if (this.lastSettings.muted || this.lastSettings.sfxVolume <= 0) return;

    const playedMp3 = await this.tryPlayHtml5Audio('complete');
    if (playedMp3) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const vol = this.lastSettings.sfxVolume * 0.24;
    const partials = [110, 220, 329.63, 440];

    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.992, now + 2.2);

      const env = ctx.createGain();
      const partialGain = vol / (idx + 1);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(partialGain, now + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(env);
      env.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 2.45);
    });
  }
}

export const audioEngine = new TsukuyomiAudioEngine();
