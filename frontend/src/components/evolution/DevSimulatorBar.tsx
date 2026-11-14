'use client';

import { useState } from 'react';
import {
  EyeOff,
  Flame,
  RotateCcw,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { EYE_STAGES } from '@/constants/evolution';
import { cn } from '@/lib/cn';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { EyeStage } from '@/types/tsukuyomi';

export function DevSimulatorBar() {
  const {
    chakra,
    izanagi,
    devAddChakra,
    devUnlockAllEyes,
    devTriggerAwakening,
    devToggleEyeBlindness,
    devSimulateDayTurnWithAmaterasu,
    devResetToSeed,
  } = useTsukuyomiStore(
    useShallow((state) => ({
      chakra: state.chakra,
      izanagi: state.izanagi,
      devAddChakra: state.devAddChakra,
      devUnlockAllEyes: state.devUnlockAllEyes,
      devTriggerAwakening: state.devTriggerAwakening,
      devToggleEyeBlindness: state.devToggleEyeBlindness,
      devSimulateDayTurnWithAmaterasu: state.devSimulateDayTurnWithAmaterasu,
      devResetToSeed: state.devResetToSeed,
    })),
  );

  const [selectedAwakeningStage, setSelectedAwakeningStage] =
    useState<EyeStage>('mangekyou');

  return (
    <aside
      aria-label="Simulador Dev Mode do Santuário Naka"
      className="rounded-2xl border border-zinc-800/80 border-t-white/[0.06] bg-[#09090B]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
          <Terminal className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          <span>Dev Mode — Simulador do Santuário</span>
        </div>
        <span className="font-mono tabular-nums text-xs text-zinc-500">
          Chakra atual: {chakra.toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Chakra injections */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-[#121215] p-1">
          <span className="flex items-center gap-1 px-2 text-[11px] text-zinc-400">
            <Zap className="h-3 w-3 text-red-400" aria-hidden="true" />
            Chakra:
          </span>
          <button
            type="button"
            onClick={() => devAddChakra(1000)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono tabular-nums text-xs text-zinc-200 transition-colors hover:border-red-700/70 hover:text-white"
          >
            +1.000
          </button>
          <button
            type="button"
            onClick={() => devAddChakra(10000)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono tabular-nums text-xs text-zinc-200 transition-colors hover:border-red-700/70 hover:text-white"
          >
            +10.000
          </button>
          <button
            type="button"
            onClick={() => devAddChakra(50000)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono tabular-nums text-xs text-zinc-200 transition-colors hover:border-red-700/70 hover:text-white"
          >
            +50.000
          </button>
        </div>

        {/* Unlock all */}
        <button
          type="button"
          onClick={devUnlockAllEyes}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-red-700/70 hover:bg-red-950/30"
        >
          <Unlock className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
          <span>Desbloquear Todos</span>
        </button>

        {/* Izanagi eye blindness */}
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-[#121215] p-1">
          <button
            type="button"
            onClick={() => devToggleEyeBlindness('right')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors',
              izanagi.rightEyeBlind
                ? 'bg-zinc-800 text-zinc-400 line-through'
                : 'bg-red-950/50 text-red-200 hover:bg-red-900/50',
            )}
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            <span>Dir. {izanagi.rightEyeBlind ? '(Cego)' : '(Ativo)'}</span>
          </button>
          <button
            type="button"
            onClick={() => devToggleEyeBlindness('left')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors',
              izanagi.leftEyeBlind
                ? 'bg-zinc-800 text-zinc-400 line-through'
                : 'bg-red-950/50 text-red-200 hover:bg-red-900/50',
            )}
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            <span>Esq. {izanagi.leftEyeBlind ? '(Cego)' : '(Ativo)'}</span>
          </button>
        </div>

        {/* Awakening preview */}
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-[#121215] p-1">
          <label htmlFor="dev-awakening-stage" className="sr-only">
            Estágio para testar despertar
          </label>
          <select
            id="dev-awakening-stage"
            value={selectedAwakeningStage}
            onChange={(e) =>
              setSelectedAwakeningStage(e.target.value as EyeStage)
            }
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-red-600 focus:outline-none"
          >
            {EYE_STAGES.map((stage) => (
              <option key={stage.stage} value={stage.stage}>
                {stage.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => devTriggerAwakening(selectedAwakeningStage)}
            className="inline-flex items-center gap-1 rounded-md border border-red-900/70 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-200 transition-colors hover:bg-red-900/50"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>Simular Despertar</span>
          </button>
        </div>

        {/* Day turn Amaterasu penalty */}
        <button
          type="button"
          onClick={devSimulateDayTurnWithAmaterasu}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/70 bg-black px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-600 hover:text-red-200"
        >
          <Flame className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          <span>Virada Amaterasu (-300)</span>
        </button>

        {/* Reset seed */}
        <button
          type="button"
          onClick={devResetToSeed}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Resetar Seed</span>
        </button>
      </div>
    </aside>
  );
}
