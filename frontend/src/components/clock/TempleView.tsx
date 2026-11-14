'use client';

import { useMemo } from 'react';
import { ArrowRight, Flame, ScrollText, Target } from 'lucide-react';
import { AmbientSoundMixer } from '@/components/audio/AmbientSoundMixer';
import { OcularClock } from '@/components/clock/OcularClock';
import { TimerControls } from '@/components/clock/TimerControls';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { cn } from '@/lib/cn';
import { sortMissionsAmaterasuFirst } from '@/lib/gamification';
import {
  useIsTsukuyomiMode,
  useTimerCore,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

export interface TempleViewProps {
  onOpenSusanooBreak: () => void;
  onOpenIzanagiAbandon: () => void;
}

export function TempleView({
  onOpenSusanooBreak,
  onOpenIzanagiAbandon,
}: TempleViewProps) {
  const { status, activeMissionId } = useTimerCore();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const missions = useTsukuyomiStore((state) => state.missions);
  const setActiveMission = useTsukuyomiStore((state) => state.setActiveMission);
  const setActiveTab = useTsukuyomiStore((state) => state.setActiveTab);

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

            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              aria-label="Abrir Quadro de Missões"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <ScrollText className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span className="hidden sm:inline">Missões</span>
              <ArrowRight className="h-3 w-3 text-zinc-500" aria-hidden="true" />
            </button>
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
