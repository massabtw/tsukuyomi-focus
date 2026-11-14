import type { AudioSettings } from '@/types/tsukuyomi';

export type StudioSoundId =
  | 'rain-amegakure'
  | 'wind-uchiha'
  | 'binaural-genjutsu'
  | 'sharingan-activate'
  | 'mangekyou-awaken'
  | 'tsukuyomi-cast'
  | 'susanoo-summon'
  | 'amaterasu-ignite'
  | 'izanagi-rewind'
  | 'mission-complete'
  | 'ui-hover-chakra'
  | 'ui-click-seal';

type AmbientChannelKey = 'rain' | 'wind' | 'binaural';

const STUDIO_SFX_PRELOAD_ORDER: readonly StudioSoundId[] = [
  'ui-hover-chakra',
  'ui-click-seal',
  'sharingan-activate',
  'tsukuyomi-cast',
  'mangekyou-awaken',
  'susanoo-summon',
  'amaterasu-ignite',
  'izanagi-rewind',
  'mission-complete',
  'rain-amegakure',
  'wind-uchiha',
  'binaural-genjutsu',
];

function getAudioUrl(id: StudioSoundId): string {
  return `/audio/${id}.wav`;
}

interface AmbientChannelState {
  soundId: StudioSoundId;
  volumeGainScale: number;
  channelGain: GainNode | null;
  wavGain: GainNode | null;
  wavSource: AudioBufferSourceNode | null;
  procGain: GainNode | null;
  procStopper: (() => void) | null;
  loadingStarted: boolean;
}

/**
 * Global Web Audio API singleton prioritizing studio 16-bit 44.1kHz WAV assets
 * with AudioBuffer caching, HTMLAudioElement instant fallback, and procedural
 * Web Audio synthesis fallback while buffers load.
 */
class TsukuyomiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private bufferCache = new Map<StudioSoundId, AudioBuffer>();
  private loadingPromises = new Map<StudioSoundId, Promise<AudioBuffer | null>>();
  private failedLoads = new Set<StudioSoundId>();
  private preloadStarted = false;
  private lastHoverTimeMs = 0;

  private lastSettings: AudioSettings = {
    muted: false,
    sfxVolume: 0.7,
    rainVolume: 0,
    windVolume: 0,
    binauralVolume: 0,
  };

  private channels: Record<AmbientChannelKey, AmbientChannelState> = {
    rain: {
      soundId: 'rain-amegakure',
      volumeGainScale: 0.62,
      channelGain: null,
      wavGain: null,
      wavSource: null,
      procGain: null,
      procStopper: null,
      loadingStarted: false,
    },
    wind: {
      soundId: 'wind-uchiha',
      volumeGainScale: 0.62,
      channelGain: null,
      wavGain: null,
      wavSource: null,
      procGain: null,
      procStopper: null,
      loadingStarted: false,
    },
    binaural: {
      soundId: 'binaural-genjutsu',
      volumeGainScale: 0.42,
      channelGain: null,
      wavGain: null,
      wavSource: null,
      procGain: null,
      procStopper: null,
      loadingStarted: false,
    },
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
    if (typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore if browser rejects before gesture
      }
    }

    this.preloadAllAssets();
    this.applyAmbientVolumes();
  }

  private preloadAllAssets(): void {
    if (this.preloadStarted || typeof window === 'undefined') return;
    this.preloadStarted = true;
    for (const id of STUDIO_SFX_PRELOAD_ORDER) {
      void this.loadBuffer(id);
    }
  }

  private async loadBuffer(id: StudioSoundId): Promise<AudioBuffer | null> {
    if (typeof window === 'undefined') return null;

    const cached = this.bufferCache.get(id);
    if (cached) return cached;
    if (this.failedLoads.has(id)) return null;

    const inFlight = this.loadingPromises.get(id);
    if (inFlight) return inFlight;

    const ctx = this.ensureContext();
    if (!ctx || typeof fetch !== 'function') return null;

    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        const res = await fetch(getAudioUrl(id));
        if (!res.ok) {
          this.failedLoads.add(id);
          return null;
        }
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(id, decoded);
        return decoded;
      } catch {
        this.failedLoads.add(id);
        return null;
      } finally {
        this.loadingPromises.delete(id);
      }
    })();

    this.loadingPromises.set(id, promise);
    return promise;
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }

    const durationSeconds = 4;
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

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

  private startProceduralFallback(
    key: AmbientChannelKey,
    ctx: AudioContext,
    dest: AudioNode,
  ): () => void {
    if (key === 'rain') {
      const source = ctx.createBufferSource();
      source.buffer = this.getPinkNoiseBuffer(ctx);
      source.loop = true;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 320;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2600;

      const scale = ctx.createGain();
      scale.gain.value = 0.68;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(scale);
      scale.connect(dest);
      source.start();

      return () => {
        try {
          source.stop();
        } catch {
          // Ignore already stopped
        }
        source.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        scale.disconnect();
      };
    }

    if (key === 'wind') {
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

      const scale = ctx.createGain();
      scale.gain.value = 0.78;

      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      source.connect(bandpass);
      bandpass.connect(scale);
      scale.connect(dest);

      source.start();
      lfo.start();

      return () => {
        try {
          source.stop();
          lfo.stop();
        } catch {
          // Ignore already stopped
        }
        source.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
        bandpass.disconnect();
        scale.disconnect();
      };
    }

    // Binaural 40Hz Gamma focus beat (100Hz Left / 140Hz Right)
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

    const scale = ctx.createGain();
    scale.gain.value = 0.32;

    leftOsc.connect(leftPan);
    rightOsc.connect(rightPan);
    leftPan.connect(scale);
    rightPan.connect(scale);
    scale.connect(dest);

    leftOsc.start();
    rightOsc.start();

    return () => {
      try {
        leftOsc.stop();
        rightOsc.stop();
      } catch {
        // Ignore already stopped
      }
      leftOsc.disconnect();
      rightOsc.disconnect();
      leftPan.disconnect();
      rightPan.disconnect();
      scale.disconnect();
    };
  }

  private attachWavBufferToChannel(
    key: AmbientChannelKey,
    ctx: AudioContext,
    buffer: AudioBuffer,
  ): void {
    const channel = this.channels[key];
    if (this.ctx !== ctx || !channel.channelGain || channel.wavSource) {
      return;
    }

    const now = ctx.currentTime;
    const hasProcedural = Boolean(channel.procGain && channel.procStopper);

    const wavGain = ctx.createGain();
    wavGain.gain.setValueAtTime(hasProcedural ? 0.0001 : 1, now);
    wavGain.connect(channel.channelGain);

    const wavSource = ctx.createBufferSource();
    wavSource.buffer = buffer;
    wavSource.loop = true;
    wavSource.connect(wavGain);
    wavSource.start(now);

    channel.wavGain = wavGain;
    channel.wavSource = wavSource;

    if (hasProcedural && channel.procGain) {
      wavGain.gain.setTargetAtTime(1, now, 0.12);
      channel.procGain.gain.setTargetAtTime(0, now, 0.12);

      const stopProcedural = channel.procStopper;
      const procGainNode = channel.procGain;
      channel.procStopper = null;
      channel.procGain = null;

      window.setTimeout(() => {
        stopProcedural?.();
        procGainNode.disconnect();
      }, 650);
    }
  }

  private ensureAmbientChannel(
    key: AmbientChannelKey,
    ctx: AudioContext,
    rawVolume: number,
  ): GainNode {
    const channel = this.channels[key];
    if (!channel.channelGain && this.masterGain) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterGain);
      channel.channelGain = gain;
    }

    if (rawVolume > 0 && !channel.wavSource) {
      const decoded = this.bufferCache.get(channel.soundId);
      if (decoded) {
        this.attachWavBufferToChannel(key, ctx, decoded);
      } else {
        if (!channel.procStopper && channel.channelGain) {
          const procGain = ctx.createGain();
          procGain.gain.value = 1;
          procGain.connect(channel.channelGain);
          channel.procGain = procGain;
          channel.procStopper = this.startProceduralFallback(key, ctx, procGain);
        }

        if (!channel.loadingStarted) {
          channel.loadingStarted = true;
          void this.loadBuffer(channel.soundId).then((loaded) => {
            if (loaded) {
              this.attachWavBufferToChannel(key, ctx, loaded);
            }
          });
        }
      }
    }

    return channel.channelGain!;
  }

  public syncSettings(settings: AudioSettings): void {
    this.lastSettings = settings;
    if (typeof window === 'undefined') return;

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

    const volumeMap: Record<AmbientChannelKey, number> = {
      rain: settings.rainVolume,
      wind: settings.windVolume,
      binaural: settings.binauralVolume,
    };

    (Object.keys(volumeMap) as AmbientChannelKey[]).forEach((key) => {
      const rawVolume = volumeMap[key];
      const channel = this.channels[key];
      if (rawVolume > 0 || channel.channelGain) {
        const gainNode = this.ensureAmbientChannel(key, ctx, rawVolume);
        const target = settings.muted ? 0 : rawVolume * channel.volumeGainScale;
        gainNode.gain.setTargetAtTime(target, now, 0.08);
      }
    });
  }

  private async tryPlayHtml5Audio(
    id: StudioSoundId,
    effectiveVolume: number,
  ): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return false;
    }
    if (this.failedLoads.has(id)) {
      return false;
    }

    try {
      const audio = new Audio(getAudioUrl(id));
      audio.volume = Math.min(1, Math.max(0, effectiveVolume));
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  private playProceduralSfx(
    ctx: AudioContext,
    dest: AudioNode,
    id: StudioSoundId,
    effectiveVolume: number,
  ): void {
    const now = ctx.currentTime;

    if (id === 'mission-complete') {
      const vol = effectiveVolume * 0.24;
      const partials = [146.83, 155.56, 196.0, 220.0, 293.66];
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.994, now + 1.7);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(vol / (idx + 1), now + 0.03);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(env);
        env.connect(dest);
        osc.start(now);
        osc.stop(now + 1.85);
      });
      return;
    }

    if (id === 'ui-hover-chakra' || id === 'ui-click-seal') {
      const isClick = id === 'ui-click-seal';
      const dur = isClick ? 0.11 : 0.065;
      const osc = ctx.createOscillator();
      osc.type = isClick ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isClick ? 360 : 720, now);
      osc.frequency.exponentialRampToValueAtTime(isClick ? 140 : 880, now + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(effectiveVolume * 0.28, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(env);
      env.connect(dest);
      osc.start(now);
      osc.stop(now + dur + 0.01);
      return;
    }

    // Resonant Sharingan / Tsukuyomi / Susanoo / Amaterasu / Izanagi fallback sweep
    const vol = effectiveVolume * 0.28;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(id === 'tsukuyomi-cast' ? 88 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.62);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(100, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.65);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(1850, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.62);
    filter.Q.value = 3.0;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(vol, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(filter);
    sub.connect(env);
    filter.connect(env);
    env.connect(dest);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.72);
    sub.stop(now + 0.72);
  }

  public async play(id: StudioSoundId, volumeScale = 1): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.lastSettings.muted || this.lastSettings.sfxVolume <= 0) return;

    const effectiveVolume = Math.min(
      1,
      Math.max(0, this.lastSettings.sfxVolume * volumeScale),
    );
    if (effectiveVolume <= 0) return;

    const ctx = this.ensureContext();
    const cached = this.bufferCache.get(id);

    if (ctx && cached && this.masterGain) {
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Fall through if resume fails
        }
      }

      if (ctx.state === 'running') {
        const source = ctx.createBufferSource();
        source.buffer = cached;

        const gain = ctx.createGain();
        gain.gain.value = effectiveVolume;

        source.connect(gain);
        gain.connect(this.masterGain);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
        return;
      }
    }

    if (ctx && !cached) {
      void this.loadBuffer(id);
    }

    const playedWav = await this.tryPlayHtml5Audio(id, effectiveVolume);
    if (playedWav) return;

    if (ctx && this.masterGain) {
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          return;
        }
      }
      if (ctx.state === 'running') {
        this.playProceduralSfx(ctx, this.masterGain, id, effectiveVolume);
      }
    }
  }

  public playHover(): void {
    if (typeof window === 'undefined') return;
    if (this.lastSettings.muted || this.lastSettings.sfxVolume <= 0) return;

    const nowMs = Date.now();
    if (nowMs - this.lastHoverTimeMs < 45) return;
    this.lastHoverTimeMs = nowMs;

    if (!this.ctx || this.ctx.state !== 'running') {
      return;
    }

    void this.play('ui-hover-chakra', 0.25);
  }

  public playClick(): void {
    if (typeof window === 'undefined') return;
    if (this.lastSettings.muted || this.lastSettings.sfxVolume <= 0) return;

    void this.unlock();
    void this.play('ui-click-seal', 0.45);
  }

  public async playSharinganActivate(): Promise<void> {
    return this.play('sharingan-activate');
  }

  public async playTsukuyomiComplete(): Promise<void> {
    return this.play('mission-complete');
  }
}

export const audioEngine = new TsukuyomiAudioEngine();
