'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, Flame, Moon, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IZANAGI_RESTORATION_MINUTES } from '@/constants/ranks';
import { audioEngine } from '@/lib/audioEngine';
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

const OBSIDIAN_CHIP_CLASS =
  'bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] border border-white/[0.06] hover:border-red-500/30 transition-colors';

const CHAKRA_SPARK_VECTORS: ReadonlyArray<{
  id: number;
  dx: number;
  dy: number;
  size: number;
  isWhite: boolean;
}> = [
  { id: 0, dx: 9, dy: -11, size: 4, isWhite: true },
  { id: 1, dx: -5, dy: -13, size: 3, isWhite: false },
  { id: 2, dx: 14, dy: -2, size: 3.5, isWhite: false },
  { id: 3, dx: 7, dy: 11, size: 3, isWhite: true },
  { id: 4, dx: -6, dy: 10, size: 3.5, isWhite: false },
  { id: 5, dx: 15, dy: 5, size: 2.5, isWhite: true },
];

interface IzanagiEyeGlyphProps {
  side: 'left' | 'right';
  isBlind: boolean;
  prefersReducedMotion: boolean;
}

function IzanagiEyeGlyph({
  side,
  isBlind,
  prefersReducedMotion,
}: IzanagiEyeGlyphProps) {
  const label = side === 'left' ? 'Olho Esquerdo' : 'Olho Direito';

  return (
    <span
      className={cn(
        'relative inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
        isBlind
          ? 'border-zinc-700/70 bg-zinc-950/90 text-[#52525B]'
          : 'border-red-600/50 bg-red-950/30 text-[#DC2626] shadow-[0_0_10px_rgba(220,38,38,0.28)]',
      )}
      aria-label={`${label}: ${isBlind ? 'Cego pelo Izanagi' : 'Ativo'}`}
    >
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : { scaleY: [1, 0.05, 1] }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 0.15,
                times: [0, 0.5, 1],
                repeat: Infinity,
                repeatDelay: 14.85,
                ease: 'easeInOut',
                type: 'tween',
              }
        }
        style={{ transformOrigin: 'center', willChange: 'transform' }}
        className="flex items-center justify-center"
      >
        <svg
          width="18"
          height="12"
          viewBox="0 0 18 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Eye opening scales half-closed when blind */}
          <motion.g
            animate={{ scaleY: isBlind ? 0.54 : 1 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: 'easeOut',
              type: 'tween',
            }}
            style={{ transformOrigin: '9px 6px' }}
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
          </motion.g>

          {/* Drooping half-closed upper eyelid overlay when blind */}
          {isBlind ? (
            <path
              d="M1.5 6C3.4 2.7 6 1.2 9 1.2C12 1.2 14.6 2.7 16.5 6L16.2 5.1C13.6 5.8 11.3 6.0 9 6.0C6.7 6.0 4.4 5.8 1.8 5.1Z"
              fill="#09090B"
              fillOpacity="0.92"
              stroke="#52525B"
              strokeWidth="0.75"
            />
          ) : null}

          {/* Luminous diagonal scar that slowly dims when blind */}
          {isBlind ? (
            <motion.line
              x1="2.5"
              y1="10.5"
              x2="15.5"
              y2="1.5"
              stroke="#F4F4F5"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.85))',
              }}
              initial={{ opacity: prefersReducedMotion ? 0.45 : 1 }}
              animate={{ opacity: prefersReducedMotion ? 0.45 : [1, 0.45] }}
              transition={{
                duration: prefersReducedMotion ? 0 : 2.6,
                ease: 'easeOut',
                type: 'tween',
              }}
            />
          ) : null}
        </svg>
      </motion.div>
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
  const prefersReducedMotion = Boolean(useReducedMotion());

  const prevChakraRef = useRef(chakra);
  const [sparkState, setSparkState] = useState<{
    nonce: number;
    active: boolean;
  }>({ nonce: 0, active: false });

  useEffect(() => {
    const previous = prevChakraRef.current;
    prevChakraRef.current = chakra;
    if (chakra > previous) {
      const timer = window.setTimeout(() => {
        setSparkState((curr) => ({ nonce: curr.nonce + 1, active: true }));
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [chakra]);

  const stageInfo = getNextEyeStageInfo(currentEyeStage, chakra, longestStreak);
  const acuityPercent = getVisualAcuityPercent(visualBlurLevel);
  const hasBlindEye = izanagi.leftEyeBlind || izanagi.rightEyeBlind;
  const progressRatio = Math.max(0, Math.min(1, stageInfo.progressPercent / 100));
  const tipLeftPercent = Math.max(1.5, Math.min(99.5, progressRatio * 100));

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-xl transition-colors duration-500',
        isTsukuyomiMode
          ? 'border-t border-t-red-500/25 border-b border-b-red-950/80 bg-gradient-to-b from-[#0E0507]/95 via-[#060203]/98 to-[#000000]/98 shadow-[inset_0_1px_0_0_rgba(239,68,68,0.12),0_25px_50px_-12px_rgba(0,0,0,0.95)]'
          : 'border-t border-t-white/[0.08] border-b border-b-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)]',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 lg:px-6 lg:py-3">
        {/* Brand Title */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            aria-hidden="true"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border backdrop-blur-xl transition-colors sm:h-9 sm:w-9',
              isTsukuyomiMode
                ? 'border-red-500/40 bg-black shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_18px_rgba(239,68,68,0.28)]'
                : 'border-red-900/60 bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_12px_rgba(127,29,29,0.35)]',
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="truncate font-display text-xs font-semibold tracking-[0.18em] text-zinc-100 uppercase sm:text-base sm:tracking-[0.22em]">
                Tsukuyomi
              </span>
              <span className="hidden rounded border border-red-900/60 bg-red-950/35 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-red-400 uppercase sm:inline-block">
                Focus
              </span>
            </div>
            <p className="truncate text-[10px] font-medium tracking-wide text-zinc-400 lg:hidden">
              {stageInfo.currentDefinition.name} ·{' '}
              <span className="font-mono text-zinc-300 tabular-nums">
                {chakra.toLocaleString('pt-BR')} XP
              </span>
            </p>
            <p className="hidden text-[11px] tracking-wide text-zinc-500 lg:block">
              Santuário Naka · Disciplina Ocular Uchiha
            </p>
          </div>
        </div>

        {/* Center: EyeStage Badge + Liquid Chakra Progress (Desktop) */}
        <div className="hidden lg:flex lg:min-w-[290px] lg:items-center lg:gap-3">
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

            <div className="relative w-full py-0.5">
              <div
                className="relative h-1.5 w-full overflow-hidden rounded-full border border-white/[0.06] bg-zinc-900/95 shadow-inner"
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
                  style={{
                    transformOrigin: 'left',
                    willChange: 'transform',
                    backgroundSize: '200% 100%',
                    backgroundImage:
                      'linear-gradient(90deg, #7F1D1D 0%, #DC2626 25%, #EF4444 45%, #FECACA 50%, #EF4444 55%, #DC2626 75%, #7F1D1D 100%)',
                  }}
                  className={cn(
                    'h-full w-full rounded-full',
                    !prefersReducedMotion && 'animate-chakra-flow',
                  )}
                />
              </div>

              {/* Leading right tip crimson/white spark & particle emitter */}
              <motion.div
                aria-hidden="true"
                initial={false}
                animate={{
                  left: `${tipLeftPercent}%`,
                  opacity: progressRatio > 0 || sparkState.active ? 1 : 0,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 160, damping: 24 }
                }
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.span
                  animate={
                    prefersReducedMotion || progressRatio <= 0
                      ? undefined
                      : {
                          scale: [0.9, 1.3, 0.9],
                          opacity: [0.85, 1, 0.85],
                        }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : {
                          duration: 1.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          type: 'tween',
                        }
                  }
                  className="block h-2 w-2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(239,68,68,0.95),0_0_4px_1px_rgba(255,255,255,0.95)]"
                />

                <AnimatePresence>
                  {sparkState.active && !prefersReducedMotion ? (
                    <motion.div
                      key={`chakra-spark-burst-${sparkState.nonce}`}
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.65,
                        ease: 'easeOut',
                        type: 'tween',
                      }}
                      onAnimationComplete={() =>
                        setSparkState((curr) =>
                          curr.nonce === sparkState.nonce
                            ? { ...curr, active: false }
                            : curr,
                        )
                      }
                      className="pointer-events-none absolute left-1/2 top-1/2"
                    >
                      {CHAKRA_SPARK_VECTORS.map((spark) => (
                        <motion.span
                          key={spark.id}
                          initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                          animate={{
                            x: spark.dx,
                            y: spark.dy,
                            scale: [0.5, 1.25, 0],
                            opacity: [1, 0.9, 0],
                          }}
                          transition={{
                            duration: 0.58,
                            ease: [0.16, 1, 0.3, 1],
                            type: 'tween',
                          }}
                          style={{
                            width: spark.size,
                            height: spark.size,
                          }}
                          className={cn(
                            'absolute -left-0.5 -top-0.5 rounded-full',
                            spark.isWhite
                              ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.95),0_0_12px_rgba(239,68,68,0.85)]'
                              : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.95)]',
                          )}
                        />
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
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
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {/* Mobile/Tablet Quick Chakra Pill */}
          <div
            title={`${stageInfo.currentDefinition.name} · ${chakra.toLocaleString('pt-BR')} Chakra`}
            className={cn(
              'hidden items-center gap-1 rounded-lg px-2 py-1 text-xs sm:flex lg:hidden',
              OBSIDIAN_CHIP_CLASS,
            )}
          >
            <Sparkles className="h-3 w-3 text-red-500" aria-hidden="true" />
            <span className="font-mono font-medium text-zinc-200 tabular-nums">
              {chakra.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Streak Counter Chip */}
          <div
            title={`Ofensiva atual: ${streak} dia(s) · Recorde: ${longestStreak} dia(s)`}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs sm:gap-1.5 sm:px-2.5',
              OBSIDIAN_CHIP_CLASS,
            )}
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

          {/* Left & Right Izanagi Eye Indicators with interactive tooltip (hidden on < md) */}
          <div className="group relative hidden md:block">
            <button
              type="button"
              onMouseEnter={() => audioEngine.playHover()}
              aria-label={`Olhos do Izanagi. Esquerdo ${
                izanagi.leftEyeBlind ? 'cego' : 'ativo'
              }, Direito ${
                izanagi.rightEyeBlind ? 'cego' : 'ativo'
              }. Progresso de restauração: ${
                izanagi.restorationProgressMinutes
              } de ${IZANAGI_RESTORATION_MINUTES} minutos.`}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                OBSIDIAN_CHIP_CLASS,
              )}
            >
              <IzanagiEyeGlyph
                side="left"
                isBlind={izanagi.leftEyeBlind}
                prefersReducedMotion={prefersReducedMotion}
              />
              <IzanagiEyeGlyph
                side="right"
                isBlind={izanagi.rightEyeBlind}
                prefersReducedMotion={prefersReducedMotion}
              />
            </button>

            <div
              role="tooltip"
              className={cn(
                'pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-60 rounded-xl p-3 text-xs opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100',
                OBSIDIAN_CHIP_CLASS,
              )}
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
              <div className="mt-2 border-t border-white/[0.06] pt-2">
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

          {/* Visual Acuity Badge (hidden on < md) */}
          <div
            title={`Acuidade Visual: ${acuityPercent}% (nível de desgaste ${visualBlurLevel}/3)`}
            className={cn(
              'hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs md:flex',
              acuityPercent === 100
                ? cn(OBSIDIAN_CHIP_CLASS, 'text-zinc-300')
                : 'border border-red-900/60 bg-gradient-to-b from-red-950/50 via-[#160507]/95 to-[#090304]/98 text-red-300 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] hover:border-red-500/40 transition-colors',
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
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => toggleTsukuyomiMode()}
            aria-pressed={isTsukuyomiMode}
            aria-label={
              isTsukuyomiMode
                ? 'Desativar Modo Tsukuyomi'
                : 'Ativar Modo Tsukuyomi'
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
              isTsukuyomiMode
                ? 'border border-red-500/70 bg-gradient-to-b from-red-950/65 via-[#1C0508]/95 to-[#0A0203]/98 text-red-300 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_20px_rgba(239,68,68,0.28)] hover:border-red-400/80 transition-colors'
                : cn(OBSIDIAN_CHIP_CLASS, 'text-zinc-300 hover:text-zinc-100'),
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
