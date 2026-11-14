'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Flame,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { AmbientSoundMixer } from '@/components/audio/AmbientSoundMixer';
import { OcularClock } from '@/components/clock/OcularClock';
import { TimerControls } from '@/components/clock/TimerControls';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { sortMissionsAmaterasuFirst } from '@/lib/gamification';
import {
  useIsTsukuyomiMode,
  useOcularProfile,
  useTimerCore,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type {
  EyeStage,
  MangekyouVariant,
  SusanooStageOverride,
} from '@/types/tsukuyomi';

export interface TempleViewProps {
  onOpenSusanooBreak: () => void;
  onOpenIzanagiAbandon: () => void;
}

const QUICK_EYE_OPTIONS: readonly { stage: EyeStage; label: string }[] = [
  { stage: 'normal', label: 'Comum' },
  { stage: 'tomoe_1', label: '1T' },
  { stage: 'tomoe_2', label: '2T' },
  { stage: 'tomoe_3', label: '3T' },
  { stage: 'mangekyou', label: 'Mangekyou' },
  { stage: 'ems', label: 'EMS' },
  { stage: 'rinnegan', label: 'Rinnegan' },
];

const QUICK_CHARACTER_OPTIONS: readonly {
  variant: MangekyouVariant;
  label: string;
}[] = [
  { variant: 'itachi', label: 'Itachi' },
  { variant: 'sasuke', label: 'Sasuke' },
  { variant: 'shisui', label: 'Shisui' },
  { variant: 'obito', label: 'Obito' },
  { variant: 'madara', label: 'Madara' },
];

const QUICK_SUSANOO_OPTIONS: readonly {
  phase: SusanooStageOverride;
  label: string;
}[] = [
  { phase: 'auto', label: 'Auto' },
  { phase: 1, label: 'Fase 1 (Costelas)' },
  { phase: 2, label: 'Fase 2 (Esqueleto)' },
  { phase: 3, label: 'Fase 3 (Tengu Perfeito)' },
];

const PILL_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 26,
} as const;

