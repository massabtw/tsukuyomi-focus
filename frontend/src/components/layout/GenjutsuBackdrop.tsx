'use client';

import { useEffect, useId, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/cn';
import {
  useIsTsukuyomiMode,
  useTimerCore,
  useTsukuyomiCastNonce,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

const BACKDROP_SPRING = {
  stiffness: 90,
  damping: 28,
  mass: 0.8,
} as const;

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;
const WILL_CHANGE_TRANSFORM_OPACITY = {
  willChange: 'transform, opacity',
} as const;

interface CrowVector {
  id: string;
  midX: string;
  midY: string;
  targetX: string;
  targetY: string;
  delay: number;
  startRotate: number;
  endRotate: number;
}

const CROW_FLOCK_VECTORS: readonly CrowVector[] = [
  { id: 'crow-1', midX: '-18vw', midY: '-14vh', targetX: '-42vw', targetY: '-34vh', delay: 0.0, startRotate: -18, endRotate: -32 },
  { id: 'crow-2', midX: '16vw', midY: '-16vh', targetX: '38vw', targetY: '-36vh', delay: 0.03, startRotate: 14, endRotate: 28 },
  { id: 'crow-3', midX: '-21vw', midY: '5vh', targetX: '-48vw', targetY: '12vh', delay: 0.06, startRotate: -26, endRotate: -40 },
  { id: 'crow-4', midX: '20vw', midY: '7vh', targetX: '46vw', targetY: '16vh', delay: 0.04, startRotate: 22, endRotate: 38 },
  { id: 'crow-5', midX: '-8vw', midY: '-20vh', targetX: '-18vw', targetY: '-46vh', delay: 0.08, startRotate: -8, endRotate: -16 },
  { id: 'crow-6', midX: '7vw', midY: '-19vh', targetX: '16vw', targetY: '-44vh', delay: 0.05, startRotate: 10, endRotate: 22 },
  { id: 'crow-7', midX: '-14vw', midY: '16vh', targetX: '-32vw', targetY: '38vh', delay: 0.09, startRotate: -35, endRotate: -50 },
  { id: 'crow-8', midX: '15vw', midY: '18vh', targetX: '34vw', targetY: '40vh', delay: 0.07, startRotate: 28, endRotate: 44 },
  { id: 'crow-9', midX: '-3vw', midY: '19vh', targetX: '-8vw', targetY: '42vh', delay: 0.11, startRotate: -12, endRotate: -20 },
  { id: 'crow-10', midX: '5vw', midY: '-8vh', targetX: '12vw', targetY: '-18vh', delay: 0.02, startRotate: 6, endRotate: 18 },
];

interface FeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  rot: number;
  vRot: number;
  tumblePhase: number;
  tumbleSpeed: number;
  swayAmp: number;
  alpha: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  driftPhase: number;
  driftSpeed: number;
  alpha: number;
  crimsonBright: boolean;
}

function createFeather(width: number, height: number, randomY: boolean): FeatherParticle {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -20 - Math.random() * 80,
    vx: -12 + Math.random() * 24,
    vy: 22 + Math.random() * 28,
    length: 12 + Math.random() * 14,
    width: 4 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    vRot: -0.7 + Math.random() * 1.4,
    tumblePhase: Math.random() * Math.PI * 2,
    tumbleSpeed: 1.4 + Math.random() * 1.8,
    swayAmp: 18 + Math.random() * 26,
    alpha: 0.45 + Math.random() * 0.4,
  };
}

function createEmber(width: number, height: number, randomY: boolean): EmberParticle {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + 10 + Math.random() * 60,
    vy: -(18 + Math.random() * 34),
    size: 1.4 + Math.random() * 2.2,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 1.2 + Math.random() * 2.0,
    alpha: 0.3 + Math.random() * 0.65,
    crimsonBright: Math.random() > 0.45,
  };
}

