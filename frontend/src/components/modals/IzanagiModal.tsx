'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { IZANAGI_RESTORATION_MINUTES } from '@/constants/ranks';
import { cn } from '@/lib/cn';
import { canInvokeIzanagi } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { IzanagiTriggerContext } from '@/types/tsukuyomi';

function EyeStatusCard({
  label,
  isBlind,
  willBeSacrificedNext,
}: {
  label: string;
  isBlind: boolean;
  willBeSacrificedNext: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-colors',
        isBlind
          ? 'border-zinc-800 bg-[#09090B]/70'
          : willBeSacrificedNext
            ? 'border-red-700/70 bg-red-950/25'
            : 'border-red-900/50 bg-[#121215]',
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border',
          isBlind
            ? 'border-zinc-700 bg-zinc-900 text-[#52525B]'
            : 'border-red-600/80 bg-red-950/60 text-[#DC2626] shadow-[0_0_16px_rgba(220,38,38,0.4)]',
        )}
      >
        {isBlind ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <span className="mt-2.5 text-xs font-semibold text-zinc-200">{label}</span>
      <span
        className={cn(
          'mt-0.5 text-[11px] font-medium',
          isBlind ? 'text-[#52525B]' : 'text-red-400',
        )}
      >
        {isBlind
          ? 'Cego (Selado)'
          : willBeSacrificedNext
            ? 'Ativo • Próximo sacrifício'
            : 'Ativo (Carmesim)'}
      </span>
    </div>
  );
}

export function IzanagiModal({
  isOpen,
  context,
  onClose,
}: {
  isOpen: boolean;
  context: IzanagiTriggerContext;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const {
    izanagi,
    streak,
    pendingIzanagiRescue,
    invokeIzanagi,
    resolveStreakRescueWithIzanagi,
    declineStreakRescue,
  } = useTsukuyomiStore(
    useShallow((state) => ({
      izanagi: state.izanagi,
      streak: state.streak,
      pendingIzanagiRescue: state.pendingIzanagiRescue,
      invokeIzanagi: state.invokeIzanagi,
      resolveStreakRescueWithIzanagi: state.resolveStreakRescueWithIzanagi,
      declineStreakRescue: state.declineStreakRescue,
    })),
  );

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const available = canInvokeIzanagi(izanagi);
  const nextSacrifice: 'right' | 'left' | null = !izanagi.rightEyeBlind
    ? 'right'
    : !izanagi.leftEyeBlind
      ? 'left'
      : null;

  const hasBlindEye = izanagi.leftEyeBlind || izanagi.rightEyeBlind;
  const restorationPercent = Math.min(
    100,
    Math.round(
      (izanagi.restorationProgressMinutes / IZANAGI_RESTORATION_MINUTES) * 100,
    ),
  );

  const preservedStreakCount =
    pendingIzanagiRescue?.previousStreak ?? streak;

  function handleConfirmIzanagi() {
    if (!available) return;
    if (context === 'streak_rescue') {
      resolveStreakRescueWithIzanagi();
    } else {
      invokeIzanagi('abandon_cycle');
    }
    onClose();
  }

  function handleDeclineStreak() {
    declineStreakRescue();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="izanagi-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <motion.div
            key={`izanagi-dialog-${context}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="izanagi-modal-title"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 12 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 290, damping: 25 }
            }
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-red-900/70 border-t-red-500/30 bg-[#09090B] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95)] sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar ritual do Izanagi"
              className="absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-red-400">
                Genjutsu Proibido • Reescrever a Realidade
              </p>
              <h2
                id="izanagi-modal-title"
                className="font-display text-2xl font-bold tracking-wide text-zinc-50"
              >
                Ritual do Izanagi
              </h2>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              {context === 'streak_rescue' ? (
                <>
                  Um dia foi perdido antes do foco diário. Invoque o Izanagi para
                  preservar sua ofensiva de{' '}
                  <span className="font-mono tabular-nums font-semibold text-red-400">
                    {preservedStreakCount} dias
                  </span>{' '}
                  como se o lapso jamais tivesse ocorrido.
                </>
              ) : (
                <>
                  Invoque o Izanagi para encerrar este ciclo sem registrar
                  abandono no Pergaminho e sem agravar seu Desgaste Visual.
                </>
              )}
            </p>

            {/* Left / Right Eye Status */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <EyeStatusCard
                label="Olho Esquerdo"
                isBlind={izanagi.leftEyeBlind}
                willBeSacrificedNext={nextSacrifice === 'left'}
              />
              <EyeStatusCard
                label="Olho Direito"
                isBlind={izanagi.rightEyeBlind}
                willBeSacrificedNext={nextSacrifice === 'right'}
              />
            </div>

            {/* Restoration Progress */}
            <div className="mt-4 rounded-xl border border-zinc-800/90 bg-[#121215] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  Restauração Ocular ({hasBlindEye ? 'Em curso' : 'Olhos íntegros'})
                </span>
                <span className="font-mono tabular-nums font-semibold text-zinc-200">
                  {izanagi.restorationProgressMinutes} /{' '}
                  {IZANAGI_RESTORATION_MINUTES} min
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={izanagi.restorationProgressMinutes}
                aria-valuemin={0}
                aria-valuemax={IZANAGI_RESTORATION_MINUTES}
                aria-label="Progresso de restauração ocular do Izanagi"
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900"
              >
                <div
                  className="h-full rounded-full bg-red-600 transition-[width] duration-300"
                  style={{ width: `${restorationPercent}%` }}
                />
              </div>
            </div>

            {!available ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900/90 p-3.5 text-xs text-zinc-300"
              >
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden="true"
                />
                <p>
                  Ambos os olhos estão cegos. O Izanagi está bloqueado até que{' '}
                  <span className="font-mono tabular-nums text-zinc-100">
                    {IZANAGI_RESTORATION_MINUTES} min
                  </span>{' '}
                  de foco concluído restaurem ao menos uma visão.
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              {context === 'streak_rescue' ? (
                <button
                  type="button"
                  onClick={handleDeclineStreak}
                  className="rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  Aceitar Quebra de Ofensiva
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                disabled={!available}
                onClick={handleConfirmIzanagi}
                className="rounded-xl border border-red-600/80 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:shadow-none"
              >
                {available
                  ? 'Invocar Izanagi (Cegar 1 Olho)'
                  : 'Olhos Cegos — Indisponível'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
