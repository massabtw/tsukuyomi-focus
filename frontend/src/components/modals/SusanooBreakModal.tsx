'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Eye, ShieldOff, X } from 'lucide-react';
import { SUSANOO_BREAK_PHRASE } from '@/constants/ranks';
import { canInvokeIzanagi } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';

const SEALING_RUNES =
  '封印 · 月読 · 禁術 · 須佐能乎 · 伊邪那岐 · 写輪眼 · 封印 · 月読 · 禁術 · 須佐能乎';

const SEALING_RUNE_REPEATS = [0, 1, 2, 3, 4, 5] as const;

const SEALING_BANDS = [
  {
    id: 'upper',
    positionClass: 'top-[10%] sm:top-[12%] -rotate-12',
    xKeyframes: ['0%', '-50%'] as [string, string],
    duration: 42,
  },
  {
    id: 'lower',
    positionClass: 'bottom-[10%] sm:bottom-[12%] rotate-12',
    xKeyframes: ['-50%', '0%'] as [string, string],
    duration: 46,
  },
] as const;

/**
 * Shared optical crimson vignette and diagonal Fuinjutsu sealing bands
 * rendered behind the translucent obsidian dialog card.
 */
export function CinematicModalBackdropEffects({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean | null;
}) {
  const reduced = Boolean(prefersReducedMotion);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Pulsing crimson edge vignette */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 42%, rgba(127, 29, 29, 0.36) 76%, rgba(220, 38, 38, 0.62) 100%)',
          boxShadow: 'inset 0 0 110px rgba(220, 38, 38, 0.48)',
        }}
        initial={{ opacity: reduced ? 0.75 : 0.55 }}
        animate={reduced ? { opacity: 0.75 } : { opacity: [0.55, 0.95, 0.55] }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                type: 'tween',
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      />

      {/* Diagonal Fuinjutsu ninja sealing bands */}
      {SEALING_BANDS.map((band) => (
        <div
          key={band.id}
          className={`absolute -left-[25%] w-[150%] overflow-hidden border-y border-red-500/35 bg-black/45 py-1.5 shadow-[0_0_24px_rgba(220,38,38,0.22)] ${band.positionClass}`}
        >
          <motion.div
            className="will-change-transform flex w-max items-center whitespace-nowrap font-mono text-[11px] font-medium tracking-[0.35em] text-red-400/50 select-none"
            initial={{ x: reduced ? '0%' : band.xKeyframes[0] }}
            animate={reduced ? { x: '0%' } : { x: band.xKeyframes }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    type: 'tween',
                    duration: band.duration,
                    ease: 'linear',
                    repeat: Infinity,
                  }
            }
          >
            {[0, 1].map((copyIndex) => (
              <div key={copyIndex} className="flex shrink-0 items-center">
                {SEALING_RUNE_REPEATS.map((repeatIndex) => (
                  <span
                    key={repeatIndex}
                    className="inline-flex shrink-0 items-center"
                  >
                    <span>{SEALING_RUNES}</span>
                    <span className="px-2 text-red-500/60">·</span>
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export function SusanooBreakModal({
  isOpen,
  onClose,
  onOpenIzanagi,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenIzanagi?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const izanagi = useTsukuyomiStore((state) => state.izanagi);
  const abandonActiveCycle = useTsukuyomiStore(
    (state) => state.abandonActiveCycle,
  );

  const [phraseInput, setPhraseInput] = useState('');

  const handleClose = () => {
    setPhraseInput('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPhraseInput('');
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isPhraseValid = phraseInput === SUSANOO_BREAK_PHRASE;
  const canUseIzanagi = canInvokeIzanagi(izanagi);

  function handleConfirmBreak() {
    if (!isPhraseValid) return;
    abandonActiveCycle({ useIzanagi: false });
    setPhraseInput('');
    onClose();
  }

  function handleTriggerIzanagi() {
    if (!onOpenIzanagi) return;
    setPhraseInput('');
    onClose();
    onOpenIzanagi();
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="susanoo-break-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/65 p-4 backdrop-blur-xl"
        >
          {/* position: fixed already scopes absolute backdrop layers; avoid Tailwind `relative` overriding `fixed` */}
          <CinematicModalBackdropEffects
            prefersReducedMotion={prefersReducedMotion}
          />
          <motion.div
            key="susanoo-break-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="susanoo-break-title"
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
                : { type: 'spring', stiffness: 300, damping: 26 }
            }
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#09090B]/80 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(220,38,38,0.2)] backdrop-blur-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Manter proteção do Susanoo e fechar"
              className="absolute right-4 top-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-900/70 bg-red-950/40 text-red-400">
                <ShieldOff className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-red-400">
                  Selo Anti-Impulso Ativo
                </p>
                <h2
                  id="susanoo-break-title"
                  className="font-display text-xl font-bold text-zinc-50"
                >
                  Quebrar Armadura do Susanoo
                </h2>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-red-950/90 bg-[#121215] p-4 text-sm leading-relaxed text-zinc-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  aria-hidden="true"
                />
                <p>
                  Abandonar este ciclo selado pelo Susanoo anulará todo o Chakra
                  acumulado da sessão, registrará falha no Pergaminho e aumentará
                  seu <strong className="text-red-300">Desgaste Visual</strong>.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <label
                htmlFor="susanoo-break-phrase"
                className="block text-xs font-medium text-zinc-300"
              >
                Para romper o selo, digite exatamente a frase abaixo:
              </label>
              <p className="select-all rounded-lg border border-zinc-800 bg-black px-3 py-2 font-mono text-xs text-red-300">
                {SUSANOO_BREAK_PHRASE}
              </p>
              <input
                id="susanoo-break-phrase"
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="Digite a frase exata para liberar a quebra..."
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-zinc-800 bg-[#121215] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-600 focus:outline-none"
              />
            </div>

            {canUseIzanagi && onOpenIzanagi ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3">
                <div className="text-xs text-zinc-300">
                  <p className="font-semibold text-red-200">
                    Alternativa Proibida: Izanagi
                  </p>
                  <p className="mt-0.5 text-zinc-400">
                    Sacrifique a visão de um olho por 180 min para cancelar sem
                    desgaste nem registro de falha.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerIzanagi}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-700/70 bg-black px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:border-red-500 hover:text-red-200"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Invocar Izanagi</span>
                </button>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white"
              >
                Manter Foco
              </button>
              <button
                type="button"
                disabled={!isPhraseValid}
                onClick={handleConfirmBreak}
                className="rounded-xl border border-red-600/80 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
              >
                Quebrar Susanoo
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