function CrowSilhouetteSvg() {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-20 w-28 drop-shadow-[0_0_12px_rgba(220,38,38,0.45)]"
    >
      <path
        d="M 60 36 C 46 18 22 8 4 14 C 16 24 28 32 42 40 C 30 46 20 56 16 68 C 30 60 44 54 56 50 L 60 66 L 65 50 C 77 54 90 60 104 68 C 100 56 90 46 78 40 C 92 32 104 24 116 14 C 98 8 74 18 60 36 Z"
        fill="#050507"
        stroke="#DC2626"
        strokeWidth="1.2"
        strokeOpacity="0.65"
      />
      <path d="M 56 34 L 60 22 L 65 34 L 60 44 Z" fill="#050507" />
      <circle cx="58.5" cy="29" r="1.2" fill="#EF4444" />
      <circle cx="61.5" cy="29" r="1.2" fill="#EF4444" />
    </svg>
  );
}

export function GenjutsuBackdrop() {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const moonCoronaId = `blood-moon-corona-${safeId}`;
  const moonDiscId = `blood-moon-disc-${safeId}`;

  const isTsukuyomiMode = useIsTsukuyomiMode();
  const { status: timerStatus } = useTimerCore();
  const izanagiFlashNonce = useTsukuyomiStore((s) => s.izanagiFlashNonce);
  const tsukuyomiCastNonce = useTsukuyomiCastNonce();
  const prefersReducedMotion = useReducedMotion();

  const isTimerRunning = timerStatus === 'running';
  const isGenjutsuActive = isTsukuyomiMode || isTimerRunning;
  const factor = prefersReducedMotion ? 0 : 1;

  const genjutsuActiveRef = useRef(isGenjutsuActive);
  useEffect(() => {
    genjutsuActiveRef.current = isGenjutsuActive;
  }, [isGenjutsuActive]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const smoothX = useSpring(rawX, BACKDROP_SPRING);
  const smoothY = useSpring(rawY, BACKDROP_SPRING);

  // Layer -3 (Genjutsu Sky & Blood Moon): slowest depth
  const skyX = useTransform(smoothX, [-0.5, 0.5], [10 * factor, -10 * factor]);
  const skyY = useTransform(smoothY, [-0.5, 0.5], [10 * factor, -10 * factor]);

  // Layer -2 (Abyss Vignette & 2.5D Architectural Horizon): mid depth
  const abyssX = useTransform(smoothX, [-0.5, 0.5], [16 * factor, -16 * factor]);
  const abyssY = useTransform(smoothY, [-0.5, 0.5], [16 * factor, -16 * factor]);

  const horizonX = useTransform(smoothX, [-0.5, 0.5], [24 * factor, -24 * factor]);
  const horizonY = useTransform(smoothY, [-0.5, 0.5], [18 * factor, -18 * factor]);

  useEffect(() => {
    if (prefersReducedMotion) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const normX = Math.max(-0.5, Math.min(0.5, e.clientX / width - 0.5));
      const normY = Math.max(-0.5, Math.min(0.5, e.clientY / height - 0.5));
      rawX.set(normX);
      rawY.set(normY);
    };

    const handlePointerLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [prefersReducedMotion, rawX, rawY]);

  // Layer -1: 60fps Crow Feathers & Rising Crimson Embers Canvas
  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const maxFeathers = 22;
    const maxEmbers = 34;
    const feathers: FeatherParticle[] = Array.from({ length: maxFeathers }, () =>
      createFeather(width, height, true),
    );
    const embers: EmberParticle[] = Array.from({ length: maxEmbers }, () =>
      createEmber(width, height, true),
    );

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const active = genjutsuActiveRef.current;
      const activeFeatherLimit = active ? maxFeathers : 7;
      const activeEmberLimit = active ? maxEmbers : 10;

      ctx.clearRect(0, 0, width, height);

      // Draw rising crimson chakra embers
      for (let i = 0; i < activeEmberLimit; i++) {
        const ember = embers[i];
        ember.driftPhase += ember.driftSpeed * dt;
        ember.y += ember.vy * (active ? 1.15 : 0.75) * dt;
        ember.x += Math.sin(ember.driftPhase) * 14 * dt;

        if (ember.y < -16) {
          embers[i] = createEmber(width, height, false);
          continue;
        }

        const heightRatio = Math.max(0, Math.min(1, ember.y / Math.max(1, height)));
        const fade = Math.sin(heightRatio * Math.PI);
        const alpha = ember.alpha * fade * (active ? 0.9 : 0.36);

        if (alpha <= 0.02) continue;

        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
        ctx.fillStyle = ember.crimsonBright
          ? `rgba(239, 68, 68, ${alpha.toFixed(3)})`
          : `rgba(220, 38, 38, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // Draw slow-motion tumbling black crow feathers (2.5D sinusoidal tumble)
      for (let i = 0; i < activeFeatherLimit; i++) {
        const f = feathers[i];
        f.tumblePhase += f.tumbleSpeed * dt;
        f.rot += f.vRot * dt;
        f.y += f.vy * (active ? 1.0 : 0.7) * dt;
        f.x += (f.vx + Math.sin(f.tumblePhase * 0.8) * f.swayAmp) * dt;

        if (f.y > height + 36) {
          feathers[i] = createFeather(width, height, false);
          continue;
        }
        if (f.x < -40) f.x = width + 30;
        if (f.x > width + 40) f.x = -30;

        const tumbleScale = Math.cos(f.tumblePhase);
        const absTumble = Math.max(0.18, Math.abs(tumbleScale));
        const alpha = f.alpha * (active ? 1 : 0.42);

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.scale(tumbleScale < 0 ? -absTumble : absTumble, 1);

        // Feather vane silhouette
        ctx.beginPath();
        ctx.moveTo(0, -f.length * 0.55);
        ctx.quadraticCurveTo(f.width, -f.length * 0.1, f.width * 0.65, f.length * 0.45);
        ctx.lineTo(0, f.length * 0.6);
        ctx.quadraticCurveTo(-f.width * 0.9, f.length * 0.12, 0, -f.length * 0.55);
        ctx.closePath();

        ctx.fillStyle = `rgba(6, 6, 9, ${alpha.toFixed(3)})`;
        ctx.fill();

        ctx.lineWidth = 0.8;
        ctx.strokeStyle = active
          ? `rgba(185, 28, 28, ${(alpha * 0.58).toFixed(3)})`
          : `rgba(82, 82, 91, ${(alpha * 0.35).toFixed(3)})`;
        ctx.stroke();

        // Central rachis quill line
        ctx.beginPath();
        ctx.moveTo(0, -f.length * 0.52);
        ctx.lineTo(0, f.length * 0.68);
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = `rgba(127, 29, 29, ${(alpha * 0.45).toFixed(3)})`;
        ctx.stroke();

        ctx.restore();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resizeCanvas, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion]);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-700',
          isTsukuyomiMode ? 'bg-[#000000]' : 'bg-[#09090B]',
        )}
      >
        {/* Layer -3: Genjutsu Crimson Sky, Giant Blood Moon & Drifting Volumetric Clouds */}
        <motion.div
          style={{ x: skyX, y: skyY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-10 transition-opacity duration-1000',
            isGenjutsuActive ? 'opacity-100' : 'opacity-0',
          )}
        >
          {/* Dark crimson Tsukuyomi atmospheric sky */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 85% 58% at 72% 20%, rgba(127, 29, 29, 0.36) 0%, rgba(69, 10, 10, 0.16) 44%, rgba(0, 0, 0, 0) 78%), linear-gradient(180deg, rgba(42, 6, 9, 0.55) 0%, rgba(12, 3, 5, 0.25) 52%, rgba(0, 0, 0, 0) 100%)',
            }}
          />

          {/* Giant Blood Moon with subtle Mangekyou / Rinnegan projection */}
          <div className="absolute right-[6%] top-[6%] h-[210px] w-[210px] sm:right-[11%] sm:top-[6%] sm:h-[320px] sm:w-[320px] lg:h-[390px] lg:w-[390px]">
            <svg
              viewBox="0 0 320 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
            >
              <defs>
                <radialGradient id={moonCoronaId} cx="50%" cy="50%" r="50%">
                  <stop offset="52%" stopColor="rgba(220, 38, 38, 0.32)" />
                  <stop offset="76%" stopColor="rgba(127, 29, 29, 0.14)" />
                  <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                </radialGradient>
                <radialGradient id={moonDiscId} cx="44%" cy="42%" r="56%">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.9" />
                  <stop offset="48%" stopColor="#991B1B" stopOpacity="0.88" />
                  <stop offset="84%" stopColor="#450A0A" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#180406" stopOpacity="0.95" />
                </radialGradient>
              </defs>

              <circle cx="160" cy="160" r="158" fill={`url(#${moonCoronaId})`} />
              <circle
                cx="160"
                cy="160"
                r="102"
                fill={`url(#${moonDiscId})`}
                stroke="#EF4444"
                strokeOpacity="0.28"
                strokeWidth="1.2"
              />

              {/* Subtle Lunar Shadow Craters */}
              <g fill="#2A0507" fillOpacity="0.38">
                <circle cx="128" cy="126" r="19" />
                <circle cx="192" cy="140" r="13" />
                <circle cx="152" cy="198" r="22" />
                <ellipse cx="184" cy="190" rx="14" ry="9" />
              </g>

              {/* Subtle Projected Rinnegan / Mangekyou Silhouette */}
              <g opacity="0.24" stroke="#09090B">
                <circle cx="160" cy="160" r="80" strokeWidth="1.4" />
                <circle cx="160" cy="160" r="56" strokeWidth="1.4" />
                <circle cx="160" cy="160" r="32" strokeWidth="1.4" />
                {[0, 120, 240].map((angle) => (
                  <path
                    key={angle}
                    transform={`rotate(${angle} 160 160)`}
                    d="M 152 146 C 148 116 168 88 202 80 C 184 102 178 122 176 146 Z"
                    fill="#09090B"
                    stroke="none"
                  />
                ))}
                <circle cx="160" cy="160" r="10" fill="#09090B" stroke="none" />
              </g>
            </svg>
          </div>

          {/* Drifting Volumetric Clouds */}
          <motion.div
            animate={
              prefersReducedMotion
                ? { x: 0 }
                : { x: [-40, 48, -40] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 36, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM}
            className="absolute inset-x-0 top-[4%] h-56 opacity-75"
          >
            <div
              className="absolute left-[10%] top-4 h-28 w-[42vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(18, 4, 7, 0.88) 0%, rgba(45, 7, 10, 0.35) 55%, rgba(0,0,0,0) 78%)',
              }}
            />
            <div
              className="absolute right-[4%] top-16 h-32 w-[48vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(9, 9, 11, 0.9) 0%, rgba(69, 10, 10, 0.28) 58%, rgba(0,0,0,0) 80%)',
              }}
            />
          </motion.div>

          <motion.div
            animate={
              prefersReducedMotion
                ? { x: 0 }
                : { x: [44, -44, 44] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 48, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM}
            className="absolute inset-x-0 top-[18%] h-52 opacity-70"
          >
            <div
              className="absolute left-[26%] top-2 h-24 w-[52vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(12, 4, 6, 0.85) 0%, rgba(92, 14, 18, 0.24) 55%, rgba(0,0,0,0) 80%)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Layer -2: Abyss & Crimson Radial Vignette */}
        <motion.div
          style={{ x: abyssX, y: abyssY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-700',
            isTsukuyomiMode ? 'tsukuyomi-vignette opacity-100' : 'normal-vignette opacity-100',
          )}
        />

        {/* Layer -2: Static SVG feTurbulence stone micro-texture (opacity 0.03) */}
        <div className="naka-stone-texture absolute inset-0" />

        {/* Layer -2: Tsukuyomi Genjutsu grid lines */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'genjutsu-grid-lines absolute -inset-12 transition-opacity duration-700',
            isTsukuyomiMode
              ? 'animate-genjutsu-drift opacity-65'
              : 'opacity-20',
          )}
        />

        {/* Layer -2: Subtle Naka Shrine Seal Geometry */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className={cn(
              'transition-opacity duration-700',
              isTsukuyomiMode ? 'opacity-25' : 'opacity-10',
            )}
          >
            <svg
              width="760"
              height="760"
              viewBox="0 0 760 760"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[min(86vw,760px)] w-[min(86vw,760px)]"
            >
              <circle
                cx="380"
                cy="380"
                r="340"
                stroke="#7F1D1D"
                strokeWidth="1"
                strokeDasharray="6 10"
              />
              <circle
                cx="380"
                cy="380"
                r="268"
                stroke="#DC2626"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <circle
                cx="380"
                cy="380"
                r="196"
                stroke="#7F1D1D"
                strokeWidth="1"
                strokeDasharray="2 8"
              />
              <polygon
                points="380,68 650,536 110,536"
                stroke="#7F1D1D"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <polygon
                points="380,692 110,224 650,224"
                stroke="#7F1D1D"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <line
                x1="380"
                y1="20"
                x2="380"
                y2="740"
                stroke="#27272A"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <line
                x1="20"
                y1="380"
                x2="740"
                y2="380"
                stroke="#27272A"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
            </svg>
          </div>
        </motion.div>

        {/* Layer -2: 2.5D Architectural Horizon (Tilted Tsukuyomi Monoliths/Crosses, Broken Torii Gates, Konoha Utility Poles/Cables) */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-700',
            isGenjutsuActive ? 'opacity-95' : 'opacity-45',
          )}
        >
          <svg
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
          >
            {/* Dark Ground Silhouette Ridge */}
            <path
              d="M 0 770 L 210 742 L 420 778 L 720 792 L 1030 775 L 1250 744 L 1440 768 L 1440 900 L 0 900 Z"
              fill="#040406"
            />

            {/* Left Flank: Tilted Tsukuyomi Crosses & Monoliths */}
            <g
              fill="#050508"
              stroke={isGenjutsuActive ? '#7F1D1D' : '#27272A'}
              strokeOpacity={isGenjutsuActive ? '0.65' : '0.45'}
              strokeWidth="1.2"
            >
              {/* Tall tilted Tsukuyomi cross (Left Outer) */}
              <g transform="translate(155 560) rotate(-13)">
                <rect x="-13" y="-210" width="26" height="420" />
                <rect x="-86" y="-128" width="172" height="22" />
              </g>
              {/* Secondary tilted monolith / cross (Left Inner) */}
              <g transform="translate(295 620) rotate(9)">
                <rect x="-9" y="-155" width="18" height="310" />
                <rect x="-56" y="-92" width="112" height="16" />
              </g>
              {/* Broken Torii Gate Silhouette (Lower Left) */}
              <g transform="translate(228 730)">
                <path d="M -68 -95 L 74 -108 L 78 -98 L -64 -84 Z" />
                <path d="M -52 -66 L 56 -76 L 56 -68 L -52 -58 Z" />
                <rect x="-42" y="-88" width="12" height="118" />
                <path d="M 28 -96 L 40 -96 L 40 -34 L 28 -44 Z" />
              </g>
            </g>

            {/* Right Flank: Tilted Tsukuyomi Monoliths & Broken Torii */}
            <g
              fill="#050508"
              stroke={isGenjutsuActive ? '#7F1D1D' : '#27272A'}
              strokeOpacity={isGenjutsuActive ? '0.65' : '0.45'}
              strokeWidth="1.2"
            >
              {/* Tall tilted Tsukuyomi cross (Right Outer) */}
              <g transform="translate(1285 570) rotate(12)">
                <rect x="-14" y="-215" width="28" height="430" />
                <rect x="-88" y="-132" width="176" height="22" />
              </g>
              {/* Leaning monolith slab (Right Inner) */}
              <g transform="translate(1152 636) rotate(-11)">
                <polygon points="-12,-170 12,-150 18,175 -16,175" />
              </g>
              {/* Broken Torii Pillar (Lower Right) */}
              <g transform="translate(1196 734)">
                <path d="M -62 -86 L 26 -96 L 18 -84 L -64 -76 Z" />
                <rect x="-46" y="-82" width="12" height="114" />
                <rect x="28" y="-48" width="11" height="80" />
              </g>
            </g>

            {/* Konoha Utility Poles & Sagging Catenary Cables */}
            <g
              stroke="#07070A"
              fill="#050508"
            >
              {/* Left Konoha Pole */}
              <rect x="74" y="210" width="9" height="585" />
              <rect x="44" y="248" width="68" height="5" />
              <rect x="52" y="290" width="52" height="4" />
              {/* Right Konoha Pole */}
              <rect x="1356" y="195" width="9" height="598" />
              <rect x="1324" y="232" width="70" height="5" />
              <rect x="1332" y="274" width="54" height="4" />

              {/* Sagging power cables across outer edges */}
              <path
                d="M -20 218 Q 34 252 78 248 Q 220 355 430 330"
                fill="none"
                stroke={isGenjutsuActive ? '#450A0A' : '#18181B'}
                strokeWidth="1.4"
                strokeOpacity="0.7"
              />
              <path
                d="M -20 264 Q 30 296 78 290 Q 210 390 390 368"
                fill="none"
                stroke={isGenjutsuActive ? '#450A0A' : '#18181B'}
                strokeWidth="1.1"
                strokeOpacity="0.55"
              />
              <path
                d="M 1010 318 Q 1210 352 1360 232 Q 1408 240 1460 210"
                fill="none"
                stroke={isGenjutsuActive ? '#450A0A' : '#18181B'}
                strokeWidth="1.4"
                strokeOpacity="0.7"
              />
              <path
                d="M 1050 358 Q 1230 388 1360 274 Q 1410 282 1460 256"
                fill="none"
                stroke={isGenjutsuActive ? '#450A0A' : '#18181B'}
                strokeWidth="1.1"
                strokeOpacity="0.55"
              />
            </g>
          </svg>
        </motion.div>

        {/* Layer -2: Subtle Rippling Floor Reflection at Bottom */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 h-[16vh] transition-opacity duration-700',
            isGenjutsuActive ? 'opacity-90' : 'opacity-40',
          )}
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(12, 2, 4, 0.72) 42%, rgba(0, 0, 0, 0.96) 100%)',
          }}
        >
          <div
            className="mx-auto mt-3 h-px w-[82%] opacity-40"
            style={{
              background: isGenjutsuActive
                ? 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.55) 50%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(82,82,91,0.35) 50%, transparent 100%)',
            }}
          />
          <motion.div
            animate={
              prefersReducedMotion
                ? { scaleX: 1, opacity: 0.25 }
                : { scaleX: [0.94, 1.06, 0.94], opacity: [0.16, 0.36, 0.16] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 5.5, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM_OPACITY}
            className="mx-auto mt-4 h-3 w-[48%] rounded-full blur-md"
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background: isGenjutsuActive
                  ? 'radial-gradient(ellipse at center, rgba(220, 38, 38, 0.42) 0%, rgba(0,0,0,0) 75%)'
                  : 'radial-gradient(ellipse at center, rgba(127, 29, 29, 0.18) 0%, rgba(0,0,0,0) 75%)',
              }}
            />
          </motion.div>
        </div>

        {/* Layer -1: 60fps Crow Feathers & Rising Crimson Embers Canvas */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}
      </div>

      {/* 1.1s Tsukuyomi Activation Cutscene (triggered when tsukuyomiCastNonce > 0 changes) */}
      {tsukuyomiCastNonce > 0 ? (
        <motion.div
          key={`tsukuyomi-cast-${tsukuyomiCastNonce}`}
          aria-hidden="true"
          initial={{ display: 'block', opacity: 1 }}
          animate={{
            opacity: [1, 1, 0],
            transitionEnd: { display: 'none' },
          }}
          transition={{
            duration: prefersReducedMotion ? 0.3 : 1.1,
            times: [0, 0.86, 1],
            type: 'tween',
            ease: 'linear',
          }}
          className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
        >
          {/* Brief Invert / Contrast Anime Distortion */}
          <motion.div
            initial={{ opacity: 0, filter: 'invert(0) contrast(1)' }}
            animate={
              prefersReducedMotion
                ? {
                    opacity: [0, 0.5, 0],
                    filter: [
                      'invert(0) contrast(1)',
                      'invert(1) contrast(1.2)',
                      'invert(0) contrast(1)',
                    ],
                  }
                : {
                    opacity: [0, 0.95, 0.72, 0],
                    filter: [
                      'invert(0) contrast(1)',
                      'invert(1) contrast(1.45)',
                      'invert(1) contrast(1.3)',
                      'invert(0) contrast(1)',
                    ],
                  }
            }
            transition={{
              duration: prefersReducedMotion ? 0.28 : 0.45,
              times: prefersReducedMotion ? [0, 0.5, 1] : [0, 0.2, 0.55, 1],
              type: 'tween',
              ease: 'easeInOut',
            }}
            style={{
              backdropFilter: 'invert(1) contrast(1.4)',
              WebkitBackdropFilter: 'invert(1) contrast(1.4)',
              willChange: 'opacity, filter',
            }}
            className="absolute inset-0 bg-red-950/20"
          />

          {/* Expanding Radial Crimson Shockwave Rings from Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.1, opacity: 0.95 }}
              animate={{
                scale: prefersReducedMotion ? [0.6, 1.4] : [0.1, 1.85, 3.3],
                opacity: prefersReducedMotion ? [0.6, 0] : [0.95, 0.55, 0],
              }}
              transition={{
                duration: prefersReducedMotion ? 0.28 : 1.05,
                times: prefersReducedMotion ? [0, 1] : [0, 0.45, 1],
                type: 'tween',
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                ...WILL_CHANGE_TRANSFORM_OPACITY,
                boxShadow:
                  '0 0 60px rgba(220, 38, 38, 0.85), inset 0 0 40px rgba(220, 38, 38, 0.45)',
              }}
              className="h-64 w-64 rounded-full border-2 border-red-500/90"
            />
            {!prefersReducedMotion && (
              <motion.div
                initial={{ scale: 0.08, opacity: 0 }}
                animate={{
                  scale: [0.08, 1.4, 2.7],
                  opacity: [0, 0.85, 0],
                }}
                transition={{
                  duration: 1.0,
                  delay: 0.08,
                  times: [0, 0.35, 1],
                  type: 'tween',
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={WILL_CHANGE_TRANSFORM_OPACITY}
                className="absolute h-52 w-52 rounded-full border border-red-400/80"
              />
            )}
          </div>

          {/* Dispersing Flock of Crow Silhouettes Flying Toward Camera */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 flex items-center justify-center">
              {CROW_FLOCK_VECTORS.map((crow) => (
                <motion.div
                  key={crow.id}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0.3,
                    opacity: 0,
                    rotate: crow.startRotate,
                  }}
                  animate={{
                    x: [0, crow.midX, crow.targetX],
                    y: [0, crow.midY, crow.targetY],
                    scale: [0.3, 1.35, 2.5],
                    opacity: [0, 1, 0],
                    rotate: [crow.startRotate, (crow.startRotate + crow.endRotate) / 2, crow.endRotate],
                  }}
                  transition={{
                    duration: 0.95,
                    delay: crow.delay,
                    times: [0, 0.42, 1],
                    type: 'tween',
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={WILL_CHANGE_TRANSFORM_OPACITY}
                  className="absolute"
                >
                  <CrowSilhouetteSvg />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ) : null}

      {/* Izanagi Luminance Inversion Overlay triggered whenever izanagiFlashNonce > 0 */}
      {izanagiFlashNonce > 0 ? (
        <motion.div
          key={izanagiFlashNonce}
          aria-hidden="true"
          initial={{
            display: 'block',
            opacity: 0,
            filter: 'invert(0) contrast(1)',
          }}
          animate={
            prefersReducedMotion
              ? {
                  opacity: [0, 0.65, 0],
                  filter: [
                    'invert(0) contrast(1)',
                    'invert(1) contrast(1.2)',
                    'invert(0) contrast(1)',
                  ],
                  transitionEnd: { display: 'none' },
                }
              : {
                  opacity: [0, 1, 0.9, 0],
                  filter: [
                    'invert(0) contrast(1)',
                    'invert(1) contrast(1.4)',
                    'invert(1) contrast(1.4)',
                    'invert(0) contrast(1)',
                  ],
                  transitionEnd: { display: 'none' },
                }
          }
          transition={{
            duration: prefersReducedMotion ? 0.25 : 0.7,
            type: 'tween',
            ease: 'easeInOut',
            times: prefersReducedMotion ? [0, 0.5, 1] : [0, 0.18, 0.55, 1],
          }}
          style={{
            backdropFilter: 'invert(1) contrast(1.4)',
            WebkitBackdropFilter: 'invert(1) contrast(1.4)',
            willChange: 'opacity, filter',
          }}
          className="pointer-events-none fixed inset-0 z-[100] bg-white/10"
        />
      ) : null}
    </>
  );
}
