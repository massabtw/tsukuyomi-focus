'use client';

import { Eye, Flame, Moon, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { IZANAGI_RESTORATION_MINUTES } from '@/constants/ranks';
import { cn } from '@/lib/cn';
import {
  getNextEyeStageInfo,
  getVisualAcuityPercent,
} from '@/lib/gamification';
import {
  useIsTsukuyomiMode,
  useOcularProfile,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

interface IzanagiEyeGlyphProps {
  side: 'left' | 'right';
  isBlind: boolean;
}

function IzanagiEyeGlyph({ side, isBlind }: IzanagiEyeGlyphProps) {
  const label = side === 'left' ? 'Olho Esquerdo' : 'Olho Direito';

  return (
    <span
      className={cn(
        'relative inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
        isBlind
          ? 'border-zinc-700/80 bg-zinc-900/90 text-[#52525B]'
          : 'border-red-600/50 bg-red-950/30 text-[#DC2626] shadow-[0_0_10px_rgba(220,38,38,0.28)]',
      )}
      aria-label={`${label}: ${isBlind ? 'Cego pelo Izanagi' : 'Ativo'}`}
    >
      <svg
        width="18"
        height="12"
        viewBox="0 0 18 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M1.5 6C3.4 2.7 6 1.2 9 1.2C12 1.2 14.6 2.7 16.5 6C14.6 9.3 12 10.8 9 10.8C6 10.8 3.4 9.3 1.5 6Z"
          stroke={isBlind ? '#52525B' : '#DC2626'}
          strokeWidth="1.25"
          fill={isBlind ? '#18181B' : '#450A0A'}
        />
        <circle
          cx="9"
          cy="6"
          r="2.4"
          fill={isBlind ? '#52525B' : '#DC2626'}
        />
        <circle
          cx="9"
          cy="6"
          r="0.9"
          fill={isBlind ? '#27272A' : '#000000'}
        />
        {isBlind ? (
          <line
            x1="2.5"
            y1="10.5"
            x2="15.5"
            y2="1.5"
            stroke="#71717A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}

export function NinjaHeader() {
  const {
    chakra,
    currentEyeStage,
    streak,
    longestStreak,
    visualBlurLevel,
    izanagi,
  } = useOcularProfile();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const toggleTsukuyomiMode = useTsukuyomiStore((s) => s.toggleTsukuyomiMode);
  const prefersReducedMotion = useReducedMotion();

  const stageInfo = getNextEyeStageInfo(currentEyeStage, chakra, longestStreak);
  const acuityPercent = getVisualAcuityPercent(visualBlurLevel);
  const hasBlindEye = izanagi.leftEyeBlind || izanagi.rightEyeBlind;
  const progressRatio = Math.max(0, Math.min(1, stageInfo.progressPercent / 100));

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-md transition-colors duration-500',
        isTsukuyomiMode
          ? 'border-t border-t-red-500/25 border-b border-b-red-950/80 bg-[#000000]/92 shadow-[0_12px_36px_rgba(0,0,0,0.95)]'
          : 'border-t border-t-white/[0.07] border-b border-b-[#27272A] bg-[#121215]/90 shadow-[0_12px_36px_rgba(0,0,0,0.85)]',
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3 sm:px-6">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
              isTsukuyomiMode
                ? 'border-red-500/40 bg-black shadow-[0_0_16px_rgba(239,68,68,0.28)]'
                : 'border-red-900/60 bg-[#09090B] shadow-[0_0_12px_rgba(127,29,29,0.35)]',
            )}
          >
            {/* Uchiha Clan Crest (Uchiwa Fan) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2.5C7.3 2.5 4 5.9 4 10.2C4 12.1 4.8 13.7 6 14.8H18C19.2 13.7 20 12.1 20 10.2C20 5.9 16.7 2.5 12 2.5Z"
                fill="#DC2626"
              />
              <path
                d="M6 14.8C7.4 16.4 9.5 17.3 12 17.3C14.5 17.3 16.6 16.4 18 14.8H6Z"
                fill="#FAFAFA"
              />
              <rect x="11.1" y="17.3" width="1.8" height="4.4" rx="0.9" fill="#A1A1AA" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold tracking-[0.22em] text-zinc-100 uppercase sm:text-base">
                Tsukuyomi
              </span>
              <span className="rounded border border-red-900/60 bg-red-950/35 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-red-400 uppercase">
                Focus
              </span>
            </div>
            <p className="hidden text-[11px] tracking-wide text-zinc-500 sm:block">
              Santuário Naka · Disciplina Ocular Uchiha
            </p>
          </div>
        </div>

        {/* Center: EyeStage Badge + Chakra Progress */}
        <div className="order-3 flex w-full items-center gap-3 border-t border-white/[0.05] pt-2 lg:order-2 lg:w-auto lg:min-w-[290px] lg:border-t-0 lg:pt-0">
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                <span>{stageInfo.currentDefinition.name}</span>
              </span>
              <span className="font-mono text-xs font-medium text-zinc-300 tabular-nums">
                {chakra.toLocaleString('pt-BR')} Chakra
              </span>
            </div>

            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90"
              role="progressbar"
              aria-label="Progresso de Chakra para o próximo estágio ocular"
              aria-valuenow={stageInfo.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                initial={false}
                animate={{ scaleX: progressRatio }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 160, damping: 24 }
                }
                style={{ transformOrigin: 'left', willChange: 'transform' }}
                className="h-full w-full rounded-full bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-[#EF4444]"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              {stageInfo.isMaxed ? (
                <span>Ápice do Santuário Naka alcançado</span>
              ) : (
                <span>
                  Próximo: {stageInfo.nextDefinition?.name}
                </span>
              )}
              {!stageInfo.isMaxed ? (
                <span className="font-mono tabular-nums">
                  {stageInfo.chakraRemaining > 0
                    ? `-${stageInfo.chakraRemaining.toLocaleString('pt-BR')} Chakra`
                    : 'Desbloqueado'}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Streak, Izanagi Eyes, Acuity, Tsukuyomi Toggle */}
        <div className="order-2 flex items-center gap-2 sm:gap-2.5 lg:order-3">
          {/* Streak Counter */}
          <div
            title={`Ofensiva atual: ${streak} dia(s) · Recorde: ${longestStreak} dia(s)`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B]/80 px-2.5 py-1.5 text-xs"
          >
            <Flame
              className={cn(
                'h-3.5 w-3.5',
                streak > 0 ? 'text-red-500' : 'text-zinc-600',
              )}
              aria-hidden="true"
            />
            <span className="font-mono font-semibold text-zinc-100 tabular-nums">
              {streak}d
            </span>
          </div>

          {/* Left & Right Izanagi Eye Indicators with interactive tooltip */}
          <div className="group relative">
            <button
              type="button"
              aria-label={`Olhos do Izanagi. Esquerdo ${
                izanagi.leftEyeBlind ? 'cego' : 'ativo'
              }, Direito ${
                izanagi.rightEyeBlind ? 'cego' : 'ativo'
              }. Progresso de restauração: ${
                izanagi.restorationProgressMinutes
              } de ${IZANAGI_RESTORATION_MINUTES} minutos.`}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#09090B]/80 px-2 py-1 transition-colors hover:border-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <IzanagiEyeGlyph side="left" isBlind={izanagi.leftEyeBlind} />
              <IzanagiEyeGlyph side="right" isBlind={izanagi.rightEyeBlind} />
            </button>

            <div
              role="tooltip"
              className="pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-zinc-800 border-t-white/[0.08] bg-[#121215]/95 p-3 text-xs opacity-0 shadow-[0_20px_50px_rgba(0,0,0,0.92)] backdrop-blur-md transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              <p className="font-medium text-zinc-100">
                Selos Oculares (Izanagi)
              </p>
              <div className="mt-1.5 space-y-1 text-[11px] text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Olho Esquerdo</span>
                  <span
                    className={
                      izanagi.leftEyeBlind ? 'text-zinc-500' : 'text-red-400'
                    }
                  >
                    {izanagi.leftEyeBlind ? 'Cego' : 'Ativo'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Olho Direito</span>
                  <span
                    className={
                      izanagi.rightEyeBlind ? 'text-zinc-500' : 'text-red-400'
                    }
                  >
                    {izanagi.rightEyeBlind ? 'Cego' : 'Ativo'}
                  </span>
                </div>
              </div>
              <div className="mt-2 border-t border-zinc-800 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Restauração</span>
                  <span className="font-mono text-zinc-200 tabular-nums">
                    {izanagi.restorationProgressMinutes} /{' '}
                    {IZANAGI_RESTORATION_MINUTES} min
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {hasBlindEye
                    ? 'Conclua ciclos de foco para restaurar a visão.'
                    : 'Ambos os olhos íntegros para reescrever a realidade.'}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Acuity Badge */}
          <div
            title={`Acuidade Visual: ${acuityPercent}% (nível de desgaste ${visualBlurLevel}/3)`}
            className={cn(
              'hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs sm:flex',
              acuityPercent === 100
                ? 'border-zinc-800 bg-[#09090B]/80 text-zinc-300'
                : 'border-red-900/60 bg-red-950/30 text-red-300',
            )}
          >
            <Eye
              className={cn(
                'h-3.5 w-3.5',
                acuityPercent === 100 ? 'text-zinc-400' : 'text-red-400',
              )}
              aria-hidden="true"
            />
            <span className="font-mono font-medium tabular-nums">
              {acuityPercent}%
            </span>
          </div>

          {/* Tsukuyomi Mode Toggle */}
          <button
            type="button"
            onClick={() => toggleTsukuyomiMode()}
            aria-pressed={isTsukuyomiMode}
            aria-label={
              isTsukuyomiMode
                ? 'Desativar Modo Tsukuyomi'
                : 'Ativar Modo Tsukuyomi'
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
              isTsukuyomiMode
                ? 'border-red-500/70 bg-red-950/50 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.28)] hover:bg-red-950/70'
                : 'border-zinc-800 bg-[#09090B]/80 text-zinc-300 hover:border-red-800/70 hover:text-zinc-100',
            )}
          >
            <Moon
              className={cn(
                'h-3.5 w-3.5',
                isTsukuyomiMode ? 'text-red-400' : 'text-zinc-400',
              )}
              aria-hidden="true"
            />
            <span className="hidden md:inline">
              {isTsukuyomiMode ? 'Tsukuyomi' : 'Modo Tsukuyomi'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
