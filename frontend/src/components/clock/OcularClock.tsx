'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import { Flame, Shield } from 'lucide-react';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { SusanooAura } from '@/components/clock/SusanooAura';
import { EYE_STAGE_MAP, MANGEKYOU_VARIANT_MAP } from '@/constants/evolution';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { useAwwwardsParallax } from '@/hooks/useAwwwardsParallax';
import { cn } from '@/lib/cn';
import { formatTimerClock } from '@/lib/date';
import {
  useIsTsukuyomiMode,
  useOcularProfile,
  useTimerCore,
  useTimerRemaining,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

const RING_RADIUS = 146;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MODE_LABELS = {
  focus: 'Tsukuyomi',
  short_break: 'Repouso Curto',
  long_break: 'Repouso Longo',
} as const;

export function OcularClock() {
  const prefersReducedMotion = useReducedMotion();
  const remainingSeconds = useTimerRemaining();
  const { status, mode, durationSeconds, activeMissionId, susanooEnabled } =
    useTimerCore();
  const { equippedEyeStage, mangekyouVariant, customEye } = useOcularProfile();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const activeMission = useTsukuyomiStore(
    (state) =>
      state.missions.find((m) => m.id === activeMissionId) ?? null,
  );

  const parallax = useAwwwardsParallax(1);

  const [awakeningScope, animateAwakening] = useAnimate();
  const prevStatusRef = useRef(status);

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isFocus = mode === 'focus';
  const isUrgent =
    isRunning && isFocus && remainingSeconds <= 60 && remainingSeconds > 0;

  const safeDuration = Math.max(1, durationSeconds);
  const elapsedSeconds = Math.max(0, safeDuration - remainingSeconds);
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / safeDuration));
  const progressPercent = Math.round(progressRatio * 100);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progressRatio);
  const isAwakening = isRunning && elapsedSeconds <= 3;

  useEffect(() => {
    const wasRunning = prevStatusRef.current === 'running';
    prevStatusRef.current = status;

    if (!wasRunning && status === 'running' && !prefersReducedMotion) {
      void (async () => {
        if (!awakeningScope.current) return;
        await animateAwakening(
          awakeningScope.current,
          { scale: 1.08 },
          { type: 'spring', stiffness: 320, damping: 16 },
        );
        if (!awakeningScope.current) return;
        await animateAwakening(
          awakeningScope.current,
          { scale: 1 },
          { type: 'spring', stiffness: 220, damping: 22 },
        );
      })();
    }
  }, [status, prefersReducedMotion, animateAwakening, awakeningScope]);

  const useCustomImage = Boolean(customEye.enabled && customEye.imageDataUrl);
  const effectiveGlow = useCustomImage
    ? Math.min(1, customEye.glowIntensity + (isUrgent ? 0.25 : 0))
    : isUrgent
      ? 0.85
      : isRunning
        ? 0.5
        : 0.28;

  const eyeDropShadow =
    equippedEyeStage === 'rinnegan' && !useCustomImage
      ? `0 0 ${isUrgent ? 28 : 18}px rgba(139, 92, 246, ${effectiveGlow})`
      : `0 0 ${isUrgent ? 34 : 20}px rgba(220, 38, 38, ${effectiveGlow})`;

  const stageInfo = EYE_STAGE_MAP[equippedEyeStage];
  const rankDef = activeMission ? RANK_DEFINITIONS[activeMission.rank] : null;
  const susanooActive = susanooEnabled && isFocus;

  return (
    <div
      className="relative flex flex-col items-center justify-center py-4 select-none"
      style={{ perspective: 1200 }}
      {...parallax.handlers}
    >
      {/* Interactive 4-Layer Stage */}
      <div className="relative flex h-[320px] w-[320px] items-center justify-center sm:h-[370px] sm:w-[370px]">
        {/* Plano -2: Abyss & Controlled Crimson Radial Halo */}
        <motion.div
          style={{ x: parallax.layerBg.x, y: parallax.layerBg.y }}
          className="pointer-events-none absolute -inset-8 rounded-full will-change-transform"
        >
          <div
            className="h-full w-full rounded-full transition-opacity duration-700"
            style={{
              background: isUrgent
                ? 'radial-gradient(circle at center, rgba(220, 38, 38, 0.26) 0%, rgba(127, 29, 29, 0.1) 42%, rgba(0, 0, 0, 0) 70%)'
                : isRunning || isTsukuyomiMode
                  ? 'radial-gradient(circle at center, rgba(153, 27, 27, 0.18) 0%, rgba(69, 10, 10, 0.06) 45%, rgba(0, 0, 0, 0) 70%)'
                  : 'radial-gradient(circle at center, rgba(127, 29, 29, 0.1) 0%, rgba(0, 0, 0, 0) 68%)',
            }}
          />
        </motion.div>

        {/* Plano -1: Susanoo Aura / Ritual Architecture */}
        <motion.div
          style={{ x: parallax.layerMid.x, y: parallax.layerMid.y }}
          className="pointer-events-none absolute -inset-12 flex items-center justify-center will-change-transform sm:-inset-14"
        >
          <SusanooAura
            progress={progressPercent}
            enabled={susanooActive}
            isRunning={isRunning}
            className="h-full w-full"
          />
        </motion.div>

        {/* Plano 0: Obsidian Ring Surface & Circular Progress SVG */}
        <motion.div
          style={{
            rotateX: parallax.rotateX,
            rotateY: parallax.rotateY,
            transformStyle: 'preserve-3d',
          }}
          className="relative flex h-full w-full items-center justify-center rounded-full will-change-transform"
        >
          <div
            className={cn(
              'absolute inset-3 rounded-full border border-zinc-800/90 border-t-white/[0.08] bg-[#09090B]/90 shadow-[0_24px_60px_rgba(0,0,0,0.95)]',
              isUrgent && 'border-red-600/50',
              susanooActive && 'border-red-500/35',
            )}
          />

          <svg
            viewBox="0 0 320 320"
            aria-hidden="true"
            className="pointer-events-none relative z-10 h-full w-full"
          >
            {/* Subtle Horological Tick Marks */}
            <g stroke="#27272A" strokeWidth="1.5">
              {Array.from({ length: 24 }, (_, idx) => {
                const angle = idx * 15;
                const isCardinal = idx % 6 === 0;
                return (
                  <line
                    key={angle}
                    x1="160"
                    y1={isCardinal ? 22 : 25}
                    x2="160"
                    y2="30"
                    stroke={isCardinal ? '#52525B' : '#27272A'}
                    transform={`rotate(${angle} 160 160)`}
                  />
                );
              })}
            </g>

            {/* Base Progress Track */}
            <circle
              cx="160"
              cy="160"
              r={RING_RADIUS}
              fill="none"
              stroke="#27272A"
              strokeWidth="4.5"
            />

            {/* Active Crimson Progress Arc */}
            <circle
              cx="160"
              cy="160"
              r={RING_RADIUS}
              fill="none"
              stroke={isUrgent ? '#EF4444' : '#DC2626'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 160 160)"
              style={{
                transition: 'stroke-dashoffset 280ms linear, stroke 300ms ease',
                filter: isRunning
                  ? 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.7))'
                  : 'none',
              }}
            />
          </svg>

          {/* Plano +1: Ocular Core (Sharingan SVG or Custom IA Image) */}
          <motion.div
            style={{ x: parallax.layerFg.x, y: parallax.layerFg.y }}
            className="absolute z-20 flex h-[216px] w-[216px] items-center justify-center will-change-transform sm:h-[250px] sm:w-[250px]"
          >
            {/* 2-state Spring Awakening Pulse Wrapper */}
            <div
              ref={awakeningScope}
              className="h-full w-full will-change-transform"
            >
              {/* Cyclic Breathing Tween Wrapper ([1, 1.025, 1] strictly tween) */}
              <motion.div
                className="h-full w-full will-change-transform"
                animate={
                  prefersReducedMotion
                    ? { scale: 1 }
                    : { scale: [1, 1.025, 1] }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'tween',
                        ease: 'easeInOut',
                        duration: isUrgent ? 1.5 : 3.8,
                        repeat: Infinity,
                      }
                }
              >
                {/* Continuous 60fps Rotation Tween Wrapper */}
                <motion.div
                  className="h-full w-full rounded-full will-change-transform"
                  style={{ filter: `drop-shadow(${eyeDropShadow})` }}
                  animate={
                    prefersReducedMotion || isPaused
                      ? { rotate: 0 }
                      : { rotate: 360 }
                  }
                  transition={
                    prefersReducedMotion || isPaused
                      ? { duration: 0.3 }
                      : {
                          type: 'tween',
                          ease: 'linear',
                          duration: isUrgent ? 6 : 30,
                          repeat: Infinity,
                        }
                  }
                >
                  {useCustomImage && customEye.imageDataUrl ? (
                    <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-[#09090B] bg-black">
                      <Image
                        src={customEye.imageDataUrl}
                        alt="Sharingan customizado"
                        fill
                        unoptimized
                        className="object-cover"
                        style={{
                          transform: `scale(${customEye.scale})`,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{
                          boxShadow: 'inset 0 0 24px #000000',
                        }}
                      />
                    </div>
                  ) : (
                    <SharinganSvg
                      stage={equippedEyeStage}
                      variant={mangekyouVariant}
                      isAwakening={isAwakening}
                      isUrgent={isUrgent}
                    />
                  )}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Digital Readout & Active Mission Context */}
      <div className="relative z-30 mt-3 flex flex-col items-center text-center">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-zinc-400 uppercase">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              isRunning
                ? 'bg-red-500 shadow-[0_0_8px_#EF4444]'
                : isPaused
                  ? 'bg-zinc-400'
                  : 'bg-zinc-600',
            )}
          />
          <span>{MODE_LABELS[mode]}</span>
          {susanooActive && (
            <span className="inline-flex items-center gap-1 rounded border border-red-500/35 bg-red-950/40 px-1.5 py-0.5 text-[10px] tracking-wider text-red-400">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Susano&apos;o
            </span>
          )}
        </div>

        <time
          dateTime={`PT${remainingSeconds}S`}
          aria-live="off"
          className={cn(
            'font-mono text-5xl font-semibold tracking-tight tabular-nums transition-colors sm:text-6xl',
            isUrgent
              ? 'text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.55)]'
              : 'text-zinc-50',
          )}
        >
          {formatTimerClock(remainingSeconds)}
        </time>

        <p className="mt-1 text-xs text-zinc-400">
          {stageInfo.name}
          {equippedEyeStage === 'mangekyou' &&
            ` · ${MANGEKYOU_VARIANT_MAP[mangekyouVariant].wielder}`}
        </p>

        {/* Active Mission Badge */}
        <div className="mt-3 flex max-w-md flex-wrap items-center justify-center gap-2 rounded-lg border border-zinc-800 border-t-white/[0.07] bg-[#121215]/90 px-3.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
          {activeMission && rankDef ? (
            <>
              <span
                className="rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase"
                style={{
                  color: rankDef.badgeColor,
                  borderColor: rankDef.borderColor,
                }}
              >
                Rank {activeMission.rank}
              </span>
              {activeMission.isAmaterasu && (
                <span className="inline-flex items-center gap-1 rounded border border-red-600/60 bg-black px-1.5 py-0.5 text-[10px] font-medium text-red-400 shadow-[0_0_8px_rgba(220,38,38,0.45)]">
                  <Flame className="h-3 w-3 text-red-500" aria-hidden="true" />
                  Amaterasu 2x
                </span>
              )}
              <span className="max-w-[260px] truncate text-sm font-medium text-zinc-100">
                {activeMission.title}
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-400">
              Treino Livre no Tsukuyomi · Rank D (1.0x)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
