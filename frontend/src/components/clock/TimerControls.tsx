'use client';

import {
  Eye,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  RANK_DEFINITIONS,
  SUSANOO_MIN_RECOMMENDED_MINUTES,
  TIMER_PRESETS_MINUTES,
} from '@/constants/ranks';
import { cn } from '@/lib/cn';
import { canInvokeIzanagi } from '@/lib/gamification';
import {
  useTimerCore,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

export interface TimerControlsProps {
  onOpenSusanooBreak: () => void;
  onOpenIzanagiAbandon: () => void;
}

export function TimerControls({
  onOpenSusanooBreak,
  onOpenIzanagiAbandon,
}: TimerControlsProps) {
  const { status, mode, durationSeconds, activeMissionId, susanooEnabled } =
    useTimerCore();
  const izanagi = useTsukuyomiStore((state) => state.izanagi);
  const activeMission = useTsukuyomiStore(
    (state) =>
      state.missions.find((m) => m.id === activeMissionId) ?? null,
  );

  const setTimerMode = useTsukuyomiStore((state) => state.setTimerMode);
  const setSusanooEnabled = useTsukuyomiStore(
    (state) => state.setSusanooEnabled,
  );
  const startTimer = useTsukuyomiStore((state) => state.startTimer);
  const pauseTimer = useTsukuyomiStore((state) => state.pauseTimer);
  const resetTimer = useTsukuyomiStore((state) => state.resetTimer);
  const abandonActiveCycle = useTsukuyomiStore(
    (state) => state.abandonActiveCycle,
  );

  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isFocus = mode === 'focus';
  const durationMinutes = Math.round(durationSeconds / 60);
  const susanooRecommended = durationMinutes >= SUSANOO_MIN_RECOMMENDED_MINUTES;
  const isSusanooSealed = !isIdle && isFocus && susanooEnabled;
  const izanagiAvailable = canInvokeIzanagi(izanagi);

  const missionMinutes = activeMission
    ? activeMission.estimatedMinutes
    : null;
  const missionRankDef = activeMission
    ? RANK_DEFINITIONS[activeMission.rank]
    : null;

  return (
    <div className="obsidian-surface w-full rounded-xl p-4 sm:p-5">
      {/* Presets Row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
            Ritual de Tempo
          </span>
          {!isIdle && (
            <span className="text-[11px] text-zinc-500">
              Presets bloqueados durante ciclo ativo
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Focus Presets */}
          {TIMER_PRESETS_MINUTES.focus.map((minutes) => {
            const active = isFocus && durationMinutes === minutes;
            return (
              <button
                key={`focus-${minutes}`}
                type="button"
                disabled={!isIdle}
                onClick={() => setTimerMode('focus', minutes * 60)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors',
                  active
                    ? 'border-red-600/80 bg-red-950/50 text-zinc-50'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                {minutes}m
              </button>
            );
          })}

          {/* Mission Rank Auto Preset */}
          {activeMission && missionMinutes !== null && missionRankDef && (
            <button
              type="button"
              disabled={!isIdle}
              onClick={() => setTimerMode('focus', missionMinutes * 60)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors',
                isFocus && durationMinutes === missionMinutes
                  ? 'border-red-600/80 bg-red-950/50 text-zinc-50'
                  : 'border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700',
                !isIdle && 'cursor-not-allowed opacity-50',
              )}
              title={`Usar duração sugerida da missão (${missionRankDef.label})`}
            >
              <Sparkles className="h-3 w-3 text-red-400" aria-hidden="true" />
              <span>
                Rank {activeMission.rank} ({missionMinutes}m)
              </span>
            </button>
          )}

          <div
            className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block"
            aria-hidden="true"
          />

          {/* Short Break Presets */}
          {TIMER_PRESETS_MINUTES.shortBreak.map((minutes) => {
            const active =
              mode === 'short_break' && durationMinutes === minutes;
            return (
              <button
                key={`short-${minutes}`}
                type="button"
                disabled={!isIdle}
                onClick={() => setTimerMode('short_break', minutes * 60)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors',
                  active
                    ? 'border-red-600/70 bg-red-950/40 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                Pausa {minutes}m
              </button>
            );
          })}

          {/* Long Break Presets */}
          {TIMER_PRESETS_MINUTES.longBreak.map((minutes) => {
            const active = mode === 'long_break' && durationMinutes === minutes;
            return (
              <button
                key={`long-${minutes}`}
                type="button"
                disabled={!isIdle}
                onClick={() => setTimerMode('long_break', minutes * 60)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors',
                  active
                    ? 'border-red-600/70 bg-red-950/40 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                Longa {minutes}m
              </button>
            );
          })}
        </div>
      </div>

      {/* Susano'o Deep Work Shield Toggle */}
      {isFocus && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/90 border-t-white/[0.06] bg-zinc-950/70 px-3.5 py-2.5">
          <div className="flex items-start gap-2.5">
            <Shield
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                susanooEnabled ? 'text-red-400' : 'text-zinc-500',
              )}
              aria-hidden="true"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-100">
                  Armadura Susano&apos;o (+25% Chakra)
                </span>
                {susanooRecommended && (
                  <span className="rounded border border-red-500/30 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    Recomendado &ge; 50m
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Sela pausa e abandono normal até o fim do ciclo.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={susanooEnabled}
            aria-label="Ativar Armadura Susano'o"
            disabled={!isIdle}
            onClick={() => setSusanooEnabled(!susanooEnabled)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
              susanooEnabled
                ? 'border-red-500/70 bg-red-700/80'
                : 'border-zinc-700 bg-zinc-900',
              !isIdle && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-zinc-100 transition-transform',
                susanooEnabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      )}

      {/* Primary Action Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {isIdle && (
          <>
            <button
              type="button"
              onClick={startTimer}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-500"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>
                {isFocus ? 'Ativar Tsukuyomi' : 'Iniciar Repouso Ocular'}
              </span>
            </button>

            <button
              type="button"
              onClick={resetTimer}
              aria-label="Resetar cronômetro"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resetar</span>
            </button>
          </>
        )}

        {!isIdle && isSusanooSealed && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-black/70 px-3 py-2 text-xs text-red-300">
              <Lock className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span>Selo Susano&apos;o ativo — pausa bloqueada</span>
            </div>

            <button
              type="button"
              onClick={onOpenSusanooBreak}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-600/70 bg-black px-4 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-950/50 hover:text-red-300"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Quebrar Selo do Susano&apos;o</span>
            </button>
          </div>
        )}

        {!isIdle && !isSusanooSealed && (
          <>
            {isRunning ? (
              <button
                type="button"
                onClick={pauseTimer}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
              >
                <Pause className="h-4 w-4" aria-hidden="true" />
                <span>Pausar</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={startTimer}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Retomar</span>
              </button>
            ) : null}

            {!isFocus ? (
              <button
                type="button"
                onClick={() => abandonActiveCycle()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <span>Encerrar Pausa</span>
              </button>
            ) : (
              <>
                {izanagiAvailable && (
                  <button
                    type="button"
                    onClick={onOpenIzanagiAbandon}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/35 px-3.5 py-2.5 text-xs font-medium text-red-300 transition-colors hover:border-red-500/70 hover:bg-red-950/60"
                    title="Reescrever abandono sacrificando visão temporária em vez de perder acuidade"
                  >
                    <Eye className="h-4 w-4 text-red-400" aria-hidden="true" />
                    <span>Invocar Izanagi</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => abandonActiveCycle({ useIzanagi: false })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-900/70 hover:text-red-300"
                  title="Abandonar ciclo (+1 desgaste visual)"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Abandonar</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