export function TempleView({
  onOpenSusanooBreak,
  onOpenIzanagiAbandon,
}: TempleViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isBetaDockOpen, setIsBetaDockOpen] = useState(true);

  const { status, activeMissionId } = useTimerCore();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const {
    equippedEyeStage,
    mangekyouVariant,
    susanooStageOverride,
    isBetaFullAccess,
    customEye,
  } = useOcularProfile();

  const missions = useTsukuyomiStore((state) => state.missions);
  const setActiveMission = useTsukuyomiStore((state) => state.setActiveMission);
  const setActiveTab = useTsukuyomiStore((state) => state.setActiveTab);
  const equipEyeStage = useTsukuyomiStore((state) => state.equipEyeStage);
  const setMangekyouVariant = useTsukuyomiStore(
    (state) => state.setMangekyouVariant,
  );
  const setBetaFullAccess = useTsukuyomiStore(
    (state) => state.setBetaFullAccess,
  );
  const setSusanooStageOverride = useTsukuyomiStore(
    (state) => state.setSusanooStageOverride,
  );
  const setSusanooEnabled = useTsukuyomiStore(
    (state) => state.setSusanooEnabled,
  );
  const updateCustomEye = useTsukuyomiStore((state) => state.updateCustomEye);

  const selectableMissions = useMemo(() => {
    const inTsukuyomi = sortMissionsAmaterasuFirst(
      missions.filter((m) => m.status === 'in_tsukuyomi'),
    );
    const todo = sortMissionsAmaterasuFirst(
      missions.filter((m) => m.status === 'todo'),
    );
    return [...inTsukuyomi, ...todo];
  }, [missions]);

  const activeMission = useMemo(
    () => missions.find((m) => m.id === activeMissionId) ?? null,
    [missions, activeMissionId],
  );

  const isLocked = status !== 'idle';

  const handleSelectEyeStage = (stage: EyeStage) => {
    audioEngine.playClick();
    if (!isBetaFullAccess) {
      setBetaFullAccess(true);
    }
    if (customEye.enabled) {
      updateCustomEye({ enabled: false });
    }
    equipEyeStage(stage);
  };

  const handleSelectCharacter = (variant: MangekyouVariant) => {
    audioEngine.playClick();
    if (!isBetaFullAccess) {
      setBetaFullAccess(true);
    }
    setMangekyouVariant(variant);
  };

  const handleSelectSusanooPhase = (phase: SusanooStageOverride) => {
    audioEngine.playClick();
    setSusanooStageOverride(phase);
    if (phase !== 'auto' && status === 'idle') {
      setSusanooEnabled(true);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-2 py-2 sm:px-4">
      {/* Active Mission Selector */}
      <section
        aria-label="Seleção de Missão Ativa"
        className={cn(
          'obsidian-surface w-full rounded-xl border-t border-white/[0.07] p-3.5 transition-opacity duration-500 sm:p-4',
          isTsukuyomiMode && status === 'running' && 'opacity-70 hover:opacity-100',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-red-500" aria-hidden="true" />
            <label
              htmlFor="temple-mission-select"
              className="text-[11px] font-medium tracking-[0.18em] text-zinc-400 uppercase"
            >
              Alvo do Tsukuyomi
            </label>
          </div>

          <div className="flex flex-1 items-center gap-2 sm:max-w-lg">
            <select
              id="temple-mission-select"
              value={activeMissionId ?? ''}
              disabled={isLocked}
              onMouseEnter={() => {
                if (!isLocked) audioEngine.playHover();
              }}
              onClick={() => {
                if (!isLocked) audioEngine.playClick();
              }}
              onChange={(e) =>
                setActiveMission(e.target.value === '' ? null : e.target.value)
              }
              aria-label="Selecionar missão ativa para o ciclo de foco"
              className={cn(
                'w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-red-600 focus:outline-none',
                isLocked && 'cursor-not-allowed opacity-60',
              )}
            >
              <option value="">
                Treino Livre no Tsukuyomi (Rank D · 1.0x)
              </option>
              {selectableMissions.map((mission) => {
                const rankDef = RANK_DEFINITIONS[mission.rank];
                const prefix = mission.isAmaterasu ? '[AMATERASU] ' : '';
                const colTag =
                  mission.status === 'in_tsukuyomi' ? 'No Tsukuyomi' : 'Pergaminho';
                return (
                  <option key={mission.id} value={mission.id}>
                    {prefix}[Rank {mission.rank} · {rankDef.multiplier}x] {mission.title} ({mission.estimatedMinutes}m · {colTag})
                  </option>
                );
              })}
            </select>

            <motion.button
              type="button"
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={PILL_SPRING}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                setActiveTab('kanban');
              }}
              aria-label="Abrir Quadro de Missões"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 will-change-transform"
            >
              <ScrollText className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span className="hidden sm:inline">Missões</span>
              <ArrowRight className="h-3 w-3 text-zinc-500" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {activeMission && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-zinc-400">
              {activeMission.isAmaterasu && (
                <span className="inline-flex items-center gap-1 rounded border border-red-600/50 bg-black px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                  <Flame className="h-3 w-3 text-red-500" aria-hidden="true" />
                  Chamas Negras (2.0x)
                </span>
              )}
              <span>
                Multiplicador:{' '}
                <strong className="font-mono text-zinc-200 tabular-nums">
                  {RANK_DEFINITIONS[activeMission.rank].multiplier}x
                </strong>
              </span>
            </div>

            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
              Progresso: {activeMission.completedMinutes}m /{' '}
              {activeMission.estimatedMinutes}m
            </span>
          </div>
        )}
      </section>

      {/* Centerpiece: 4-Layer Ocular Clock */}
      <OcularClock />

      {/* Collapsible Quick Switcher Beta Dock */}
      <section
        aria-label="Barra Rápida de Teste Beta"
        className={cn(
          'obsidian-surface w-full max-w-3xl overflow-hidden rounded-xl border-t border-white/[0.07] transition-opacity duration-500',
          isTsukuyomiMode && status === 'running' && 'opacity-80 hover:opacity-100',
        )}
      >
        <motion.button
          type="button"
          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
          transition={PILL_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          onClick={() => {
            audioEngine.playClick();
            setIsBetaDockOpen((prev) => !prev);
          }}
          aria-expanded={isBetaDockOpen}
          aria-controls="beta-quick-switcher-panel"
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.02] sm:px-4"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-red-500"
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold tracking-[0.18em] text-zinc-200 uppercase">
              Barra Rápida de Teste Beta
            </span>
            <span className="rounded border border-red-500/35 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              1-Clique Ao Vivo
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
            <span className="hidden sm:inline">
              {isBetaDockOpen ? 'Recolher' : 'Expandir'}
            </span>
            {isBetaDockOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
        </motion.button>

        <AnimatePresence initial={false}>
          {isBetaDockOpen ? (
            <motion.div
              id="beta-quick-switcher-panel"
              key="beta-quick-switcher-panel"
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, height: 0 }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
              }
              className="overflow-hidden border-t border-zinc-800/80"
            >
              <div className="flex flex-col gap-3 p-3.5 sm:p-4">
                {/* Olho Ativo */}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
                    <Eye className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                    <span>Olho Ativo</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {QUICK_EYE_OPTIONS.map((opt) => {
                      const active = equippedEyeStage === opt.stage;
                      return (
                        <motion.button
                          key={opt.stage}
                          type="button"
                          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                          whileTap={
                            prefersReducedMotion ? undefined : { scale: 0.97 }
                          }
                          transition={PILL_SPRING}
                          onMouseEnter={() => audioEngine.playHover()}
                          onClick={() => handleSelectEyeStage(opt.stage)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors will-change-transform',
                            active
                              ? 'border-red-500/80 bg-red-950/60 text-zinc-50 shadow-[0_0_12px_rgba(220,38,38,0.28)]'
                              : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                          )}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Personagem Uchiha */}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
                    <Sparkles
                      className="h-3.5 w-3.5 text-red-500"
                      aria-hidden="true"
                    />
                    <span>Personagem Uchiha</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {QUICK_CHARACTER_OPTIONS.map((opt) => {
                      const active = mangekyouVariant === opt.variant;
                      return (
                        <motion.button
                          key={opt.variant}
                          type="button"
                          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                          whileTap={
                            prefersReducedMotion ? undefined : { scale: 0.97 }
                          }
                          transition={PILL_SPRING}
                          onMouseEnter={() => audioEngine.playHover()}
                          onClick={() => handleSelectCharacter(opt.variant)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors will-change-transform',
                            active
                              ? 'border-red-500/80 bg-red-950/60 text-zinc-50 shadow-[0_0_12px_rgba(220,38,38,0.28)]'
                              : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                          )}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Fase do Susano'o */}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-zinc-400 uppercase">
                    <Shield
                      className="h-3.5 w-3.5 text-red-500"
                      aria-hidden="true"
                    />
                    <span>Fase do Susano&apos;o</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {QUICK_SUSANOO_OPTIONS.map((opt) => {
                      const active = susanooStageOverride === opt.phase;
                      return (
                        <motion.button
                          key={String(opt.phase)}
                          type="button"
                          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                          whileTap={
                            prefersReducedMotion ? undefined : { scale: 0.97 }
                          }
                          transition={PILL_SPRING}
                          onMouseEnter={() => audioEngine.playHover()}
                          onClick={() => handleSelectSusanooPhase(opt.phase)}
                          aria-pressed={active}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors will-change-transform',
                            active
                              ? 'border-red-500/80 bg-red-950/60 text-zinc-50 shadow-[0_0_12px_rgba(220,38,38,0.28)]'
                              : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                          )}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      {/* Controls & Ambient Sound */}
      <div
        className={cn(
          'flex w-full max-w-2xl flex-col gap-4 transition-opacity duration-500',
          isTsukuyomiMode && status === 'running' && 'opacity-85 hover:opacity-100',
        )}
      >
        <TimerControls
          onOpenSusanooBreak={onOpenSusanooBreak}
          onOpenIzanagiAbandon={onOpenIzanagiAbandon}
        />

        <AmbientSoundMixer compact />
      </div>
    </div>
  );
}
