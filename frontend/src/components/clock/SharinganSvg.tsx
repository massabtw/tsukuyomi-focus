'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import type { EyeStage, MangekyouVariant } from '@/types/tsukuyomi';

export interface SharinganSvgProps {
  stage: EyeStage;
  variant?: MangekyouVariant;
  className?: string;
  isAwakening?: boolean;
  isUrgent?: boolean;
}

const TOMOE_ANGLES: Record<'tomoe_1' | 'tomoe_2' | 'tomoe_3', readonly number[]> = {
  tomoe_1: [0],
  tomoe_2: [0, 180],
  tomoe_3: [0, 120, 240],
};

function TomoeMark({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle} 100 100)`}>
      <circle cx="100" cy="46" r="7.5" fill="#09090B" />
      <path
        d="M 101.5 38.6 C 111 39.5 119 44.5 123 51.8 C 117.5 47.5 111.5 48.2 106.2 50.4 Z"
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
              d="M 90 83 C 88 52 106 32 138 26 C 122 46 116 64 117 85 Z"
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
              d="M 100 15 C 129 48 129 152 100 185 C 71 152 71 48 100 15 Z"
              fill={`url(#${irisGradientId})`}
              fillOpacity="0.92"
              stroke="#09090B"
              strokeWidth="6.5"
              strokeLinejoin="round"
            />
          ))}
          {[0, 60, 120].map((angle) => (
            <path
              key={`inner-${angle}`}
              transform={`rotate(${angle} 100 100)`}
              d="M 100 15 C 129 48 129 152 100 185 C 71 152 71 48 100 15 Z"
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
              d="M 91 81 C 89 49 112 24 146 24 C 124 41 116 61 118 82 Z"
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
              d="M 93 82 C 88 51 104 22 142 22 C 158 22 164 38 152 46 C 154 34 142 30 128 36 C 114 44 112 64 116 84 Z"
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
                d="M 104 42 C 134 42 156 62 163 88 C 147 69 128 59 104 57 Z"
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

export function SharinganSvg({
  stage,
  variant = 'itachi',
  className,
  isAwakening = false,
  isUrgent = false,
}: SharinganSvgProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const irisGradId = `iris-grad-${safeId}`;
  const normalGradId = `normal-grad-${safeId}`;
  const rinneganGradId = `rinnegan-grad-${safeId}`;
  const shadowGradId = `limbal-shadow-${safeId}`;

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

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
      className={cn('h-full w-full select-none', className)}
    >
      <defs>
        <radialGradient id={irisGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isUrgent ? '#EF4444' : '#DC2626'} />
          <stop offset="55%" stopColor={isUrgent ? '#DC2626' : '#B91C1C'} />
          <stop offset="86%" stopColor="#7F1D1D" />
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
          <stop offset="72%" stopColor="rgba(0,0,0,0)" />
          <stop offset="93%" stopColor="rgba(9,9,11,0.55)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.92)" />
        </radialGradient>
      </defs>

      {/* Base Iris */}
      <circle cx="100" cy="100" r="93" fill={irisFill} />

      {/* Subtle organic iris striations */}
      {!isRinnegan && (
        <g stroke="#09090B" strokeWidth="1" strokeOpacity={isNormal ? 0.35 : 0.14}>
          {Array.from({ length: 16 }, (_, idx) => {
            const angle = idx * 22.5;
            return (
              <line
                key={angle}
                x1="100"
                y1="26"
                x2="100"
                y2="42"
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
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
              strokeOpacity="0.8"
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
      <circle cx="100" cy="100" r="93" fill={`url(#${shadowGradId})`} />
      <circle
        cx="100"
        cy="100"
        r="93"
        fill="none"
        stroke="#09090B"
        strokeWidth="6"
      />

      {/* Awakening / Urgency Inner Corona */}
      {(isAwakening || isUrgent) && (
        <circle
          cx="100"
          cy="100"
          r="89"
          fill="none"
          stroke={isRinnegan ? '#C4B5FD' : '#EF4444'}
          strokeWidth={isAwakening ? '2.2' : '1.4'}
          strokeOpacity={isAwakening ? 0.8 : 0.55}
        />
      )}

      {/* Central Absolute Black Pupil */}
      <circle
        cx="100"
        cy="100"
        r={isRinnegan ? 11 : stage === 'normal' ? 18 : 14}
        fill="#000000"
      />

      {/* Wet-lens Asymmetric Specular Highlights */}
      <ellipse
        cx="84"
        cy="79"
        rx="6.8"
        ry="3.6"
        transform="rotate(-32 84 79)"
        fill="#FFFFFF"
        fillOpacity={isNormal ? 0.34 : 0.45}
      />
      <circle cx="115" cy="116" r="2.1" fill="#FFFFFF" fillOpacity="0.2" />
    </svg>
  );
}
