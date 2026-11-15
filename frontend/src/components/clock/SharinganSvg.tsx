'use client';

import { memo, useEffect, useId } from 'react';
import {
  motion,
  useAnimate,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/cn';
import type { EyeStage, MangekyouVariant } from '@/types/tsukuyomi';

export interface SharinganSvgProps {
  stage: EyeStage;
  variant?: MangekyouVariant;
  className?: string;
  isAwakening?: boolean;
  isUrgent?: boolean;
  isSpinBurst?: boolean;
  pupilDilationNonce?: number;
  specularParallax?: {
    x: MotionValue<number>;
    y: MotionValue<number>;
  };
  hideCorneaSpecular?: boolean;
}

const TOMOE_ANGLES: Record<'tomoe_1' | 'tomoe_2' | 'tomoe_3', readonly number[]> = {
  tomoe_1: [0],
  tomoe_2: [0, 180],
  tomoe_3: [0, 120, 240],
};

function TomoeMark({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle} 100 100)`}>
      <circle cx="100" cy="46" r="7.8" fill="#09090B" />
      <path
        d="M 101.2 38.2 C 111.8 39 120.5 44.6 125 53.2 C 118.4 48.2 111.6 48.4 105.8 51.2 Z"
        fill="#09090B"
      />
    </g>
  );
}

function MangekyouPattern({
  variant,
  irisGradientId,
}: {
  variant: MangekyouVariant;
  irisGradientId: string;
}) {
  switch (variant) {
    case 'itachi':
      return (
        <g>
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 100 100)`}
              d="M 89 83 C 87 50 108 28 142 23 C 124 44 117 63 118 85 Z"
              fill="#09090B"
            />
          ))}
          <circle cx="100" cy="100" r="21" fill="#09090B" />
          <circle
            cx="100"
            cy="100"
            r="16.5"
            fill="none"
            stroke={`url(#${irisGradientId})`}
            strokeWidth="2.5"
          />
        </g>
      );

    case 'sasuke':
      return (
        <g>
          {/* Inverted black iris base with crimson 6-pointed atom */}
          <circle cx="100" cy="100" r="89" fill="#09090B" />
          {[0, 60, 120].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 100 100)`}
              d="M 100 14 C 130 48 130 152 100 186 C 70 152 70 48 100 14 Z"
              fill={`url(#${irisGradientId})`}
              fillOpacity="0.94"
              stroke="#09090B"
              strokeWidth="6.5"
              strokeLinejoin="round"
            />
          ))}
          {[0, 60, 120].map((angle) => (
            <path
              key={`inner-${angle}`}
              transform={`rotate(${angle} 100 100)`}
              d="M 100 14 C 130 48 130 152 100 186 C 70 152 70 48 100 14 Z"
              fill="none"
              stroke="#09090B"
              strokeWidth="4.5"
            />
          ))}
          <circle cx="100" cy="100" r="16" fill="#09090B" />
        </g>
      );

    case 'shisui':
      return (
        <g>
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 100 100)`}
              d="M 90 81 C 88 48 112 22 148 22 C 125 40 116 61 118 82 Z"
              fill="#09090B"
            />
          ))}
          <circle cx="100" cy="100" r="22" fill="#09090B" />
          <circle
            cx="100"
            cy="100"
            r="15.5"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2.5"
          />
        </g>
      );

    case 'obito':
      return (
        <g>
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 100 100)`}
              d="M 92 82 C 87 49 104 20 145 20 C 162 20 168 38 154 47 C 156 34 143 29 128 36 C 114 44 112 64 116 84 Z"
              fill="#09090B"
            />
          ))}
          <circle cx="100" cy="100" r="21" fill="#09090B" />
          <circle
            cx="100"
            cy="100"
            r="15.5"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2.2"
          />
        </g>
      );

    case 'madara':
      return (
        <g>
          <circle
            cx="100"
            cy="100"
            r="46"
            fill="none"
            stroke="#09090B"
            strokeWidth="9"
          />
          {[0, 120, 240].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 100 100)`}>
              <path
                d="M 104 42 C 135 42 157 62 164 89 C 148 69 129 59 104 57 Z"
                fill="#09090B"
              />
              <circle cx="100" cy="54" r="14.5" fill="#09090B" />
              <circle cx="100" cy="54" r="6.5" fill="#DC2626" />
            </g>
          ))}
          <circle cx="100" cy="100" r="18" fill="#09090B" />
        </g>
      );
  }
}

export const SharinganSvg = memo(function SharinganSvg({
  stage,
  variant = 'itachi',
  className,
  isAwakening = false,
  isUrgent = false,
  isSpinBurst = false,
  pupilDilationNonce = 0,
  specularParallax,
  hideCorneaSpecular = false,
}: SharinganSvgProps) {
  const prefersReducedMotion = useReducedMotion();
  const [pupilScope, animatePupil] = useAnimate<SVGCircleElement>();
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const irisGradId = `iris-grad-${safeId}`;
  const normalGradId = `normal-grad-${safeId}`;
  const rinneganGradId = `rinnegan-grad-${safeId}`;
  const shadowGradId = `limbal-shadow-${safeId}`;

  useEffect(() => {
    if (!pupilDilationNonce || prefersReducedMotion || !pupilScope.current) {
      return;
    }

    void animatePupil(
      pupilScope.current,
      { scale: [1, 1.18, 0.94, 1] },
      {
        type: 'tween',
        duration: 0.25,
        times: [0, 0.32, 0.7, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    );
  }, [pupilDilationNonce, prefersReducedMotion, animatePupil, pupilScope]);

  const isRinnegan = stage === 'rinnegan';
  const isNormal = stage === 'normal';
  const isTomoeStage =
    stage === 'tomoe_1' || stage === 'tomoe_2' || stage === 'tomoe_3';

  const irisFill = isRinnegan
    ? `url(#${rinneganGradId})`
    : isNormal
      ? `url(#${normalGradId})`
      : `url(#${irisGradId})`;

  const label = `Olho ${stage}${stage === 'mangekyou' ? ` (${variant})` : ''}`;
  const hasKineticCorona = isAwakening || isUrgent || isSpinBurst;
  const pupilRadius = isRinnegan
    ? 11
    : stage === 'normal'
      ? 18
      : isSpinBurst
        ? 15.5
        : 14;

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
      className={cn(
        'h-full w-full object-cover object-center origin-center select-none',
        className,
      )}
    >
      <defs>
        <radialGradient id={irisGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isUrgent || isSpinBurst ? '#EF4444' : '#DC2626'} />
          <stop offset="54%" stopColor={isUrgent ? '#DC2626' : '#B91C1C'} />
          <stop offset="85%" stopColor="#7F1D1D" />
          <stop offset="100%" stopColor="#450A0A" />
        </radialGradient>

        <radialGradient id={normalGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#27272A" />
          <stop offset="65%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#09090B" />
        </radialGradient>

        <radialGradient id={rinneganGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="48%" stopColor="#8B5CF6" />
          <stop offset="82%" stopColor="#5B21B6" />
          <stop offset="100%" stopColor="#2E1065" />
        </radialGradient>

        <radialGradient id={shadowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="rgba(0,0,0,0)" />
          <stop offset="91%" stopColor="rgba(9,9,11,0.58)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.94)" />
        </radialGradient>
      </defs>

      {/* Base Iris */}
      <circle cx="100" cy="100" r="96" fill={irisFill} />

      {/* Subtle Organic Iris Striations */}
      {!isRinnegan && (
        <g stroke="#09090B" strokeWidth="1">
          {Array.from({ length: 24 }, (_, idx) => {
            const angle = idx * 15;
            const isMajor = idx % 2 === 0;
            return (
              <line
                key={angle}
                x1="100"
                y1={isMajor ? 24 : 28}
                x2="100"
                y2={isMajor ? 43 : 39}
                strokeOpacity={
                  isNormal ? (isMajor ? 0.35 : 0.2) : isMajor ? 0.16 : 0.08
                }
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
          <circle
            cx="100"
            cy="100"
            r="32"
            fill="none"
            stroke="#09090B"
            strokeOpacity={isNormal ? 0.25 : 0.12}
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* Tomoe Stages */}
      {isTomoeStage && (
        <g>
          <circle
            cx="100"
            cy="100"
            r="54"
            fill="none"
            stroke="#09090B"
            strokeWidth="1.8"
            strokeOpacity="0.75"
          />
          {TOMOE_ANGLES[stage].map((angle) => (
            <TomoeMark key={angle} angle={angle} />
          ))}
        </g>
      )}

      {/* Mangekyou Sharingan */}
      {stage === 'mangekyou' && (
        <MangekyouPattern variant={variant} irisGradientId={irisGradId} />
      )}

      {/* Eternal Mangekyou Sharingan (Choku-Tomoe Fusion) */}
      {stage === 'ems' && (
        <g>
          <circle cx="100" cy="100" r="89" fill="#09090B" />
          {[0, 60, 120].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle} 100 100)`}
              d="M 100 15 C 128 46 128 154 100 185 C 72 154 72 46 100 15 Z"
              fill={`url(#${irisGradId})`}
              stroke="#09090B"
              strokeWidth="6"
            />
          ))}
          {[0, 120, 240].map((angle) => (
            <path
              key={`lancet-${angle}`}
              transform={`rotate(${angle} 100 100)`}
              d="M 94 24 L 100 14 L 106 24 L 103 84 L 97 84 Z"
              fill="#09090B"
              stroke="#DC2626"
              strokeWidth="1.4"
              strokeOpacity="0.82"
            />
          ))}
          <circle
            cx="100"
            cy="100"
            r="22"
            fill="#09090B"
            stroke="#DC2626"
            strokeWidth="2"
          />
        </g>
      )}

      {/* Rinnegan Concentric Ripples */}
      {isRinnegan && (
        <g
          fill="none"
          stroke="#1E1B4B"
          strokeWidth="2.1"
          strokeOpacity="0.82"
        >
          {[24, 37, 50, 63, 76, 87].map((radius) => (
            <circle key={radius} cx="100" cy="100" r={radius} />
          ))}
        </g>
      )}

      {/* Spherical Limbal Shading & Dark Limbal Ring */}
      <circle cx="100" cy="100" r="96" fill={`url(#${shadowGradId})`} />
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke="#09090B"
        strokeWidth="6"
      />

      {/* Awakening / Spin Burst / Urgency Inner Corona */}
      {hasKineticCorona && (
        <circle
          cx="100"
          cy="100"
          r="89"
          fill="none"
          stroke={isRinnegan ? '#C4B5FD' : '#EF4444'}
          strokeWidth={isSpinBurst || isAwakening ? '2.4' : '1.4'}
          strokeOpacity={isSpinBurst || isAwakening ? 0.85 : 0.55}
        />
      )}

      {/* Soft Biological Pupil Collarette Shadow */}
      <circle
        cx="100"
        cy="100"
        r={pupilRadius + 3}
        fill="#09090B"
        fillOpacity={isNormal ? 0.32 : 0.45}
      />

      {/* Central Absolute Black Pupil (supports saccadic dilation) */}
      <circle
        ref={pupilScope}
        cx="100"
        cy="100"
        r={pupilRadius}
        fill="#000000"
        style={{
          transformOrigin: 'center',
          transformBox: 'fill-box',
        }}
      />

      {/* Wet-lens Asymmetric Specular Highlights (for standalone rendering) */}
      {!hideCorneaSpecular && (
        <motion.g
          style={
            specularParallax
              ? { x: specularParallax.x, y: specularParallax.y }
              : undefined
          }
        >
          <ellipse
            cx="84"
            cy="79"
            rx="6.8"
            ry="3.6"
            transform="rotate(-32 84 79)"
            fill="#FFFFFF"
            fillOpacity={isNormal ? 0.34 : 0.48}
          />
          <circle cx="115" cy="116" r="2.1" fill="#FFFFFF" fillOpacity="0.22" />
          <path
            d="M 52 58 A 66 66 0 0 1 82 38"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={isNormal ? 0.1 : 0.16}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </motion.g>
      )}
    </svg>
  );
});
