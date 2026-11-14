'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { EYE_STAGE_MAP } from '@/constants/evolution';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import { CinematicModalBackdropEffects } from '@/components/modals/SusanooBreakModal';

export function AwakeningModal() {
  const prefersReducedMotion = useReducedMotion();
  const {
    pendingAwakening,
    mangekyouVariant,
    dismissPendingAwakening,
    equipEyeStage,
  } = useTsukuyomiStore(
    useShallow((state) => ({
      pendingAwakening: state.pendingAwakening,
      mangekyouVariant: state.mangekyouVariant,
      dismissPendingAwakening: state.dismissPendingAwakening,
      equipEyeStage: state.equipEyeStage,
    })),
  );

  useEffect(() => {
    if (!pendingAwakening) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dismissPendingAwakening();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingAwakening, dismissPendingAwakening]);

  const stageDef = pendingAwakening ? EYE_STAGE_MAP[pendingAwakening] : null;

  function handleEquipAndContinue() {
    if (pendingAwakening) {
      equipEyeStage(pendingAwakening);
    }
    dismissPendingAwakening();
  }

  return (
    <AnimatePresence>
      {pendingAwakening && stageDef ? (
        <motion.div
          key="awakening-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/65 p-4 backdrop-blur-xl"
          onClick={dismissPendingAwakening}
        >
          <CinematicModalBackdropEffects
            prefersReducedMotion={prefersReducedMotion}
          />
          <motion.div
            key={`awakening-dialog-${pendingAwakening}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="awakening-modal-title"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 16 }
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
                : { type: 'spring', stiffness: 280, damping: 24 }
            }
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/30 bg-[#09090B]/80 p-6 text-center shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(220,38,38,0.2)] backdrop-blur-2xl sm:p-8"
          >
            {/* Subtle radial crimson flare behind eye */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_35%,rgba(220,38,38,0.22),transparent_70%)]"
            />

            <button
              type="button"
              onClick={dismissPendingAwakening}
              aria-label="Fechar modal de despertar ocular"
              className="absolute right-4 top-4 z-20 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-red-800/70 hover:text-zinc-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-900/70 bg-red-950/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-red-300">
                <Sparkles className="h-3 w-3 text-red-400" aria-hidden="true" />
                <span>Despertar Ocular</span>
              </div>

              {/* Animated wrapper around SVG (never animate <svg> directly) */}
              <div className="relative mt-6 flex h-44 w-44 items-center justify-center">
                {prefersReducedMotion ? null : (
                  <motion.div
                    aria-hidden="true"
                    className="will-change-transform absolute inset-2 rounded-full border border-red-600/40"
                    initial={{ scale: 0.85, opacity: 0.25 }}
                    animate={{
                      scale: [0.95, 1.08, 1],
                      opacity: [0.35, 0.85, 0.35],
                    }}
                    transition={{
                      type: 'tween',
                      duration: 2.8,
                      ease: 'easeInOut',
                      repeat: Infinity,
                    }}
                  />
                )}
                <motion.div
                  className="will-change-transform"
                  initial={
                    prefersReducedMotion ? { scale: 1 } : { scale: 0.8, rotate: -45 }
                  }
                  animate={{ scale: 1, rotate: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.75, ease: [0.16, 1, 0.3, 1] }
                  }
                >
                  <SharinganSvg
                    stage={pendingAwakening}
                    variant={mangekyouVariant}
                    isAwakening={!prefersReducedMotion}
                    className="h-36 w-36 drop-shadow-[0_0_24px_rgba(220,38,38,0.55)]"
                  />
                </motion.div>
              </div>

              <h2
                id="awakening-modal-title"
                className="mt-4 font-display text-2xl font-bold tracking-wide text-zinc-50 sm:text-3xl"
              >
                {stageDef.name}
              </h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
                {stageDef.subtitle}
              </p>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300">
                {stageDef.lore}
              </p>

              <div className="mt-5 inline-flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#121215] px-4 py-2 text-xs text-zinc-300">
                <span className="text-zinc-500">Marco da Tábua:</span>
                <span className="font-mono tabular-nums font-semibold text-red-400">
                  {stageDef.requiredChakra.toLocaleString('pt-BR')} Chakra
                </span>
              </div>

              <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleEquipAndContinue}
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/70 bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-500"
                >
                  Equipar &amp; Continuar
                </button>
                <button
                  type="button"
                  onClick={dismissPendingAwakening}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                >
                  Manter Olho Atual
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
