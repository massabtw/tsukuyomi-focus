'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import Image from 'next/image';
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { Shield } from 'lucide-react';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { SusanooAura } from '@/components/clock/SusanooAura';
import { useAwwwardsParallax } from '@/hooks/useAwwwardsParallax';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { formatTimerClock } from '@/lib/date';
import {
  useIsTsukuyomiMode,
  useOcularProfile,
  useOcularSpinBurstNonce,
  useTimerCore,
  useTimerRemaining,
  useTsukuyomiCastNonce,
} from '@/store/useTsukuyomiStore';

const RING_RADIUS = 146;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const BLOOD_TEAR_PATH =
  'M 20 2 C 19.3 10 21.6 17 19.7 25 C 18.9 30 20.4 34 20 39';
const BLOOD_TEAR_LENGTH = 42;
const BURST_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DIGIT_FLIP_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 28,
  mass: 0.6,
} as const;

const MODE_LABELS = {
  focus: 'Tsukuyomi',
  short_break: 'Repouso Curto',
  long_break: 'Repouso Longo',
} as const;

let lastConsumedCastNonce = 0;
let lastConsumedSpinNonce = 0;

export function OcularClock() {
  const prefersReducedMotion = useReducedMotion();
  const remainingSeconds = useTimerRemaining();
  const { status, mode, durationSeconds, susanooEnabled } = useTimerCore();
  const {
    equippedEyeStage,
    mangekyouVariant,
    customEye,
    susanooStageOverride,
  } = useOcularProfile();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const tsukuyomiCastNonce = useTsukuyomiCastNonce();
  const ocularSpinBurstNonce = useOcularSpinBurstNonce();

  const bloodTearId = useId().replace(/:/g, '');
  const bloodGradId = `blood-tear-grad-${bloodTearId}`;
  const parallax = useAwwwardsParallax(1);
  const specularCounterX = useTransform(parallax.layerFg.x, [-32, 32], [8, -8]);
  const specularCounterY = useTransform(parallax.layerFg.y, [-32, 32], [8, -8]);

  const [awakeningScope, animateAwakening] = useAnimate();
  const [spinBurstScope, animateSpinBurst] = useAnimate();
  const [shockwaveScope, animateShockwave] = useAnimate();
  const [saccadeScope, animateSaccade] = useAnimate();
  const [sheenScope, animateSheen] = useAnimate();

  const [saccadeNonce, setSaccadeNonce] = useState(0);
  const spinAngleRef = useRef(0);
  const activeBurstIdRef = useRef(0);
  const lastSweepTimeRef = useRef(0);
  const lastSweepPosRef = useRef<{ x: number; y: number } | null>(null);
  const sheenTimerRef = useRef<number | null>(null);
  const rescheduleSheenRef = useRef<(() => void) | null>(null);

  const prevTriggerRef = useRef({
    initialized: false,
    status,
    equippedEyeStage,
    mangekyouVariant,
    susanooStageOverride,
    durationSeconds,
  });

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

  const isHeavyFocusEndgame =
    isRunning &&
    isFocus &&
    durationSeconds >= 50 * 60 &&
    remainingSeconds <= 300 &&
    remainingSeconds > 0;
  const showBloodTear =
    equippedEyeStage === 'mangekyou' ||
    equippedEyeStage === 'ems' ||
    isHeavyFocusEndgame;

  const fireWetSheen = useCallback(() => {
    if (prefersReducedMotion || !sheenScope.current) {
      return;
    }
    lastSweepTimeRef.current = Date.now();
    void animateSheen(
      sheenScope.current,
      { x: ['-125%', '125%'], y: ['-18%', '18%'] },
      { type: 'tween', duration: 1.5, ease: [0.22, 1, 0.36, 1] },
    );
    void animateSheen(
      sheenScope.current,
      { opacity: [0, 0.95, 0.95, 0] },
      { type: 'tween', duration: 1.5, times: [0, 0.16, 0.84, 1], ease: 'linear' },
    );
  }, [prefersReducedMotion, animateSheen, sheenScope]);

  // Periodic 6s wet cornea sheen sweep (1.5s sweep + 4.5s wait)
  useEffect(() => {
    if (prefersReducedMotion) {
      rescheduleSheenRef.current = null;
      return;
    }

    let cancelled = false;
    const clearPending = () => {
      if (sheenTimerRef.current !== null) {
        window.clearTimeout(sheenTimerRef.current);
        sheenTimerRef.current = null;
      }
    };

    const scheduleLoop = (delayMs: number) => {
      clearPending();
      if (cancelled) return;
      sheenTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        fireWetSheen();
        scheduleLoop(6000);
      }, delayMs);
    };

    rescheduleSheenRef.current = () => scheduleLoop(6000);
    scheduleLoop(1200);

    return () => {
      cancelled = true;
      rescheduleSheenRef.current = null;
      clearPending();
    };
  }, [prefersReducedMotion, fireWetSheen]);

  // Biological saccadic eye twitch every 8s-10s while idle
  useEffect(() => {
    if (status !== 'idle' || prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;
    let direction = 1;

    const scheduleSaccade = () => {
      if (cancelled) return;
      const delayMs = 8000 + Math.random() * 2000;
      timerId = window.setTimeout(() => {
        if (cancelled) return;
        direction = -direction;
        const shiftX = direction * 2;

        if (saccadeScope.current) {
          void animateSaccade(
            saccadeScope.current,
            { x: [0, shiftX, shiftX * 0.3, 0] },
            {
              type: 'tween',
              duration: 0.25,
              times: [0, 0.28, 0.68, 1],
              ease: [0.22, 1, 0.36, 1],
            },
          );
        }

        setSaccadeNonce((prev) => prev + 1);
        scheduleSaccade();
      }, delayMs);
    };

    scheduleSaccade();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [status, prefersReducedMotion, animateSaccade, saccadeScope]);

  // Heavy Inertia Lock: -15deg recoil -> +720deg snap in 450ms with blur + shockwave
  useEffect(() => {
    const prev = prevTriggerRef.current;
    const castTriggered = tsukuyomiCastNonce > lastConsumedCastNonce;
    const spinNonceTriggered = ocularSpinBurstNonce > lastConsumedSpinNonce;

    const propChanged =
      prev.initialized &&
      (prev.equippedEyeStage !== equippedEyeStage ||
        prev.mangekyouVariant !== mangekyouVariant ||
        prev.susanooStageOverride !== susanooStageOverride ||
        prev.durationSeconds !== durationSeconds);
    const startedRunning =
      prev.initialized && prev.status !== 'running' && status === 'running';

    lastConsumedCastNonce = tsukuyomiCastNonce;
    lastConsumedSpinNonce = ocularSpinBurstNonce;
    prevTriggerRef.current = {
      initialized: true,
      status,
      equippedEyeStage,
      mangekyouVariant,
      susanooStageOverride,
      durationSeconds,
    };

    const shouldBurst =
      castTriggered || spinNonceTriggered || propChanged || startedRunning;

    if (!shouldBurst || prefersReducedMotion) {
      return;
    }

    const isCast = castTriggered;
    const burstId = ++activeBurstIdRef.current;
    const baseAngle = spinAngleRef.current;
    const recoilAngle = baseAngle - 15;
    const targetAngle = baseAngle + 720;
    spinAngleRef.current = targetAngle;

    void (async () => {
      if (spinBurstScope.current) {
        await animateSpinBurst(
          spinBurstScope.current,
          { rotate: recoilAngle },
          {
            type: 'tween',
            duration: 0.085,
            ease: 'easeOut',
          },
        );
      }

      if (activeBurstIdRef.current !== burstId) {
        return;
      }

      if (shockwaveScope.current) {
        void animateShockwave(
          shockwaveScope.current,
          {
            scale: isCast ? [0.7, 1.18, 1.52] : [0.76, 1.12, 1.4],
            opacity: [0, 0.92, 0],
          },
          {
            type: 'tween',
            duration: isCast ? 0.95 : 0.68,
            times: [0, 0.3, 1],
            ease: BURST_EASE,
          },
        );
      }

      if (spinBurstScope.current) {
        void animateSpinBurst(
          spinBurstScope.current,
          { filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'] },
          {
            type: 'tween',
            duration: 0.45,
            times: [0, 0.4, 1],
            ease: BURST_EASE,
          },
        );
        void animateSpinBurst(
          spinBurstScope.current,
          { rotate: targetAngle },
          {
            type: 'tween',
            duration: 0.45,
            ease: BURST_EASE,
          },
        );
      }

      if (awakeningScope.current) {
        await animateAwakening(
          awakeningScope.current,
          { scale: isCast ? 1.15 : 1.09 },
          { type: 'spring', stiffness: 340, damping: 16 },
        );
        if (activeBurstIdRef.current !== burstId || !awakeningScope.current) {
          return;
        }
        await animateAwakening(
          awakeningScope.current,
          { scale: 1 },
          { type: 'spring', stiffness: 220, damping: 22 },
        );
      }
    })();
  }, [
    tsukuyomiCastNonce,
    ocularSpinBurstNonce,
    equippedEyeStage,
    mangekyouVariant,
    susanooStageOverride,
    durationSeconds,
    status,
    prefersReducedMotion,
    animateAwakening,
    animateSpinBurst,
    animateShockwave,
    awakeningScope,
    spinBurstScope,
    shockwaveScope,
  ]);

  function handleClockPointerMove(e: PointerEvent<HTMLDivElement>) {
    parallax.handlers.onPointerMove(e);
    if (prefersReducedMotion) return;

    const prev = lastSweepPosRef.current;
    if (!prev) {
      lastSweepPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    const now = Date.now();
    if (dist >= 48 && now - lastSweepTimeRef.current >= 1650) {
      lastSweepPosRef.current = { x: e.clientX, y: e.clientY };
      fireWetSheen();
      rescheduleSheenRef.current?.();
    }
  }

  function handleClockPointerLeave() {
    parallax.handlers.onPointerLeave();
    lastSweepPosRef.current = null;
  }

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

  const susanooActive =
    (susanooEnabled && isFocus) || susanooStageOverride !== 'auto';
  const formattedClock = formatTimerClock(remainingSeconds);
  const clockCharacters = formattedClock.split('');

  return (
    <div
      className="relative flex flex-col items-center justify-center py-8 sm:py-12 select-none"
      style={{ perspective: 1200 }}
      onPointerMove={handleClockPointerMove}
      onPointerLeave={handleClockPointerLeave}
      onPointerEnter={() => audioEngine.playHover()}
    >
      {/* Interactive 4-Layer Stage */}
      <div className="relative flex h-[340px] w-[340px] items-center justify-center">
        {/* Expanding Chakra Shockwave Ring around OcularClock */}
        <div
          ref={shockwaveScope}
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 z-20 rounded-full border-2 opacity-0 transition-colors duration-700 will-change-transform"
          style={{
            borderColor: 'var(--chakra-primary, #DC2626)',
            boxShadow:
              '0 0 28px var(--chakra-glow, rgba(220, 38, 38, 0.42)), inset 0 0 18px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
          }}
        />

        {/* Plano -2: Abyss & Controlled Chakra Radial Halo */}
        <motion.div
          style={{ x: parallax.layerBg.x, y: parallax.layerBg.y }}
          className="pointer-events-none absolute -inset-12 rounded-full will-change-transform"
        >
          <div
            className="h-full w-full rounded-full transition-colors duration-700"
            style={{
              opacity: isUrgent ? 0.9 : isRunning || isTsukuyomiMode ? 0.65 : 0.36,
              background: isUrgent
                ? 'radial-gradient(circle at center, rgba(220, 38, 38, 0.32) 0%, rgba(127, 29, 29, 0.14) 44%, rgba(0, 0, 0, 0) 70%)'
                : 'radial-gradient(circle at center, var(--chakra-glow, rgba(220, 38, 38, 0.42)) 0%, color-mix(in srgb, var(--chakra-primary, #DC2626) 14%, transparent) 44%, rgba(0, 0, 0, 0) 70%)',
            }}
          />
        </motion.div>

        {/* Plano -1: Susanoo Aura / Ritual Architecture */}
        <motion.div
          style={{ x: parallax.layerMid.x, y: parallax.layerMid.y }}
          className="pointer-events-none absolute -inset-[110px] m-auto flex h-[560px] w-[560px] items-center justify-center will-change-transform"
        >
          <SusanooAura
            progress={progressPercent}
            enabled={susanooActive}
            isRunning={isRunning}
            variant={mangekyouVariant}
            stageOverride={susanooStageOverride}
            className="h-[560px] w-[560px]"
          />
        </motion.div>

        {/* Plano 0: Sculpted Obsidian Bezel & Precision Mechanical Ring */}
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
              'absolute inset-3 rounded-full border border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] transition-colors duration-700',
              isUrgent && 'border-red-600/50',
            )}
            style={
              susanooActive && !isUrgent
                ? {
                    borderColor:
                      'color-mix(in srgb, var(--chakra-primary, #DC2626) 45%, transparent)',
                    boxShadow:
                      'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.95), 0 0 28px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                  }
                : undefined
            }
          />

          <svg
            viewBox="0 0 320 320"
            aria-hidden="true"
            className="pointer-events-none relative z-10 h-full w-full"
          >
            {/* Precision Recessed Horological Framing Rings */}
            <circle
              cx="160"
              cy="160"
              r="141"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.75"
            />
            <circle
              cx="160"
              cy="160"
              r="123"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.75"
            />

            {/* 60 Millimeter Radial Tick Marks (every 6deg: cardinal 90deg, 30deg, 6deg) */}
            <g strokeLinecap="round">
              {Array.from({ length: 60 }, (_, idx) => {
                const angle = idx * 6;
                const isCardinal = idx % 15 === 0;
                const isThirty = idx % 5 === 0;
                return (
                  <line
                    key={angle}
                    x1="160"
                    y1={isCardinal ? 20 : isThirty ? 22 : 24.5}
                    x2="160"
                    y2={isCardinal ? 32 : isThirty ? 29.5 : 28.5}
                    stroke={
                      isCardinal
                        ? isUrgent
                          ? '#EF4444'
                          : '#71717A'
                        : isThirty
                          ? '#3F3F46'
                          : '#27272A'
                    }
                    strokeWidth={isCardinal ? 1.8 : isThirty ? 1.25 : 0.85}
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

            {/* Active Chakra Progress Arc */}
            <circle
              cx="160"
              cy="160"
              r={RING_RADIUS}
              fill="none"
              stroke={isUrgent ? '#EF4444' : 'var(--chakra-primary, #DC2626)'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 160 160)"
              className="transition-colors duration-700"
              style={{
                transition:
                  'stroke-dashoffset 280ms linear, stroke 700ms ease, filter 700ms ease',
                filter: isRunning
                  ? 'drop-shadow(0 0 10px var(--chakra-glow, rgba(220, 38, 38, 0.42)))'
                  : 'none',
              }}
            />
          </svg>

          {/* Ocular Blood Tear flowing from the lower rim of the ring */}
          <AnimatePresence>
            {showBloodTear && (
              <motion.div
                key="ocular-blood-tear"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'tween', duration: 0.45 }}
                className="pointer-events-none absolute -bottom-8 left-1/2 z-[25] -translate-x-1/2"
              >
                <svg
                  viewBox="0 0 40 68"
                  className="h-[52px] w-[36px] overflow-visible drop-shadow-[0_0_8px_rgba(220,38,38,0.65)]"
                >
                  <defs>
                    <linearGradient
                      id={bloodGradId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#7F1D1D" />
                      <stop offset="55%" stopColor="#B91C1C" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                  </defs>

                  {/* Rim pooling meniscus */}
                  <motion.path
                    d="M 13 2 Q 20 7.5 27 2 Z"
                    fill={`url(#${bloodGradId})`}
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 0.92, scaleX: 1 }}
                    transition={{ type: 'tween', duration: 0.7, ease: 'easeOut' }}
                    style={{ transformOrigin: '20px 2px' }}
                  />

                  {/* Flowing crimson tear trail */}
                  <motion.path
                    d={BLOOD_TEAR_PATH}
                    fill="none"
                    stroke={`url(#${bloodGradId})`}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeDasharray={BLOOD_TEAR_LENGTH}
                    initial={{
                      strokeDashoffset: prefersReducedMotion
                        ? 0
                        : BLOOD_TEAR_LENGTH,
                    }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{
                      type: 'tween',
                      duration: prefersReducedMotion ? 0 : 2.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />

                  {/* Detaching & falling crimson blood droplet */}
                  {!prefersReducedMotion && (
                    <motion.path
                      d="M 20 36.5 C 21.8 39.2 22.8 41.2 22.8 42.8 A 2.8 2.8 0 1 1 17.2 42.8 C 17.2 41.2 18.2 39.2 20 36.5 Z"
                      fill="#DC2626"
                      initial={{ y: 0, opacity: 0, scale: 0.4 }}
                      animate={{
                        y: [0, 2, 12, 23],
                        opacity: [0, 0.95, 0.9, 0],
                        scale: [0.4, 1, 0.88, 0.55],
                      }}
                      transition={{
                        type: 'tween',
                        duration: 2.6,
                        times: [0, 0.25, 0.72, 1],
                        ease: 'easeIn',
                        repeat: Infinity,
                        repeatDelay: 0.85,
                        delay: 1.25,
                      }}
                      style={{ transformOrigin: '20px 41px' }}
                    />
                  )}
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plano +1: Ocular Core (Sharingan SVG or Custom IA Image + 3D Spherical Cornea) */}
          <motion.div
            style={{ x: parallax.layerFg.x, y: parallax.layerFg.y }}
            className="absolute z-20 flex h-[228px] w-[228px] items-center justify-center will-change-transform"
          >
            {/* 2-state Spring Awakening & Outer Eye Glow */}
            <div
              ref={awakeningScope}
              className="h-full w-full will-change-transform"
            >
              {/* Cyclic Breathing Tween Wrapper ([1, 1.025, 1] strictly tween) */}
              <motion.div
                className="h-full w-full rounded-full will-change-transform"
                style={{ filter: `drop-shadow(${eyeDropShadow})` }}
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
                {/* Circular Eyeball Aperture */}
                <div className="relative h-full w-full overflow-hidden rounded-full bg-black">
                  {/* Biological Saccadic Eye Twitch Wrapper */}
                  <div
                    ref={saccadeScope}
                    className="h-full w-full will-change-transform"
                  >
                    {/* Centrifugal Spin Burst Wrapper (-15deg recoil -> +720deg snap + motion blur) */}
                    <div
                      ref={spinBurstScope}
                      className="h-full w-full rounded-full will-change-transform"
                    >
                      {/* Continuous 60fps Rotation Tween Wrapper */}
                      <motion.div
                        className="h-full w-full rounded-full will-change-transform"
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
                          </div>
                        ) : (
                          <SharinganSvg
                            stage={equippedEyeStage}
                            variant={mangekyouVariant}
                            isAwakening={isAwakening}
                            isUrgent={isUrgent}
                            isSpinBurst={isAwakening}
                            pupilDilationNonce={saccadeNonce}
                            specularParallax={{
                              x: specularCounterX,
                              y: specularCounterY,
                            }}
                            hideCorneaSpecular
                          />
                        )}
                      </motion.div>
                    </div>
                  </div>

                  {/* 3D Spherical Glass Dome Overlay */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      boxShadow:
                        'inset 0 0 40px #000000, inset 0 2px 10px rgba(255,255,255,0.07)',
                    }}
                  />

                  {/* Specular Wet Cornea Diagonal Sheen Sweep */}
                  <div
                    ref={sheenScope}
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-4 will-change-transform"
                    style={{
                      opacity: 0,
                      background:
                        'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                    }}
                  />

                  {/* Counter-Parallax Bright Wet-Lens Specular Droplet Overlay */}
                  <motion.div
                    aria-hidden="true"
                    style={{ x: specularCounterX, y: specularCounterY }}
                    className="pointer-events-none absolute inset-0 will-change-transform"
                  >
                    <svg viewBox="0 0 200 200" className="h-full w-full">
                      <ellipse
                        cx="84"
                        cy="79"
                        rx="7.2"
                        ry="3.8"
                        transform="rotate(-32 84 79)"
                        fill="#FFFFFF"
                        fillOpacity={
                          equippedEyeStage === 'normal' && !useCustomImage
                            ? 0.42
                            : 0.62
                        }
                      />
                      <circle
                        cx="115"
                        cy="116"
                        r="2.2"
                        fill="#FFFFFF"
                        fillOpacity="0.28"
                      />
                      <path
                        d="M 52 58 A 66 66 0 0 1 82 38"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeOpacity={
                          equippedEyeStage === 'normal' && !useCustomImage
                            ? 0.14
                            : 0.22
                        }
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Compact Tactical Status Pill & Giant 3D Digital Readout */}
      <div className="relative z-30 mt-7 flex flex-col items-center text-center">
        <div
          onMouseEnter={() => audioEngine.playHover()}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3.5 py-1 text-[11px] font-medium tracking-[0.22em] text-zinc-300 uppercase shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_28px_-6px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors duration-700"
        >
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full transition-colors duration-700',
              isRunning
                ? 'animate-pulse'
                : isPaused
                  ? 'bg-zinc-400 shadow-[0_0_6px_rgba(161,161,170,0.45)]'
                  : 'bg-zinc-600',
            )}
            style={
              isRunning
                ? {
                    backgroundColor: isUrgent
                      ? '#EF4444'
                      : 'var(--chakra-primary, #DC2626)',
                    boxShadow: isUrgent
                      ? '0 0 8px #EF4444'
                      : '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                  }
                : undefined
            }
          />
          <span>{MODE_LABELS[mode]}</span>
          <span className="text-zinc-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[10px] tracking-wider text-zinc-400 tabular-nums">
            {progressPercent}%
          </span>
          {susanooActive && (
            <span
              className="inline-flex items-center gap-1 rounded-full border bg-black/65 px-2 py-0.5 text-[10px] tracking-wider text-zinc-100 transition-colors duration-700"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--chakra-primary, #DC2626) 45%, transparent)',
                boxShadow:
                  '0 0 12px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
              }}
            >
              <Shield
                className="h-3 w-3 transition-colors duration-700"
                style={{ color: 'var(--chakra-primary, #DC2626)' }}
                aria-hidden="true"
              />
              Susano&apos;o
              {susanooStageOverride !== 'auto'
                ? ` · F${susanooStageOverride}`
                : ''}
            </span>
          )}
        </div>

        <time
          dateTime={`PT${remainingSeconds}S`}
          aria-live="off"
          aria-label={formattedClock}
          className={cn(
            'inline-flex items-center justify-center font-mono text-7xl font-semibold tracking-tighter tabular-nums transition-colors duration-700 md:text-8xl',
            isUrgent
              ? 'text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.55)]'
              : 'text-zinc-50 drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]',
          )}
        >
          {clockCharacters.map((char, idx) => (
            <span
              key={idx}
              style={{ perspective: 600, transformStyle: 'preserve-3d' }}
              className={cn(
                'relative -my-2 inline-flex items-center justify-center overflow-visible py-2',
                char === ':' ? 'w-[0.36em]' : 'w-[0.62em]',
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={char}
                  initial={
                    prefersReducedMotion
                      ? false
                      : { y: 20, rotateX: 52, opacity: 0, filter: 'blur(4px)' }
                  }
                  animate={{ y: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)' }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { y: -20, rotateX: -52, opacity: 0, filter: 'blur(4px)' }
                  }
                  transition={
                    prefersReducedMotion ? { duration: 0 } : DIGIT_FLIP_SPRING
                  }
                  className="inline-block will-change-transform"
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            </span>
          ))}
        </time>
      </div>
    </div>
  );
}
