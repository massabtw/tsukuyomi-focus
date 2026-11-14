'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Check, Flame, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { CustomEyeUploader } from '@/components/evolution/CustomEyeUploader';
import { DevSimulatorBar } from '@/components/evolution/DevSimulatorBar';
import {
  EYE_STAGES,
  EYE_STAGE_MAP,
  MANGEKYOU_VARIANTS,
} from '@/constants/evolution';
import { useAwwwardsParallax } from '@/hooks/useAwwwardsParallax';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import {
  getNextEyeStageInfo,
  isEyeStageUnlocked,
} from '@/lib/gamification';
import {
  useOcularProfile,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { EyeStage, MangekyouVariant } from '@/types/tsukuyomi';

const MICRO_SPRING = {
  type: 'spring',
  stiffness: 340,
  damping: 24,
} as const;

const FLASH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function NakaShrineView() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const shrineRef = useRef<HTMLDivElement | null>(null);

  const {
    chakra,
    currentEyeStage,
    equippedEyeStage,
    mangekyouVariant,
    customEye,
    longestStreak,
    isBetaFullAccess,
  } = useOcularProfile();

  const equipEyeStage = useTsukuyomiStore((state) => state.equipEyeStage);
  const setMangekyouVariant = useTsukuyomiStore(
    (state) => state.setMangekyouVariant,
  );

  const [stageFlash, setStageFlash] = useState<{
    stage: EyeStage;
    nonce: number;
  } | null>(null);
  const [variantFlash, setVariantFlash] = useState<{
    variant: MangekyouVariant;
    nonce: number;
  } | null>(null);

  // Camera-descent scroll parallax: background stone tablet descends slower/positively while foreground rises subtly
  const { scrollYProgress } = useScroll({
    target: shrineRef,
    offset: ['start end', 'end start'],
  });
  const bgStoneY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '18%'],
  );
  const fgContentY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '-6%'],
  );

  // 4-layer cursor parallax for the Naka Altar showcase (MotionValues only, zero useState)
  const altarParallax = useAwwwardsParallax(0.85);

  const nextStageInfo = getNextEyeStageInfo(
    currentEyeStage,
    chakra,
    longestStreak,
  );
  const equippedDef = EYE_STAGE_MAP[equippedEyeStage];
  const isMangekyouLoreUnlocked = isEyeStageUnlocked(
    'mangekyou',
    chakra,
    longestStreak,
    false,
  );
  const isMangekyouUnlocked = isEyeStageUnlocked(
    'mangekyou',
    chakra,
    longestStreak,
    isBetaFullAccess,
  );

  function handleSelectEyeStage(stage: EyeStage) {
    setStageFlash((prev) => ({
      stage,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    // equipEyeStage plays audioEngine.play('mangekyou-awaken') in the store
    equipEyeStage(stage);
  }

  function handleSelectMangekyouVariant(variant: MangekyouVariant) {
    setVariantFlash((prev) => ({
      variant,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    // setMangekyouVariant plays audioEngine.play('mangekyou-awaken') in the store
    setMangekyouVariant(variant);
  }

  return (
    <div
      ref={shrineRef}
      className="relative mx-auto w-full max-w-6xl space-y-10 pb-16 pt-2"
    >
      {/* Stone Tablet Background Layer (Plano -2 / -1) */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgStoneY }}
        className="will-change-transform pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10 overflow-hidden rounded-3xl border border-zinc-900/90 bg-gradient-to-b from-[#09090B] via-[#0c0c10] to-[#050507]"
      >
        {/* Static feTurbulence stone micro-texture (opacity 0.03) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <filter id="naka-tablet-stone-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#naka-tablet-stone-noise)"
          />
        </svg>

        {/* Subtle Uchiha Shrine seal geometry & radial crimson depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(127,29,29,0.20),transparent_58%)]" />
        <div className="mx-auto mt-12 h-px w-3/4 bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
      </motion.div>

      {/* Foreground Camera-Descent Container */}
      <motion.div
        style={{ y: fgContentY }}
        className="will-change-transform space-y-10 px-1 sm:px-2"
      >
        {/* Shrine Hero Altar */}
        <section
          aria-labelledby="naka-shrine-heading"
          className="obsidian-surface-crimson relative overflow-hidden rounded-2xl p-6 sm:p-8"
          style={{ perspective: 1200 }}
          {...altarParallax.handlers}
        >
          <motion.div
            aria-hidden="true"
            style={altarParallax.layerBg}
            className="will-change-transform pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.18)_0%,transparent_70%)]"
          />

          <motion.div
            style={
              prefersReducedMotion
                ? undefined
                : {
                    rotateX: altarParallax.rotateX,
                    rotateY: altarParallax.rotateY,
                  }
            }
            className="will-change-transform relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
          >
            {/* Active Eye Display (Plano +1) */}
            <div className="flex flex-col items-center justify-center lg:col-span-4">
              <motion.div
                style={altarParallax.layerFg}
                className="will-change-transform relative flex h-44 w-44 items-center justify-center rounded-full border border-red-950/80 bg-black p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
              >
                {customEye.enabled && customEye.imageDataUrl ? (
                  <div
                    className="relative h-full w-full overflow-hidden rounded-full bg-black"
                    style={{
                      boxShadow: `0 0 ${Math.round(customEye.glowIntensity * 26)}px rgba(220, 38, 38, ${(0.18 + customEye.glowIntensity * 0.6).toFixed(2)}), inset 0 0 24px #000000`,
                    }}
                  >
                    <Image
                      src={customEye.imageDataUrl}
                      alt="Olho customizado equipado no Santuário Naka"
                      fill
                      unoptimized
                      className="object-cover"
                      style={{ transform: `scale(${customEye.scale})` }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{ boxShadow: 'inset 0 0 24px #000000' }}
                    />
                  </div>
                ) : (
                  <SharinganSvg
                    stage={equippedEyeStage}
                    variant={mangekyouVariant}
                    className="h-36 w-36 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                  />
                )}
              </motion.div>
              <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                {customEye.enabled && customEye.imageDataUrl
                  ? 'Olho Customizado Ativo'
                  : equippedDef.name}
              </span>
            </div>

            {/* Shrine Telemetry & Next Stage Progress */}
            <div className="space-y-5 lg:col-span-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-red-400">
                  Santuário Naka • Subterrâneo Uchiha
                </p>
                <h1
                  id="naka-shrine-heading"
                  className="mt-1.5 font-display text-2xl font-bold tracking-wide text-zinc-50 sm:text-3xl"
                >
                  Tábua de Pedra Uchiha
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Decifre os sete estágios oculares através do Chakra forjado em
                  foco profundo. Apenas a disciplina contínua rompe o selo do
                  Mangekyou ao Rinnegan.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <motion.div
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={MICRO_SPRING}
                  onMouseEnter={() => audioEngine.playHover()}
                  className="will-change-transform rounded-xl border border-zinc-800/90 bg-[#09090B]/85 px-4 py-3 transition-colors hover:border-red-900/60"
                >
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Chakra Acumulado
                  </span>
                  <p className="mt-1 font-mono tabular-nums text-xl font-bold text-zinc-50">
                    {chakra.toLocaleString('pt-BR')}
                  </p>
                </motion.div>

                <motion.div
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={MICRO_SPRING}
                  onMouseEnter={() => audioEngine.playHover()}
                  className="will-change-transform rounded-xl border border-zinc-800/90 bg-[#09090B]/85 px-4 py-3 transition-colors hover:border-red-900/60"
                >
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Estágio Máximo
                  </span>
                  <p className="mt-1 text-sm font-semibold text-red-400">
                    {EYE_STAGE_MAP[currentEyeStage].name}
                  </p>
                </motion.div>

                <motion.div
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -3, scale: 1.01 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={MICRO_SPRING}
                  onMouseEnter={() => audioEngine.playHover()}
                  className="will-change-transform rounded-xl border border-zinc-800/90 bg-[#09090B]/85 px-4 py-3 transition-colors hover:border-red-900/60"
                >
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Recorde de Ofensiva
                  </span>
                  <p className="mt-1 flex items-center gap-1.5 font-mono tabular-nums text-xl font-bold text-zinc-100">
                    <Flame
                      className="h-4 w-4 text-red-500"
                      aria-hidden="true"
                    />
                    <span>{longestStreak}d</span>
                  </p>
                </motion.div>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-[#09090B]/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-300">
                    {nextStageInfo.isMaxed || !nextStageInfo.nextDefinition
                      ? 'Tábua de Pedra totalmente decifrada (Rinnegan).'
                      : `Próximo selo: ${nextStageInfo.nextDefinition.name}`}
                  </span>
                  <span className="font-mono tabular-nums text-red-400">
                    {nextStageInfo.isMaxed
                      ? '100%'
                      : `${nextStageInfo.progressPercent}% • faltam ${nextStageInfo.chakraRemaining.toLocaleString('pt-BR')} Chakra`}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={nextStageInfo.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso de Chakra para o próximo estágio ocular"
                  className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-900"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-[width] duration-500"
                    style={{ width: `${nextStageInfo.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 7-Stage Uchiha Stone Tablet */}
        <section
          aria-labelledby="stone-tablet-stages-heading"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="stone-tablet-stages-heading"
                className="font-display text-xl font-semibold tracking-wide text-zinc-100"
              >
                Os Sete Selos Oculares
              </h2>
              <p className="text-sm text-zinc-400">
                Equipe qualquer estágio já despertado para projetá-lo no Relógio
                Ocular.
              </p>
            </div>
            {customEye.enabled && customEye.imageDataUrl ? (
              <span className="rounded-full border border-red-900/70 bg-red-950/35 px-3 py-1 text-xs text-red-300">
                Olho Customizado sobrepõe o vetor no Templo
              </span>
            ) : null}
          </div>

          <div className="relative space-y-3">
            {/* Etched vertical conduit */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-9 top-6 hidden w-px bg-gradient-to-b from-red-900/70 via-zinc-800 to-red-950/40 md:block"
            />

            {EYE_STAGES.map((def, idx) => {
              const loreUnlocked = isEyeStageUnlocked(
                def.stage,
                chakra,
                longestStreak,
                false,
              );
              const unlocked = isEyeStageUnlocked(
                def.stage,
                chakra,
                longestStreak,
                isBetaFullAccess,
              );
              const unlockedViaBeta = unlocked && !loreUnlocked;
              const isEquipped = equippedEyeStage === def.stage;
              const unlockedViaStreak =
                loreUnlocked &&
                def.alternativeStreakRequirement !== undefined &&
                longestStreak >= def.alternativeStreakRequirement &&
                chakra < def.requiredChakra;
              const isFlashing = stageFlash?.stage === def.stage;

              return (
                <motion.article
                  key={def.stage}
                  whileHover={
                    unlocked && !prefersReducedMotion
                      ? { y: -3, scale: 1.01 }
                      : undefined
                  }
                  whileTap={
                    unlocked && !prefersReducedMotion
                      ? { scale: 0.98 }
                      : undefined
                  }
                  transition={MICRO_SPRING}
                  onMouseEnter={() => {
                    if (unlocked) {
                      audioEngine.playHover();
                    }
                  }}
                  className={cn(
                    'will-change-transform relative flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-5',
                    isEquipped
                      ? 'obsidian-surface-crimson border-red-600/70'
                      : unlocked
                        ? 'obsidian-surface border-zinc-800/90 hover:border-red-900/60'
                        : 'border-zinc-900 bg-[#09090B]/70 opacity-75',
                  )}
                >
                  {/* Ocular flash ring animation on newly selected card */}
                  <AnimatePresence>
                    {isFlashing && !prefersReducedMotion && (
                      <motion.span
                        key={`stage-card-flash-${stageFlash.nonce}`}
                        aria-hidden="true"
                        initial={{ opacity: 0.9, scale: 0.99 }}
                        animate={{ opacity: 0, scale: 1.02 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: FLASH_EASE }}
                        onAnimationComplete={() =>
                          setStageFlash((curr) =>
                            curr?.nonce === stageFlash.nonce ? null : curr,
                          )
                        }
                        className="pointer-events-none absolute -inset-px rounded-2xl border-2 border-[#EF4444] shadow-[0_0_28px_rgba(220,38,38,0.55)] will-change-transform"
                      />
                    )}
                  </AnimatePresence>

                  <div className="flex items-start gap-4 sm:items-center">
                    {/* Eye preview wrapper */}
                    <div
                      className={cn(
                        'relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-black p-1.5',
                        unlocked
                          ? 'border-red-900/80 shadow-[0_0_16px_rgba(220,38,38,0.28)]'
                          : 'border-zinc-800 grayscale',
                      )}
                    >
                      <SharinganSvg
                        stage={def.stage}
                        variant={mangekyouVariant}
                        className="h-full w-full"
                      />

                      <AnimatePresence>
                        {isFlashing && !prefersReducedMotion && (
                          <motion.span
                            key={`stage-eye-ring-${stageFlash.nonce}`}
                            aria-hidden="true"
                            initial={{ opacity: 0.95, scale: 0.85 }}
                            animate={{ opacity: 0, scale: 1.48 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.65, ease: FLASH_EASE }}
                            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.8)] will-change-transform"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums text-[11px] font-semibold text-zinc-500">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-base font-semibold text-zinc-100 sm:text-lg">
                          {def.name}
                        </h3>
                        {isEquipped ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/60 bg-red-950/60 px-2.5 py-0.5 text-[11px] font-medium text-red-200">
                              <Check className="h-3 w-3" aria-hidden="true" />
                              Equipado
                            </span>
                            {unlockedViaBeta && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-900/60 bg-red-950/35 px-2 py-0.5 text-[10px] font-medium text-red-300/90">
                                Beta Liberado
                              </span>
                            )}
                          </>
                        ) : unlocked ? (
                          unlockedViaBeta ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-900/60 bg-red-950/35 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
                              <Sparkles
                                className="h-3 w-3 text-red-400"
                                aria-hidden="true"
                              />
                              Beta Liberado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                              <ShieldCheck
                                className="h-3 w-3 text-red-400"
                                aria-hidden="true"
                              />
                              {unlockedViaStreak
                                ? 'Despertado por Ofensiva'
                                : 'Despertado'}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Selado
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium uppercase tracking-wider text-red-400/90">
                        {def.subtitle}
                      </p>
                      <p className="max-w-2xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
                        {def.lore}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-4 border-t border-zinc-800/70 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-mono tabular-nums text-sm font-semibold text-zinc-200">
                        {def.requiredChakra.toLocaleString('pt-BR')} Chakra
                      </p>
                      <p className="font-mono tabular-nums text-[11px] text-zinc-500">
                        ~{def.estimatedHours}h de foco
                        {def.alternativeStreakRequirement !== undefined
                          ? ` • ou ${def.alternativeStreakRequirement}d seguidos`
                          : ''}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      disabled={
                        isBetaFullAccess ? isEquipped : !unlocked || isEquipped
                      }
                      whileHover={
                        unlocked && !isEquipped && !prefersReducedMotion
                          ? { y: -2, scale: 1.02 }
                          : undefined
                      }
                      whileTap={
                        unlocked && !isEquipped && !prefersReducedMotion
                          ? { scale: 0.98 }
                          : undefined
                      }
                      transition={MICRO_SPRING}
                      onMouseEnter={() => {
                        if (unlocked && !isEquipped) {
                          audioEngine.playHover();
                        }
                      }}
                      onClick={() => handleSelectEyeStage(def.stage)}
                      className={cn(
                        'will-change-transform shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                        isEquipped
                          ? 'cursor-default border border-red-800/60 bg-red-950/40 text-red-200'
                          : unlocked
                            ? 'border border-red-600/80 bg-red-600 text-white hover:bg-red-500'
                            : 'cursor-not-allowed border border-zinc-800 bg-zinc-900/70 text-zinc-600',
                      )}
                    >
                      {isEquipped
                        ? 'Em Uso'
                        : unlocked
                          ? 'Equipar Olho'
                          : 'Bloqueado'}
                    </motion.button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* 5-Variant Mangekyou Selector */}
        <section
          aria-labelledby="mangekyou-variants-heading"
          className="obsidian-surface rounded-2xl border border-zinc-800/90 border-t-white/[0.08] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Linhagens do Mangekyou Sharingan</span>
              </div>
              <h2
                id="mangekyou-variants-heading"
                className="mt-1 font-display text-xl font-semibold tracking-wide text-zinc-50"
              >
                Seletor de Padrão Mangekyou
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Escolha o selo caleidoscópico exibido nos estágios Mangekyou e
                Mangekyou Eterno.
              </p>
            </div>
            {!isMangekyouUnlocked ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-zinc-800 bg-[#09090B] px-3 py-1 font-mono tabular-nums text-xs text-zinc-400">
                <Lock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                Desbloqueia com 24.000 Chakra ou 7d seguidos
              </span>
            ) : !isMangekyouLoreUnlocked ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-red-900/60 bg-red-950/35 px-3 py-1 font-mono tabular-nums text-xs text-red-300">
                <Sparkles
                  className="h-3.5 w-3.5 text-red-400"
                  aria-hidden="true"
                />
                Beta Liberado • Lore: 24.000 Chakra ou 7d
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MANGEKYOU_VARIANTS.map((info) => {
              const isSelected = mangekyouVariant === info.variant;
              const isFlashing = variantFlash?.variant === info.variant;

              return (
                <motion.button
                  key={info.variant}
                  type="button"
                  disabled={isBetaFullAccess ? false : !isMangekyouUnlocked}
                  whileHover={
                    isMangekyouUnlocked && !prefersReducedMotion
                      ? { y: -3, scale: 1.01 }
                      : undefined
                  }
                  whileTap={
                    isMangekyouUnlocked && !prefersReducedMotion
                      ? { scale: 0.98 }
                      : undefined
                  }
                  transition={MICRO_SPRING}
                  onMouseEnter={() => {
                    if (isMangekyouUnlocked) {
                      audioEngine.playHover();
                    }
                  }}
                  onClick={() => handleSelectMangekyouVariant(info.variant)}
                  aria-pressed={isSelected}
                  className={cn(
                    'will-change-transform group relative flex flex-col items-center rounded-xl border p-4 text-center transition-colors',
                    isSelected
                      ? 'border-red-600/80 bg-red-950/25 shadow-[0_0_24px_rgba(220,38,38,0.2)]'
                      : isMangekyouUnlocked
                        ? 'border-zinc-800 bg-[#09090B]/80 hover:border-red-900/70 hover:bg-[#121215]'
                        : 'cursor-not-allowed border-zinc-900 bg-[#09090B]/40 opacity-55',
                  )}
                >
                  {/* Card-level Ocular Flash Ring */}
                  <AnimatePresence>
                    {isFlashing && !prefersReducedMotion && (
                      <motion.span
                        key={`variant-card-flash-${variantFlash.nonce}`}
                        aria-hidden="true"
                        initial={{ opacity: 0.9, scale: 0.97 }}
                        animate={{ opacity: 0, scale: 1.04 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: FLASH_EASE }}
                        onAnimationComplete={() =>
                          setVariantFlash((curr) =>
                            curr?.nonce === variantFlash.nonce ? null : curr,
                          )
                        }
                        className="pointer-events-none absolute -inset-px rounded-xl border-2 border-[#EF4444] shadow-[0_0_26px_rgba(220,38,38,0.55)] will-change-transform"
                      />
                    )}
                  </AnimatePresence>

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-black p-1.5 transition-transform duration-300 group-hover:scale-105">
                    <SharinganSvg
                      stage="mangekyou"
                      variant={info.variant}
                      className="h-full w-full"
                    />
                    <AnimatePresence>
                      {isFlashing && !prefersReducedMotion && (
                        <motion.span
                          key={`variant-eye-ring-${variantFlash.nonce}`}
                          aria-hidden="true"
                          initial={{ opacity: 0.95, scale: 0.82 }}
                          animate={{ opacity: 0, scale: 1.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.65, ease: FLASH_EASE }}
                          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#EF4444] shadow-[0_0_22px_rgba(239,68,68,0.85)] will-change-transform"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="mt-3 text-sm font-semibold text-zinc-100">
                    {info.wielder}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium text-red-400">
                    {info.jutsuName}
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {info.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Custom AI / Image Uploader */}
        <CustomEyeUploader />

        {/* Discreet Dev Simulator Footer */}
        <DevSimulatorBar />
      </motion.div>
    </div>
  );
}
