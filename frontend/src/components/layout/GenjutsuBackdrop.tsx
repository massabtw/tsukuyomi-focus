'use client';

import { useEffect } from 'react';
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
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';

const BACKDROP_SPRING = {
  stiffness: 90,
  damping: 28,
  mass: 0.8,
} as const;

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;

interface EmberSpec {
  id: string;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
}

const GENJUTSU_EMBERS: readonly EmberSpec[] = [
  { id: 'ember-1', left: '14%', top: '24%', size: 3, duration: 7.5, delay: 0 },
  { id: 'ember-2', left: '82%', top: '18%', size: 2, duration: 9.2, delay: 1.1 },
  { id: 'ember-3', left: '28%', top: '72%', size: 2.5, duration: 8.4, delay: 2.3 },
  { id: 'ember-4', left: '71%', top: '66%', size: 3, duration: 10.1, delay: 0.7 },
  { id: 'ember-5', left: '49%', top: '14%', size: 2, duration: 8.8, delay: 1.8 },
  { id: 'ember-6', left: '90%', top: '48%', size: 2.5, duration: 9.6, delay: 2.9 },
];

export function GenjutsuBackdrop() {
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const izanagiFlashNonce = useTsukuyomiStore((s) => s.izanagiFlashNonce);
  const prefersReducedMotion = useReducedMotion();
  const factor = prefersReducedMotion ? 0 : 1;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const smoothX = useSpring(rawX, BACKDROP_SPRING);
  const smoothY = useSpring(rawY, BACKDROP_SPRING);

  // Plano -2 (Abismo & Vinheta): inverse slow drift (-0.015 to -0.025 feel)
  const abyssX = useTransform(smoothX, [-0.5, 0.5], [14 * factor, -14 * factor]);
  const abyssY = useTransform(smoothY, [-0.5, 0.5], [14 * factor, -14 * factor]);

  // Plano -1 (Geometria Naka & Linhas Genjutsu): inverse mid drift (-0.04 feel)
  const sealX = useTransform(smoothX, [-0.5, 0.5], [24 * factor, -24 * factor]);
  const sealY = useTransform(smoothY, [-0.5, 0.5], [24 * factor, -24 * factor]);

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

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-700',
          isTsukuyomiMode ? 'bg-[#000000]' : 'bg-[#09090B]',
        )}
      >
        {/* Plano -2: Abyss & Crimson Radial Vignette */}
        <motion.div
          style={{ x: abyssX, y: abyssY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-700',
            isTsukuyomiMode ? 'tsukuyomi-vignette opacity-100' : 'normal-vignette opacity-100',
          )}
        />

        {/* Plano -2: Static SVG feTurbulence stone micro-texture */}
        <div className="naka-stone-texture absolute inset-0" />

        {/* Plano -1: Tsukuyomi Genjutsu grid lines */}
        <motion.div
          style={{ x: sealX, y: sealY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'genjutsu-grid-lines absolute -inset-12 transition-opacity duration-700',
            isTsukuyomiMode
              ? 'animate-genjutsu-drift opacity-65'
              : 'opacity-20',
          )}
        />

        {/* Plano -1: Subtle Naka Shrine Seal Geometry (SVG wrapped in motion.div) */}
        <motion.div
          style={{ x: sealX, y: sealY, ...WILL_CHANGE_TRANSFORM }}
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

        {/* Plano -1: Subtle floating crimson particles (only tween keyframes) */}
        {!prefersReducedMotion &&
          GENJUTSU_EMBERS.map((ember) => (
            <motion.span
              key={ember.id}
              style={{
                left: ember.left,
                top: ember.top,
                width: ember.size,
                height: ember.size,
                willChange: 'transform, opacity',
              }}
              animate={{
                y: [0, -22, 0],
                opacity: isTsukuyomiMode ? [0.15, 0.7, 0.15] : [0.06, 0.28, 0.06],
              }}
              transition={{
                duration: ember.duration,
                delay: ember.delay,
                repeat: Infinity,
                type: 'tween',
                ease: 'easeInOut',
              }}
              className="absolute rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.65)]"
            />
          ))}
      </div>

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
