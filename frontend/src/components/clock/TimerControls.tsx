'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
import { audioEngine } from '@/lib/audioEngine';
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

const CONTROL_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 26,
} as const;

const KATANA_BUTTON_VARIANTS = {
  rest: { y: 0 },
  hover: { y: -1, transition: CONTROL_SPRING },
};

const KATANA_BEAM_VARIANTS = {
  rest: { left: '-16%', opacity: 0 },
  hover: {
    left: ['-16%', '116%'],
    opacity: [0, 1, 0],
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1] as const,
      type: 'tween' as const,
    },
  },
};

const KATANA_SPLIT_VARIANTS = {
  rest: { x: 0, y: 0 },
  hover: {
    x: [0, 2.5, 0],
    y: [0, -0.5, 0],
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1] as const,
      type: 'tween' as const,
    },
  },
};

function KatanaSlashOverlay({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <motion.span
      aria-hidden="true"
      variants={KATANA_BEAM_VARIANTS}
      style={{ rotate: '35deg' }}
      className="pointer-events-none absolute -top-1/2 h-[220%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_rgba(239,68,68,0.75)]"
    />
  );
}

export function TimerControls({
  onOpenSusanooBreak,
  onOpenIzanagiAbandon,
}: TimerControlsProps) {
  const prefersReducedMotion = useReducedMotion();
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

  const activeMotionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { y: -1 },
        whileTap: { scale: 0.97 },
        transition: CONTROL_SPRING,
      };

  const idleOnlyMotionProps =
    isIdle && !prefersReducedMotion
      ? {
          whileHover: { y: -1 },
          whileTap: { scale: 0.97 },
          transition: CONTROL_SPRING,
        }
      : {};

  return (
    <div
      role="region"
      aria-label="Controles do Tsukuyomi"
      className="flex w-full flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/65 px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_32px_var(--chakra-glow,rgba(220,38,38,0.18))] backdrop-blur-2xl transition-colors duration-700 lg:flex-row"
    >
      {/* Left: Presets Segmented Track + Break Pills + Active Mission Suggestion */}
      <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
        {/* Focus Presets Track */}
        <div
          role="group"
          aria-label="Duração de foco"
          className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/60 p-1"
        >
          {TIMER_PRESETS_MINUTES.focus.map((minutes) => {
            const active = isFocus && durationMinutes === minutes;
            return (
              <motion.button
                key={`focus-${minutes}`}
                type="button"
                disabled={!isIdle}
                {...idleOnlyMotionProps}
                onMouseEnter={() => {
                  if (isIdle) audioEngine.playHover();
                }}
                onClick={() => {
                  audioEngine.playClick();
                  setTimerMode('focus', minutes * 60);
                }}
                className={cn(
                  'rounded-lg border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors duration-700 will-change-transform',
                  active
                    ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.08] text-white shadow-[0_0_14px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                {minutes}m
              </motion.button>
            );
          })}
        </div>

        {/* Break Presets Track */}
        <div
          role="group"
          aria-label="Duração de pausa"
          className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/60 p-1"
        >
          <span className="px-1.5 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
            Pausa
          </span>
          {TIMER_PRESETS_MINUTES.shortBreak.map((minutes) => {
            const active =
              mode === 'short_break' && durationMinutes === minutes;
            return (
              <motion.button
                key={`short-${minutes}`}
                type="button"
                disabled={!isIdle}
                title={`Pausa curta de ${minutes} minutos`}
                aria-label={`Pausa curta ${minutes}m`}
                {...idleOnlyMotionProps}
                onMouseEnter={() => {
                  if (isIdle) audioEngine.playHover();
                }}
                onClick={() => {
                  audioEngine.playClick();
                  setTimerMode('short_break', minutes * 60);
                }}
                className={cn(
                  'rounded-lg border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors duration-700 will-change-transform',
                  active
                    ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.08] text-white shadow-[0_0_14px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                {minutes}m
              </motion.button>
            );
          })}
          {TIMER_PRESETS_MINUTES.longBreak.map((minutes) => {
            const active = mode === 'long_break' && durationMinutes === minutes;
            return (
              <motion.button
                key={`long-${minutes}`}
                type="button"
                disabled={!isIdle}
                title={`Pausa longa de ${minutes} minutos`}
                aria-label={`Pausa longa ${minutes}m`}
                {...idleOnlyMotionProps}
                onMouseEnter={() => {
                  if (isIdle) audioEngine.playHover();
                }}
                onClick={() => {
                  audioEngine.playClick();
                  setTimerMode('long_break', minutes * 60);
                }}
                className={cn(
                  'rounded-lg border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors duration-700 will-change-transform',
                  active
                    ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.08] text-white shadow-[0_0_14px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
                  !isIdle && 'cursor-not-allowed opacity-50',
                )}
              >
                {minutes}m
              </motion.button>
            );
          })}
        </div>

        {/* Active Mission Suggestion Chip */}
        {activeMission && missionMinutes !== null && missionRankDef && (
          <motion.button
            type="button"
            disabled={!isIdle}
            {...idleOnlyMotionProps}
            onMouseEnter={() => {
              if (isIdle) audioEngine.playHover();
            }}
            onClick={() => {
              audioEngine.playClick();
              setTimerMode('focus', missionMinutes * 60);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-[11px] tabular-nums transition-colors duration-700 will-change-transform',
              isFocus && durationMinutes === missionMinutes
                ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.08] text-white shadow-[0_0_14px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                : 'border-white/10 bg-black/60 text-zinc-300 hover:border-white/25 hover:text-white',
              !isIdle && 'cursor-not-allowed opacity-50',
            )}
            title={`Usar duração sugerida da missão (${missionRankDef.label})`}
          >
            <Sparkles
              className="h-3 w-3 shrink-0 transition-colors duration-700"
              style={{ color: 'var(--chakra-primary, #DC2626)' }}
              aria-hidden="true"
            />
            <span>
              Rank {activeMission.rank} · {missionMinutes}m
            </span>
          </motion.button>
        )}
      </div>

      {/* Center: Compact Armadura Susano'o Toggle */}
      {isFocus && (
        <motion.button
          type="button"
          role="switch"
          aria-checked={susanooEnabled}
          aria-label="Ativar Armadura Susano'o"
          title={
            susanooRecommended
              ? "Armadura Susano'o (+25% Chakra · Recomendado >= 50m)"
              : "Armadura Susano'o (+25% Chakra · Sela pausa e abandono normal até o fim do ciclo)"
          }
          disabled={!isIdle}
          {...idleOnlyMotionProps}
          onMouseEnter={() => {
            if (isIdle) audioEngine.playHover();
          }}
          onClick={() => {
            audioEngine.playClick();
            setSusanooEnabled(!susanooEnabled);
          }}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-700 will-change-transform',
            susanooEnabled
              ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.08] text-white shadow-[0_0_16px_var(--chakra-glow,rgba(220,38,38,0.42))]'
              : 'border-white/10 bg-black/60 text-zinc-300 hover:border-white/25 hover:text-white',
            !isIdle && 'cursor-not-allowed opacity-60',
          )}
        >
          <Shield
            className="h-3.5 w-3.5 shrink-0 transition-colors duration-700"
            style={{
              color: susanooEnabled
                ? 'var(--chakra-primary, #DC2626)'
                : '#71717A',
            }}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">Armadura Susano&apos;o</span>
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums transition-colors duration-700',
              susanooEnabled
                ? 'border-[var(--chakra-primary,#DC2626)] bg-black/50 text-white'
                : 'border-white/10 bg-black/40 text-zinc-400',
            )}
          >
            +25%
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors duration-700',
              susanooEnabled
                ? 'border-white/30'
                : 'border-white/15 bg-zinc-900',
            )}
            style={
              susanooEnabled
                ? { backgroundColor: 'var(--chakra-primary, #DC2626)' }
                : undefined
            }
          >
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-200',
                susanooEnabled ? 'translate-x-3.5' : 'translate-x-0.5',
              )}
            />
          </span>
        </motion.button>
      )}

      {/* Right: Primary & Active Cycle Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
        {isIdle && (
          <>
            <motion.button
              type="button"
              variants={prefersReducedMotion ? undefined : KATANA_BUTTON_VARIANTS}
              initial="rest"
              whileHover={prefersReducedMotion ? undefined : 'hover'}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={CONTROL_SPRING}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                if (!isFocus) {
                  audioEngine.playClick();
                }
                startTimer();
              }}
              style={{
                backgroundColor: 'var(--chakra-primary, #DC2626)',
                borderColor: 'rgba(255, 255, 255, 0.24)',
                boxShadow:
                  'inset 0 1px 0 0 rgba(255, 255, 255, 0.24), 0 0 24px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
              }}
              className="relative inline-flex items-center justify-center overflow-hidden rounded-xl border px-4 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors duration-700 hover:brightness-110 will-change-transform"
            >
              <KatanaSlashOverlay enabled={!prefersReducedMotion} />
              <motion.span
                variants={
                  prefersReducedMotion ? undefined : KATANA_SPLIT_VARIANTS
                }
                className="relative z-10 inline-flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>
                  {isFocus ? 'Iniciar Tsukuyomi' : 'Iniciar Repouso Ocular'}
                </span>
              </motion.span>
            </motion.button>

            <motion.button
              type="button"
              {...activeMotionProps}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                resetTimer();
              }}
              aria-label="Resetar cronômetro"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-medium whitespace-nowrap text-zinc-300 transition-colors hover:border-white/25 hover:text-white will-change-transform"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resetar</span>
            </motion.button>
          </>
        )}

        {!isIdle && isSusanooSealed && (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/70 px-2.5 py-2 text-[11px] whitespace-nowrap text-zinc-300">
              <Lock
                className="h-3.5 w-3.5 transition-colors duration-700"
                style={{ color: 'var(--chakra-primary, #DC2626)' }}
                aria-hidden="true"
              />
              <span>Selo ativo</span>
            </div>

            <motion.button
              type="button"
              variants={prefersReducedMotion ? undefined : KATANA_BUTTON_VARIANTS}
              initial="rest"
              whileHover={prefersReducedMotion ? undefined : 'hover'}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={CONTROL_SPRING}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                onOpenSusanooBreak();
              }}
              className="relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-red-600/70 bg-black/80 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-red-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors hover:bg-red-950/50 hover:text-red-300 will-change-transform"
            >
              <KatanaSlashOverlay enabled={!prefersReducedMotion} />
              <motion.span
                variants={
                  prefersReducedMotion ? undefined : KATANA_SPLIT_VARIANTS
                }
                className="relative z-10 inline-flex items-center gap-1.5"
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quebrar Selo do Susano&apos;o</span>
              </motion.span>
            </motion.button>
          </>
        )}

        {!isIdle && !isSusanooSealed && (
          <>
            {isRunning ? (
              <motion.button
                type="button"
                variants={prefersReducedMotion ? undefined : KATANA_BUTTON_VARIANTS}
                initial="rest"
                whileHover={prefersReducedMotion ? undefined : 'hover'}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                transition={CONTROL_SPRING}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  pauseTimer();
                }}
                className="relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-2 text-xs font-semibold whitespace-nowrap text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/30 hover:bg-zinc-800 will-change-transform"
              >
                <KatanaSlashOverlay enabled={!prefersReducedMotion} />
                <motion.span
                  variants={
                    prefersReducedMotion ? undefined : KATANA_SPLIT_VARIANTS
                  }
                  className="relative z-10 inline-flex items-center gap-1.5"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pausar</span>
                </motion.span>
              </motion.button>
            ) : isPaused ? (
              <motion.button
                type="button"
                variants={prefersReducedMotion ? undefined : KATANA_BUTTON_VARIANTS}
                initial="rest"
                whileHover={prefersReducedMotion ? undefined : 'hover'}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                transition={CONTROL_SPRING}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  startTimer();
                }}
                style={{
                  backgroundColor: 'var(--chakra-primary, #DC2626)',
                  borderColor: 'rgba(255, 255, 255, 0.24)',
                  boxShadow:
                    'inset 0 1px 0 0 rgba(255, 255, 255, 0.24), 0 0 24px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                }}
                className="relative inline-flex items-center justify-center overflow-hidden rounded-xl border px-4 py-2 text-xs font-semibold whitespace-nowrap text-white transition-colors duration-700 hover:brightness-110 will-change-transform"
              >
                <KatanaSlashOverlay enabled={!prefersReducedMotion} />
                <motion.span
                  variants={
                    prefersReducedMotion ? undefined : KATANA_SPLIT_VARIANTS
                  }
                  className="relative z-10 inline-flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Retomar</span>
                </motion.span>
              </motion.button>
            ) : null}

            {!isFocus ? (
              <motion.button
                type="button"
                {...activeMotionProps}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  abandonActiveCycle();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-medium whitespace-nowrap text-zinc-300 transition-colors hover:border-white/25 hover:text-white will-change-transform"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Encerrar Pausa</span>
              </motion.button>
            ) : (
              <>
                {izanagiAvailable && (
                  <motion.button
                    type="button"
                    {...activeMotionProps}
                    onMouseEnter={() => audioEngine.playHover()}
                    onClick={() => {
                      audioEngine.playClick();
                      onOpenIzanagiAbandon();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/35 px-3 py-2 text-xs font-medium whitespace-nowrap text-red-300 transition-colors hover:border-red-500/70 hover:bg-red-950/60 will-change-transform"
                    title="Reescrever abandono sacrificando visão temporária em vez de perder acuidade"
                  >
                    <Eye className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                    <span>Invocar Izanagi</span>
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  {...activeMotionProps}
                  onMouseEnter={() => audioEngine.playHover()}
                  onClick={() => {
                    audioEngine.playClick();
                    abandonActiveCycle({ useIzanagi: false });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-medium whitespace-nowrap text-zinc-400 transition-colors hover:border-red-900/70 hover:text-red-300 will-change-transform"
                  title="Abandonar ciclo (+1 desgaste visual)"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Abandonar</span>
                </motion.button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
