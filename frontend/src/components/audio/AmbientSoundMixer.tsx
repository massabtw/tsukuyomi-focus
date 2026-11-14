'use client';

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

export function AmbientSoundMixer({ compact = false }: AmbientSoundMixerProps) {
  const audio = useAudioSettings();
  const updateAudioSettings = useTsukuyomiStore(
    (state) => state.updateAudioSettings,
  );

  function handlePatch(patch: Partial<AudioSettings>) {
    void audioEngine.unlock();
    updateAudioSettings(patch);
  }

  function handleToggleSfx() {
    void audioEngine.unlock();
    const nextVolume = audio.sfxVolume > 0 ? 0 : 0.7;
    updateAudioSettings({ sfxVolume: nextVolume });
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

  const sfxEnabled = audio.sfxVolume > 0;

  return (
    <section
      aria-label="Ambiente Sonoro do Tsukuyomi"
      className={cn(
        'obsidian-surface w-full rounded-xl',
        compact ? 'p-3.5 sm:p-4' : 'p-5',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
            Ambiente Sonoro
          </h3>
          {!compact && (
            <p className="mt-0.5 text-xs text-zinc-500">
              Áudio sintetizado continuamente fora do ciclo das abas.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSfx}
            aria-pressed={sfxEnabled}
            aria-label={
              sfxEnabled
                ? 'Desativar efeitos sonoros Sharingan'
                : 'Ativar efeitos sonoros Sharingan'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
              sfxEnabled && !audio.muted
                ? 'border-red-600/50 bg-red-950/30 text-red-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
            )}
          >
            <Bell className="h-3 w-3" aria-hidden="true" />
            <span>SFX {sfxEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestSfx}
            aria-label="Testar som de ativação do Sharingan"
            className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            Testar
          </button>

          <button
            type="button"
            onClick={() => handlePatch({ muted: !audio.muted })}
            aria-pressed={audio.muted}
            aria-label={
              audio.muted ? 'Reativar todo o áudio' : 'Silenciar todo o áudio'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
              audio.muted
                ? 'border-red-500/60 bg-red-950/50 text-red-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700',
            )}
          >
            {audio.muted ? (
              <VolumeX className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            )}
            <span>{audio.muted ? 'Mudo' : 'Ativo'}</span>
          </button>
        </div>
      </div>

      {/* Ambient Channel Sliders */}
      <div
        className={cn(
          'mt-3 grid gap-3',
          compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1',
        )}
      >
        {AMBIENT_CHANNELS.map(
          ({ key, label, shortLabel, description, Icon }) => {
            const value = audio[key];
            const percent = Math.round(value * 100);
            const active = !audio.muted && value > 0;

            return (
              <div
                key={key}
                className="flex flex-col gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`audio-${key}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-200"
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        active ? 'text-red-400' : 'text-zinc-500',
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {compact ? shortLabel : label}
                    </span>
                  </label>
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    {percent}%
                  </span>
                </div>

                {!compact && (
                  <p className="text-[11px] text-zinc-500">{description}</p>
                )}

                <input
                  id={`audio-${key}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={value}
                  aria-label={`Volume de ${label}`}
                  onChange={(e) =>
                    handlePatch({ [key]: Number(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
                />
              </div>
            );
          },
        )}
      </div>

      {/* SFX Volume Slider in Full View */}
      {!compact && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="audio-sfxVolume"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-200"
            >
              <Bell className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span>Volume dos Efeitos (Sharingan / Gongo)</span>
            </label>
            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
              {Math.round(audio.sfxVolume * 100)}%
            </span>
          </div>
          <input
            id="audio-sfxVolume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.sfxVolume}
            aria-label="Volume dos efeitos sonoros"
            onChange={(e) =>
              handlePatch({ sfxVolume: Number(e.target.value) })
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
          />
        </div>
      )}
    </section>
  );
}
