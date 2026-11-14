'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { formatDisplayDatePtBr } from '@/lib/date';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';

export function AmaterasuPenaltyBanner() {
  const prefersReducedMotion = useReducedMotion();
  const { pendingAmaterasuPenalty, dismissAmaterasuPenalty } =
    useTsukuyomiStore(
      useShallow((state) => ({
        pendingAmaterasuPenalty: state.pendingAmaterasuPenalty,
        dismissAmaterasuPenalty: state.dismissAmaterasuPenalty,
      })),
    );

  return (
    <AnimatePresence>
      {pendingAmaterasuPenalty ? (
        <motion.div
          key={`amaterasu-penalty-${pendingAmaterasuPenalty.missionId}`}
          role="alert"
          initial={
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }
          }
          animate={
            prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
          }
          exit={
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 320, damping: 28 }
          }
          className="amaterasu-frame relative mx-auto mb-4 w-full max-w-6xl overflow-hidden rounded-2xl border border-[#DC2626]/70 bg-[#000000] px-4 py-3.5 text-[#FAFAFA] shadow-[0_0_24px_rgba(220,38,38,0.35)] sm:px-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DC2626]/70 bg-[#000000] text-[#DC2626] shadow-[0_0_12px_rgba(220,38,38,0.5)]">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#EF4444]">
                  Chamas Negras do Amaterasu • Prazo Consumido
                </p>
                <p className="text-sm text-zinc-200">
                  A missão{' '}
                  <strong className="font-semibold text-white">
                    {pendingAmaterasuPenalty.missionTitle}
                  </strong>{' '}
                  de{' '}
                  <span className="font-mono tabular-nums text-zinc-400">
                    {formatDisplayDatePtBr(pendingAmaterasuPenalty.failedDate)}
                  </span>{' '}
                  não foi concluída antes da virada do dia.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="rounded-lg border border-[#7F1D1D] bg-[#000000] px-3 py-1.5 font-mono tabular-nums text-xs font-bold text-[#EF4444] shadow-[0_0_10px_rgba(220,38,38,0.35)]">
                -{pendingAmaterasuPenalty.chakraLost} Chakra
              </span>

              <button
                type="button"
                onClick={dismissAmaterasuPenalty}
                aria-label="Dispensar alerta de penalidade do Amaterasu"
                className="inline-flex items-center gap-1 rounded-lg border border-[#7F1D1D]/80 bg-[#09090B] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#DC2626] hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reconhecer</span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
