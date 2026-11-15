'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  CloudRain,
  Radio,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import {
  useAudioSettings,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { AudioSettings } from '@/types/tsukuyomi';

export interface AmbientSoundMixerProps {
  compact?: boolean;
}

type AmbientChannelKey = 'rainVolume' | 'windVolume' | 'binauralVolume';

const AMBIENT_CHANNELS: ReadonlyArray<{
  key: AmbientChannelKey;
  label: string;
  shortLabel: string;
  description: string;
  Icon: typeof CloudRain;
}> = [
  {
    key: 'rainVolume',
    label: 'Chuva em Amegakure',
    shortLabel: 'Chuva Amegakure',
    description: 'Ruído rosa filtrado de chuva contínua.',
    Icon: CloudRain,
  },
  {
    key: 'windVolume',
    label: 'Vento Noturno Uchiha',
    shortLabel: 'Vento Uchiha',
    description: 'Brisa noturna modulada pelo distrito.',
    Icon: Wind,
  },
  {
    key: 'binauralVolume',
    label: 'Drone Binaural 40Hz',
    shortLabel: 'Binaural 40Hz',
    description: 'Batimento gama estéreo (100Hz / 140Hz).',
    Icon: Radio,
  },
];

const SPECTRUM_BARS: ReadonlyArray<{
  keyframes: number[];
  duration: number;
  staticLevel: number;
}> = [
  { keyframes: [0.32, 0.96, 0.44, 0.82, 0.32], duration: 0.92, staticLevel: 0.55 },
  { keyframes: [0.88, 0.34, 1.0, 0.42, 0.88], duration: 1.14, staticLevel: 0.9 },
  { keyframes: [0.46, 0.9, 0.28, 0.96, 0.46], duration: 0.84, staticLevel: 0.7 },
  { keyframes: [0.74, 0.38, 0.88, 0.32, 0.74], duration: 1.04, staticLevel: 0.45 },
];

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

function getSliderTrackBackground(percent: number, active: boolean): string {
  const fill = active
    ? 'var(--chakra-primary, #DC2626)'
    : 'rgba(113, 113, 122, 0.65)';
  return `linear-gradient(to right, ${fill} 0%, ${fill} ${percent}%, rgba(39, 39, 42, 0.72) ${percent}%, rgba(39, 39, 42, 0.72) 100%)`;
}

export function AmbientSoundMixer({ compact = false }: AmbientSoundMixerProps) {
  const prefersReducedMotion = useReducedMotion();
  const instanceId = useId().replace(/:/g, '');
  const audio = useAudioSettings();
  const updateAudioSettings = useTsukuyomiStore(
    (state) => state.updateAudioSettings,
  );

  const isMounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const podRef = useRef<HTMLDivElement>(null);

  const isPopoverOpen = isHovered || isPinned;

  useEffect(() => {
    if (!compact || !isPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (podRef.current && !podRef.current.contains(event.target as Node)) {
        setIsPinned(false);
        setIsHovered(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPinned(false);
        setIsHovered(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [compact, isPopoverOpen]);

  function handlePatch(patch: Partial<AudioSettings>) {
    void audioEngine.unlock();
    updateAudioSettings(patch);
  }

  function handleToggleSfx() {
    void audioEngine.unlock();
    const nextVolume = audio.sfxVolume > 0 ? 0 : 0.7;
    updateAudioSettings({ sfxVolume: nextVolume });
    if (nextVolume > 0) {
      audioEngine.playClick();
    }
  }

  function handleTestSfx() {
    void audioEngine.unlock().then(() => {
      if (audio.muted) {
        updateAudioSettings({ muted: false });
      }
      if (audio.sfxVolume <= 0) {
        updateAudioSettings({ sfxVolume: 0.7 });
      }
      void audioEngine.playSharinganActivate();
    });
  }

  function handleToggleMute() {
    const willUnmute = audio.muted;
    handlePatch({ muted: !audio.muted });
    if (willUnmute) {
      audioEngine.playClick();
    }
  }

  const sfxEnabled = audio.sfxVolume > 0;
  const anyChannelActive =
    !audio.muted &&
    (audio.rainVolume > 0 || audio.windVolume > 0 || audio.binauralVolume > 0);
  const sfxPercent = Math.round(audio.sfxVolume * 100);

  const renderChannelSliders = (isCompactView: boolean) => (
    <div className="grid grid-cols-1 gap-2.5">
      {AMBIENT_CHANNELS.map(({ key, label, shortLabel, description, Icon }) => {
        const value = audio[key];
        const percent = Math.round(value * 100);
        const active = !audio.muted && value > 0;
        const inputId = `audio-${instanceId}-${key}`;

        return (
          <div
            key={key}
            className={cn(
              'flex flex-col gap-2 rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors duration-700',
              active
                ? 'border-[var(--chakra-primary,#DC2626)]/35 bg-black/55'
                : 'border-white/[0.06] bg-black/40 hover:border-white/20',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={inputId}
                className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-300 uppercase"
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-700',
                    !active && 'bg-zinc-700',
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--chakra-primary, #DC2626)',
                          boxShadow:
                            '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                        }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-colors duration-700',
                    !active && 'text-zinc-500',
                  )}
                  style={
                    active
                      ? { color: 'var(--chakra-primary, #DC2626)' }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span className="truncate">
                  {isCompactView ? shortLabel : label}
                </span>
              </label>
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                {percent}%
              </span>
            </div>

            {!isCompactView && (
              <p className="text-[11px] text-zinc-500">{description}</p>
            )}

            <input
              id={inputId}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={value}
              aria-label={`Volume de ${label}`}
              onMouseEnter={() => audioEngine.playHover()}
              onChange={(e) => handlePatch({ [key]: Number(e.target.value) })}
              style={{
                background: getSliderTrackBackground(percent, active),
              }}
              className="tactical-range w-full cursor-pointer"
            />
          </div>
        );
      })}
    </div>
  );

  const renderQuickActionButtons = () => (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onMouseEnter={() => audioEngine.playHover()}
        onClick={handleToggleSfx}
        aria-pressed={sfxEnabled}
        aria-label={
          sfxEnabled
            ? 'Desativar efeitos sonoros Sharingan'
            : 'Ativar efeitos sonoros Sharingan'
        }
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium tracking-[0.14em] uppercase transition-colors duration-700',
          sfxEnabled && !audio.muted
            ? 'border-[var(--chakra-primary,#DC2626)]/60 bg-white/[0.08] text-zinc-100 shadow-[0_0_12px_var(--chakra-glow,rgba(220,38,38,0.28))]'
            : 'border-white/10 bg-black/50 text-zinc-400 hover:border-white/25 hover:text-zinc-200',
        )}
      >
        <Bell className="h-3 w-3" aria-hidden="true" />
        <span>SFX {sfxEnabled ? 'ON' : 'OFF'}</span>
      </button>

      <button
        type="button"
        onMouseEnter={() => audioEngine.playHover()}
        onClick={handleTestSfx}
        aria-label="Testar som de ativação do Sharingan"
        className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-medium tracking-[0.14em] text-zinc-300 uppercase transition-colors hover:border-white/25 hover:text-white"
      >
        Testar
      </button>

      <button
        type="button"
        onMouseEnter={() => audioEngine.playHover()}
        onClick={handleToggleMute}
        aria-pressed={audio.muted}
        aria-label={
          audio.muted ? 'Reativar todo o áudio' : 'Silenciar todo o áudio'
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium tracking-[0.14em] uppercase transition-colors',
          audio.muted
            ? 'border-red-500/60 bg-red-950/50 text-red-300'
            : 'border-white/10 bg-black/50 text-zinc-200 hover:border-white/25',
        )}
      >
        {audio.muted ? (
          <VolumeX className="h-3 w-3 text-red-400" aria-hidden="true" />
        ) : (
          <Volume2
            className="h-3 w-3 transition-colors duration-700"
            style={{ color: 'var(--chakra-primary, #DC2626)' }}
            aria-hidden="true"
          />
        )}
        <span>{audio.muted ? 'Mudo' : 'Ativo'}</span>
      </button>
    </div>
  );

  if (compact) {
    if (!isMounted) {
      return null;
    }

    const popoverId = `ambient-audio-popover-${instanceId}`;

    const podNode = (
      <div
        ref={podRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-5 left-5 z-40"
      >
        <AnimatePresence>
          {isPopoverOpen && (
            <motion.section
              id={popoverId}
              key="ambient-audio-popover"
              aria-label="Ambiente Sonoro do Tsukuyomi"
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: 8, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 6, scale: 0.97 }
              }
              transition={{
                duration: 0.18,
                ease: [0.16, 1, 0.3, 1],
                type: 'tween',
              }}
              className="absolute bottom-[calc(100%+0.6rem)] left-0 w-[300px] rounded-2xl border border-white/10 bg-black/80 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:w-[340px]"
            >
              {/* Invisible hover bridge between capsule and floating popover */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-3 h-3"
              />

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors duration-700',
                      !(anyChannelActive || (!audio.muted && sfxEnabled)) &&
                        'bg-zinc-600',
                    )}
                    style={
                      anyChannelActive || (!audio.muted && sfxEnabled)
                        ? {
                            backgroundColor: 'var(--chakra-primary, #DC2626)',
                            boxShadow:
                              '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                          }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                  <h3 className="text-[10px] font-semibold tracking-[0.2em] text-zinc-200 uppercase">
                    Ambiente Sonoro
                  </h3>
                </div>
                {renderQuickActionButtons()}
              </div>

              {renderChannelSliders(true)}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Compact Floating Capsule */}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-full border border-white/10 bg-black/65 px-3.5 py-2 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-colors duration-700',
            isPopoverOpen && 'border-white/25',
          )}
        >
          <button
            type="button"
            aria-expanded={isPopoverOpen}
            aria-controls={popoverId}
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => {
              audioEngine.playClick();
              if (isPinned) {
                setIsPinned(false);
                setIsHovered(false);
              } else {
                setIsPinned(true);
              }
            }}
            className="flex cursor-pointer items-center gap-2.5 text-left focus:outline-none"
          >
            {/* 4 Animated Spectrum Bars */}
            <span
              aria-hidden="true"
              className="flex h-3.5 items-end gap-[2.5px]"
            >
              {SPECTRUM_BARS.map((bar, idx) => (
                <motion.span
                  key={idx}
                  className="h-full w-[2.5px] origin-bottom rounded-full transition-colors duration-700"
                  style={{
                    backgroundColor: anyChannelActive
                      ? 'var(--chakra-primary, #DC2626)'
                      : 'rgba(161, 161, 170, 0.45)',
                    boxShadow: anyChannelActive
                      ? '0 0 6px var(--chakra-glow, rgba(220, 38, 38, 0.42))'
                      : 'none',
                  }}
                  animate={
                    anyChannelActive
                      ? prefersReducedMotion
                        ? { scaleY: bar.staticLevel }
                        : { scaleY: bar.keyframes }
                      : { scaleY: 0.25 }
                  }
                  transition={
                    anyChannelActive && !prefersReducedMotion
                      ? {
                          type: 'tween',
                          duration: bar.duration,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : { duration: 0.2 }
                  }
                />
              ))}
            </span>

            <span className="text-xs font-medium whitespace-nowrap text-zinc-200">
              Ambiente Sonoro
            </span>
          </button>

          <span className="h-3.5 w-px bg-white/10" aria-hidden="true" />

          <button
            type="button"
            onMouseEnter={() => audioEngine.playHover()}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMute();
            }}
            aria-pressed={audio.muted}
            aria-label={
              audio.muted ? 'Reativar todo o áudio' : 'Silenciar todo o áudio'
            }
            title={audio.muted ? 'Reativar áudio' : 'Silenciar áudio'}
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
              audio.muted
                ? 'border-red-500/50 bg-red-950/50 text-red-400'
                : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/25 hover:text-white',
            )}
          >
            {audio.muted ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2
                className="h-3.5 w-3.5 transition-colors duration-700"
                style={
                  anyChannelActive
                    ? { color: 'var(--chakra-primary, #DC2626)' }
                    : undefined
                }
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>
    );

    return createPortal(podNode, document.body);
  }

  return (
    <section
      aria-label="Ambiente Sonoro do Tsukuyomi"
      className="obsidian-surface w-full rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors duration-700',
                !(anyChannelActive || (!audio.muted && sfxEnabled)) &&
                  'bg-zinc-600',
              )}
              style={
                anyChannelActive || (!audio.muted && sfxEnabled)
                  ? {
                      backgroundColor: 'var(--chakra-primary, #DC2626)',
                      boxShadow:
                        '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                    }
                  : undefined
              }
              aria-hidden="true"
            />
            <h3 className="text-[10px] font-medium tracking-[0.22em] text-zinc-400 uppercase">
              Ambiente Sonoro
            </h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Áudio sintetizado continuamente fora do ciclo das abas.
          </p>
        </div>

        {renderQuickActionButtons()}
      </div>

      {/* Ambient Channel Sliders */}
      <div className="mt-3">{renderChannelSliders(false)}</div>

      {/* SFX Volume Slider in Full View */}
      <div
        className={cn(
          'mt-3 flex flex-col gap-2 rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors duration-700',
          sfxEnabled && !audio.muted
            ? 'border-[var(--chakra-primary,#DC2626)]/35 bg-black/55'
            : 'border-white/[0.06] bg-black/40 hover:border-white/20',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`audio-${instanceId}-sfxVolume`}
            className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-300 uppercase"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-700',
                !(sfxEnabled && !audio.muted) && 'bg-zinc-700',
              )}
              style={
                sfxEnabled && !audio.muted
                  ? {
                      backgroundColor: 'var(--chakra-primary, #DC2626)',
                      boxShadow:
                        '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                    }
                  : undefined
              }
              aria-hidden="true"
            />
            <Bell
              className="h-3.5 w-3.5 transition-colors duration-700"
              style={{ color: 'var(--chakra-primary, #DC2626)' }}
              aria-hidden="true"
            />
            <span>Volume dos Efeitos (Sharingan / Gongo)</span>
          </label>
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
            {sfxPercent}%
          </span>
        </div>
        <input
          id={`audio-${instanceId}-sfxVolume`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={audio.sfxVolume}
          aria-label="Volume dos efeitos sonoros"
          onMouseEnter={() => audioEngine.playHover()}
          onChange={(e) => handlePatch({ sfxVolume: Number(e.target.value) })}
          style={{
            background: getSliderTrackBackground(
              sfxPercent,
              sfxEnabled && !audio.muted,
            ),
          }}
          className="tactical-range w-full cursor-pointer"
        />
      </div>
    </section>
  );
}
