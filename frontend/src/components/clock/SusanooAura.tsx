'use client';

import { useEffect, useId } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/cn';
import {
  useSusanooStageOverride,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type {
  MangekyouVariant,
  SusanooStageOverride,
} from '@/types/tsukuyomi';

export interface SusanooAuraProps {
  progress: number;
  enabled: boolean;
  isRunning?: boolean;
  variant?: MangekyouVariant;
  stageOverride?: SusanooStageOverride;
  className?: string;
}

type SusanooPhase = 1 | 2 | 3;

interface SusanooPalette {
  primary: string;
  secondary: string;
  highlight: string;
  deep: string;
  glowRgba: string;
}

const SUSANOO_PALETTES: Record<MangekyouVariant, SusanooPalette> = {
  itachi: {
    primary: '#EF4444',
    secondary: '#F97316',
    highlight: '#FCA5A5',
    deep: '#7F1D1D',
    glowRgba: 'rgba(239, 68, 68, 0.5)',
  },
  sasuke: {
    primary: '#8B5CF6',
    secondary: '#5B21B6',
    highlight: '#C4B5FD',
    deep: '#2E1065',
    glowRgba: 'rgba(139, 92, 246, 0.5)',
  },
  shisui: {
    primary: '#10B981',
    secondary: '#059669',
    highlight: '#6EE7B7',
    deep: '#064E3B',
    glowRgba: 'rgba(16, 185, 129, 0.48)',
  },
  madara: {
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    highlight: '#93C5FD',
    deep: '#1E3A8A',
    glowRgba: 'rgba(59, 130, 246, 0.5)',
  },
  obito: {
    primary: '#38BDF8',
    secondary: '#0284C7',
    highlight: '#BAE6FD',
    deep: '#0C4A6E',
    glowRgba: 'rgba(56, 189, 248, 0.48)',
  },
};

interface RibSpec {
  id: number;
  depth: 'mid' | 'fg';
  rootX: number;
  rootY: number;
  ctrl1X: number;
  ctrl1Y: number;
  ctrl2X: number;
  ctrl2Y: number;
  tipX: number;
  tipY: number;
  thickness: number;
}

const CX = 260;
const CY = 260;

// 6 pairs of anatomical ribs hugging the OcularClock perimeter (r ≈ 186) across mid and fg depths.
const RIB_SPECS: readonly RibSpec[] = [
  {
    id: 1,
    depth: 'mid',
    rootX: 72,
    rootY: 102,
    ctrl1X: 204,
    ctrl1Y: 112,
    ctrl2X: 224,
    ctrl2Y: 154,
    tipX: 184,
    tipY: 196,
    thickness: 12,
  },
  {
    id: 2,
    depth: 'fg',
    rootX: 98,
    rootY: 128,
    ctrl1X: 226,
    ctrl1Y: 158,
    ctrl2X: 238,
    ctrl2Y: 212,
    tipX: 188,
    tipY: 244,
    thickness: 13,
  },
  {
    id: 3,
    depth: 'mid',
    rootX: 118,
    rootY: 164,
    ctrl1X: 246,
    ctrl1Y: 210,
    ctrl2X: 248,
    ctrl2Y: 266,
    tipX: 186,
    tipY: 296,
    thickness: 14,
  },
  {
    id: 4,
    depth: 'fg',
    rootX: 124,
    rootY: 210,
    ctrl1X: 242,
    ctrl1Y: 266,
    ctrl2X: 236,
    ctrl2Y: 322,
    tipX: 168,
    tipY: 350,
    thickness: 13,
  },
  {
    id: 5,
    depth: 'mid',
    rootX: 116,
    rootY: 262,
    ctrl1X: 226,
    ctrl1Y: 324,
    ctrl2X: 208,
    ctrl2Y: 374,
    tipX: 138,
    tipY: 398,
    thickness: 12,
  },
  {
    id: 6,
    depth: 'fg',
    rootX: 98,
    rootY: 316,
    ctrl1X: 198,
    ctrl1Y: 378,
    ctrl2X: 166,
    ctrl2Y: 426,
    tipX: 88,
    tipY: 444,
    thickness: 11,
  },
];

const VERTEBRA_Y_POSITIONS = [
  32, 60, 88, 116, 144, 172, 200, 228, 256, 284, 312, 340, 368, 396, 424, 452,
  480,
] as const;

const OUTER_RUNE_ANGLES = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
] as const;

const INNER_RUNE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

const PARALLAX_SPRING = { stiffness: 105, damping: 26, mass: 0.6 } as const;
const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const CONSTRUCTION_ORIGIN = { transformOrigin: 'bottom' } as const;

function getSusanooPhase(clampedProgress: number): SusanooPhase {
  if (clampedProgress >= 67) return 3;
  if (clampedProgress >= 34) return 2;
  return 1;
}

function sx(offsetX: number, side: -1 | 1): number {
  return CX + side * offsetX;
}

function buildSculptedRibPath(spec: RibSpec, side: -1 | 1): string {
  const rx = sx(spec.rootX, side);
  const c1x = sx(spec.ctrl1X, side);
  const c2x = sx(spec.ctrl2X, side);
  const tx = sx(spec.tipX, side);

  const innerC1x = sx(spec.ctrl1X - spec.thickness, side);
  const innerC2x = sx(spec.ctrl2X - spec.thickness * 0.9, side);
  const innerRootY = spec.rootY + spec.thickness * 0.85;

  return [
    `M ${rx} ${spec.rootY}`,
    `C ${c1x} ${spec.ctrl1Y}, ${c2x} ${spec.ctrl2Y}, ${tx} ${spec.tipY}`,
    `C ${innerC2x} ${spec.ctrl2Y + spec.thickness * 0.55}, ${innerC1x} ${spec.ctrl1Y + spec.thickness * 0.7}, ${rx} ${innerRootY}`,
    'Z',
  ].join(' ');
}

function buildRibRidgePath(spec: RibSpec, side: -1 | 1): string {
  const rx = sx(spec.rootX + 4, side);
  const c1x = sx(spec.ctrl1X - spec.thickness * 0.35, side);
  const c2x = sx(spec.ctrl2X - spec.thickness * 0.3, side);
  const tx = sx(spec.tipX + 3, side);
  return `M ${rx} ${spec.rootY + 3} C ${c1x} ${spec.ctrl1Y + 2}, ${c2x} ${spec.ctrl2Y + 2}, ${tx} ${spec.tipY - 1}`;
}

function renderFlankingArmaments(
  variant: MangekyouVariant,
  side: 'left' | 'right',
  palette: SusanooPalette,
  bladeGradId: string,
) {
  if (side === 'left') {
    switch (variant) {
      case 'sasuke':
        // Susanoo Greatbow & Kagutsuchi Arrow
        return (
          <g>
            <path
              d="M 28 104 C -14 156, -20 206, 0 258 C -20 310, -14 360, 28 414 C 10 362, 4 312, 22 260 C 4 208, 10 156, 28 104 Z"
              fill={`url(#${bladeGradId})`}
              fillOpacity="0.72"
              stroke={palette.highlight}
              strokeWidth="1.8"
            />
            <line
              x1="28"
              y1="108"
              x2="28"
              y2="410"
              stroke={palette.highlight}
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
            <path
              d="M -20 258 L 54 258 M -8 250 L -24 258 L -8 266"
              fill="none"
              stroke={palette.highlight}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        );
      case 'madara':
        // Left Twin Tengu Odachi Blade
        return (
          <g>
            <path
              d="M 22 396 L -4 146 L -18 82 L 8 140 L 36 392 Z"
              fill={`url(#${bladeGradId})`}
              fillOpacity="0.76"
              stroke={palette.highlight}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M 20 380 L -2 142 L -14 96"
              fill="none"
              stroke={palette.highlight}
              strokeWidth="1.3"
              strokeOpacity="0.92"
            />
            <rect
              x="10"
              y="388"
              width="30"
              height="6"
              rx="2"
              transform="rotate(-8 25 391)"
              fill={palette.deep}
              stroke={palette.highlight}
              strokeWidth="1.2"
            />
          </g>
        );
      case 'shisui':
      case 'obito':
      case 'itachi':
      default:
        // Yata Mirror / Variant Spiritual Ward Shield
        return (
          <g>
            <path
              d="M 22 166 L -14 204 L -18 310 L 22 350 L 44 308 L 44 210 Z"
              fill={palette.deep}
              fillOpacity="0.74"
              stroke={palette.primary}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M 20 182 L -6 212 L -10 302 L 20 336 L 36 298 L 36 216 Z"
              fill={`url(#${bladeGradId})`}
              fillOpacity="0.42"
              stroke={palette.highlight}
              strokeWidth="1.4"
            />
            <circle
              cx="14"
              cy="258"
              r="14"
              fill="none"
              stroke={palette.highlight}
              strokeWidth="1.6"
              strokeOpacity="0.9"
            />
            <circle
              cx="14"
              cy="258"
              r="5"
              fill={palette.highlight}
              fillOpacity="0.92"
            />
          </g>
        );
    }
  }

  // Right flanking armament
  switch (variant) {
    case 'shisui':
      // Twin-Spiral Emerald Chakra Lance
      return (
        <g>
          <path
            d="M 498 412 L 508 154 L 522 74 L 536 156 L 514 412 Z"
            fill={`url(#${bladeGradId})`}
            fillOpacity="0.76"
            stroke={palette.highlight}
            strokeWidth="1.8"
          />
          <path
            d="M 506 318 C 492 282, 538 254, 508 220 C 494 194, 536 170, 518 130"
            fill="none"
            stroke={palette.highlight}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    case 'obito':
      // Kamui Chakra Halberd Blade
      return (
        <g>
          <path
            d="M 494 412 L 504 124 L 524 72 L 540 140 L 516 176 L 508 414 Z"
            fill={`url(#${bladeGradId})`}
            fillOpacity="0.76"
            stroke={palette.highlight}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle
            cx="520"
            cy="128"
            r="7"
            fill={palette.deep}
            stroke={palette.highlight}
            strokeWidth="1.5"
          />
        </g>
      );
    case 'sasuke':
    case 'madara':
      // Right Odachi / Kagutsuchi Greatsword
      return (
        <g>
          <path
            d="M 484 396 L 512 146 L 532 80 L 528 152 L 500 398 Z"
            fill={`url(#${bladeGradId})`}
            fillOpacity="0.76"
            stroke={palette.highlight}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 492 382 L 516 148 L 528 94"
            fill="none"
            stroke={palette.highlight}
            strokeWidth="1.4"
            strokeOpacity="0.92"
          />
          <rect
            x="476"
            y="388"
            width="30"
            height="6"
            rx="2"
            transform="rotate(8 491 391)"
            fill={palette.deep}
            stroke={palette.highlight}
            strokeWidth="1.2"
          />
        </g>
      );
    case 'itachi':
    default:
      // Totsuka Spectral Gourd-Blade
      return (
        <g>
          {/* Ethereal Sake Gourd Hilt */}
          <path
            d="M 490 366 C 476 352, 476 334, 490 324 C 482 312, 488 296, 500 292 C 512 296, 518 312, 510 324 C 524 334, 524 352, 510 366 Z"
            fill={palette.deep}
            fillOpacity="0.86"
            stroke={palette.primary}
            strokeWidth="2"
          />
          {/* Flowing Spectral Blade Rising From Gourd */}
          <path
            d="M 500 294 C 494 232, 508 166, 534 80 C 532 152, 522 228, 510 294 Z"
            fill={`url(#${bladeGradId})`}
            fillOpacity="0.8"
            stroke={palette.highlight}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 502 288 C 504 226, 514 164, 530 96"
            fill="none"
            stroke={palette.highlight}
            strokeWidth="1.4"
            strokeOpacity="0.94"
          />
        </g>
      );
  }
}

function ChakraBladeGradientDef({
  id,
  palette,
}: {
  id: string;
  palette: SusanooPalette;
}) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor={palette.deep} stopOpacity="0.55" />
        <stop offset="50%" stopColor={palette.primary} stopOpacity="0.86" />
        <stop offset="100%" stopColor={palette.highlight} stopOpacity="0.98" />
      </linearGradient>
    </defs>
  );
}

interface SusanooStageLayersProps {
  effectiveStage: SusanooPhase;
  variant: MangekyouVariant;
  palette: SusanooPalette;
  isRunning: boolean;
  reducedMotion: boolean;
  bgParallaxX: ReturnType<typeof useTransform<number, number>>;
  bgParallaxY: ReturnType<typeof useTransform<number, number>>;
  fgParallaxX: ReturnType<typeof useTransform<number, number>>;
  fgParallaxY: ReturnType<typeof useTransform<number, number>>;
}

function SusanooStageLayers({
  effectiveStage,
  variant,
  palette,
  isRunning,
  reducedMotion,
  bgParallaxX,
  bgParallaxY,
  fgParallaxX,
  fgParallaxY,
}: SusanooStageLayersProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');

  const fireBgId = `susanoo-fire-bg-${safeId}`;
  const fireMidId = `susanoo-fire-mid-${safeId}`;
  const fireFgId = `susanoo-fire-fg-${safeId}`;
  const flameGradId = `susanoo-flame-${safeId}`;
  const spineGradId = `susanoo-spine-${safeId}`;
  const ribMidGradId = `susanoo-rib-mid-${safeId}`;
  const ribFgGradId = `susanoo-rib-fg-${safeId}`;
  const armorGradId = `susanoo-armor-${safeId}`;
  const wingGradId = `susanoo-wing-${safeId}`;
  const bladeGradId = `susanoo-blade-${safeId}`;

  const breathDuration = isRunning ? 3.1 : 4.6;
  const outerRuneDuration = isRunning ? 26 : 44;
  const innerRuneDuration = isRunning ? 19 : 32;

  const midRibs = RIB_SPECS.filter((r) => r.depth === 'mid');
  const fgRibs = RIB_SPECS.filter((r) => r.depth === 'fg');

  return (
    <motion.div
      initial={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0.25,
              scaleY: 0.72,
              clipPath: 'inset(100% 0% 0% 0%)',
            }
      }
      animate={
        reducedMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              scaleY: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
            }
      }
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 1.04,
            }
      }
      transition={{
        duration: reducedMotion ? 0.16 : 0.72,
        ease: CINEMATIC_EASE,
      }}
      style={CONSTRUCTION_ORIGIN}
      className="absolute inset-0 will-change-transform"
    >
      {/* Brief Spiritual Activation Flash on Stage / Variant / Enable */}
      {!reducedMotion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: [0, 0.78, 0],
            scale: [0.85, 1.12, 1.24],
          }}
          transition={{
            type: 'tween',
            duration: 0.68,
            times: [0, 0.22, 1],
            ease: 'easeOut',
          }}
          style={{
            background: `radial-gradient(circle at center, ${palette.highlight}66 0%, ${palette.primary}38 38%, transparent 72%)`,
          }}
          className="pointer-events-none absolute -inset-6 rounded-full will-change-transform"
        />
      )}

      {/* =================================================================== */}
      {/* DEPTH 1 (BG): Living Fire Silhouette, Dorsal Spine, Wings, Outer Runes */}
      {/* =================================================================== */}
      <motion.div
        style={{ x: bgParallaxX, y: bgParallaxY }}
        className="absolute inset-0 will-change-transform"
      >
        {/* Ambient BG Float + Living Flame Pulse */}
        <motion.div
          animate={
            reducedMotion
              ? { y: 0, scaleY: 1, scaleX: 1, opacity: 0.85 }
              : {
                  y: [0, -4, 0],
                  scaleY: [0.97, 1.045, 0.97],
                  scaleX: [1.01, 0.985, 1.01],
                  opacity: [0.7, 0.98, 0.7],
                }
          }
          transition={
            reducedMotion
              ? { duration: 0.2 }
              : {
                  type: 'tween',
                  ease: 'easeInOut',
                  duration: isRunning ? 2.4 : 3.8,
                  repeat: Infinity,
                }
          }
          style={CONSTRUCTION_ORIGIN}
          className="absolute inset-0 will-change-transform"
        >
          <svg
            viewBox="0 0 520 520"
            className="h-full w-full overflow-visible"
            style={{
              filter: `drop-shadow(0 0 18px ${palette.glowRgba})`,
            }}
          >
            <defs>
              <filter
                id={fireBgId}
                filterUnits="userSpaceOnUse"
                x="-60"
                y="-60"
                width="640"
                height="640"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.023 0.046"
                  numOctaves="3"
                  seed="7"
                  result="turbulence"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="turbulence"
                  scale="18"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displaced"
                />
                <feGaussianBlur
                  in="displaced"
                  stdDeviation="4"
                  result="softGlow"
                />
                <feMerge>
                  <feMergeNode in="softGlow" />
                  <feMergeNode in="displaced" />
                </feMerge>
              </filter>

              <linearGradient
                id={flameGradId}
                x1="50%"
                y1="100%"
                x2="50%"
                y2="0%"
              >
                <stop offset="0%" stopColor={palette.deep} stopOpacity="0.18" />
                <stop
                  offset="52%"
                  stopColor={palette.secondary}
                  stopOpacity="0.58"
                />
                <stop
                  offset="100%"
                  stopColor={palette.highlight}
                  stopOpacity="0.88"
                />
              </linearGradient>
            </defs>

            {/* Real Turbulent Spiritual Chakra Fire Aura (feTurbulence + feDisplacementMap) */}
            <g filter={`url(#${fireBgId})`}>
              {([-1, 1] as const).map((side) => (
                <g key={`bg-fire-${side}`}>
                  <path
                    d={[
                      `M ${sx(168, side)} 428`,
                      `C ${sx(234, side)} 372, ${sx(258, side)} 296, ${sx(246, side)} 214`,
                      `C ${sx(264, side)} 164, ${sx(248, side)} 102, ${sx(196, side)} 64`,
                      `C ${sx(216, side)} 104, ${sx(212, side)} 146, ${sx(186, side)} 172`,
                      `C ${sx(218, side)} 228, ${sx(218, side)} 326, ${sx(156, side)} 406`,
                      'Z',
                    ].join(' ')}
                    fill={`url(#${flameGradId})`}
                    fillOpacity="0.56"
                  />

                  {effectiveStage >= 2 && (
                    <path
                      d={[
                        `M ${sx(108, side)} 106`,
                        `C ${sx(144, side)} 58, ${sx(128, side)} 18, ${sx(166, side)} -10`,
                        `C ${sx(160, side)} 26, ${sx(182, side)} 56, ${sx(218, side)} 82`,
                        `C ${sx(194, side)} 98, ${sx(156, side)} 106, ${sx(108, side)} 106`,
                        'Z',
                      ].join(' ')}
                      fill={`url(#${flameGradId})`}
                      fillOpacity="0.64"
                    />
                  )}

                  {effectiveStage === 3 && (
                    <path
                      d={[
                        `M ${sx(186, side)} 132`,
                        `C ${sx(264, side)} 82, ${sx(288, side)} 136, ${sx(274, side)} 214`,
                        `C ${sx(286, side)} 258, ${sx(264, side)} 326, ${sx(218, side)} 364`,
                        `C ${sx(234, side)} 292, ${sx(232, side)} 206, ${sx(186, side)} 132`,
                        'Z',
                      ].join(' ')}
                      fill={`url(#${flameGradId})`}
                      fillOpacity="0.62"
                    />
                  )}
                </g>
              ))}

              {/* Upper Crown Flame Pillar */}
              <path
                d="M 232 90 C 218 46, 244 8, 260 -22 C 276 8, 302 46, 288 90 Z"
                fill={`url(#${flameGradId})`}
                fillOpacity={effectiveStage === 1 ? 0.35 : 0.64}
              />
            </g>
          </svg>
        </motion.div>

        {/* Dorsal Spine Column & Tengu Wing Mantle (steady BG float) */}
        <motion.div
          animate={
            reducedMotion
              ? { y: 0, scale: 1 }
              : {
                  y: [0, -4, 0],
                  scale: [1, 1.015, 1],
                }
          }
          transition={
            reducedMotion
              ? { duration: 0.2 }
              : {
                  type: 'tween',
                  ease: 'easeInOut',
                  duration: 5.2,
                  repeat: Infinity,
                }
          }
          className="absolute inset-0 will-change-transform"
        >
          <svg
            viewBox="0 0 520 520"
            className="h-full w-full overflow-visible"
            style={{
              filter: `drop-shadow(0 0 14px ${palette.glowRgba})`,
            }}
          >
            <defs>
              <linearGradient
                id={spineGradId}
                x1="50%"
                y1="0%"
                x2="50%"
                y2="100%"
              >
                <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.9" />
                <stop offset="50%" stopColor={palette.primary} stopOpacity="0.72" />
                <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.4" />
              </linearGradient>

              <linearGradient
                id={wingGradId}
                x1="50%"
                y1="0%"
                x2="50%"
                y2="100%"
              >
                <stop offset="0%" stopColor={palette.primary} stopOpacity="0.58" />
                <stop offset="55%" stopColor={palette.secondary} stopOpacity="0.34" />
                <stop offset="100%" stopColor={palette.deep} stopOpacity="0.14" />
              </linearGradient>
            </defs>

            {/* Phase 1+ Central Dorsal Spine Column (bg depth) */}
            <g>
              <line
                x1={CX}
                y1={24}
                x2={CX}
                y2={490}
                stroke={palette.secondary}
                strokeWidth="12"
                strokeOpacity="0.22"
                strokeLinecap="round"
              />
              <line
                x1={CX}
                y1={24}
                x2={CX}
                y2={490}
                stroke={`url(#${spineGradId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {VERTEBRA_Y_POSITIONS.map((vy) => (
                <g key={vy}>
                  <path
                    d={`M ${CX - 15} ${vy} L ${CX} ${vy - 10} L ${CX + 15} ${vy} L ${CX + 8} ${vy + 8} L ${CX - 8} ${vy + 8} Z`}
                    fill={palette.deep}
                    fillOpacity="0.72"
                    stroke={palette.primary}
                    strokeWidth="1.4"
                    strokeOpacity="0.78"
                  />
                  <line
                    x1={CX}
                    y1={vy - 6}
                    x2={CX}
                    y2={vy + 5}
                    stroke={palette.highlight}
                    strokeWidth="1.6"
                    strokeOpacity="0.88"
                  />
                </g>
              ))}
            </g>

            {/* Phase 3 Blazing Tengu Chakra Wing Mantle (bg depth) */}
            {effectiveStage === 3 &&
              ([-1, 1] as const).map((side) => (
                <g key={`wing-mantle-${side}`}>
                  {/* 4 Sweeping Flight Armor Blades per Wing */}
                  <path
                    d={[
                      `M ${sx(144, side)} 114`,
                      `C ${sx(216, side)} 42, ${sx(278, side)} 44, ${sx(290, side)} 110`,
                      `C ${sx(252, side)} 104, ${sx(226, side)} 122, ${sx(212, side)} 146`,
                      `C ${sx(256, side)} 128, ${sx(286, side)} 162, ${sx(278, side)} 214`,
                      `C ${sx(242, side)} 192, ${sx(218, side)} 196, ${sx(202, side)} 216`,
                      `C ${sx(250, side)} 214, ${sx(266, side)} 256, ${sx(248, side)} 306`,
                      `C ${sx(222, side)} 274, ${sx(198, side)} 270, ${sx(182, side)} 284`,
                      `C ${sx(218, side)} 308, ${sx(222, side)} 348, ${sx(192, side)} 380`,
                      `C ${sx(176, side)} 340, ${sx(156, side)} 318, ${sx(132, side)} 308`,
                      'Z',
                    ].join(' ')}
                    fill={`url(#${wingGradId})`}
                    stroke={palette.primary}
                    strokeWidth="2"
                    strokeOpacity="0.85"
                    strokeLinejoin="round"
                  />
                  {/* Wing Pinion Ridge Lines */}
                  <path
                    d={`M ${sx(172, side)} 122 C ${sx(224, side)} 82, ${sx(258, side)} 84, ${sx(276, side)} 106`}
                    fill="none"
                    stroke={palette.highlight}
                    strokeWidth="1.4"
                    strokeOpacity="0.72"
                  />
                  <path
                    d={`M ${sx(196, side)} 178 C ${sx(234, side)} 158, ${sx(256, side)} 172, ${sx(268, side)} 202`}
                    fill="none"
                    stroke={palette.highlight}
                    strokeWidth="1.2"
                    strokeOpacity="0.62"
                  />
                  <path
                    d={`M ${sx(190, side)} 248 C ${sx(222, side)} 240, ${sx(238, side)} 264, ${sx(240, side)} 292`}
                    fill="none"
                    stroke={palette.highlight}
                    strokeWidth="1.2"
                    strokeOpacity="0.56"
                  />
                </g>
              ))}
          </svg>
        </motion.div>

        {/* Phase 3 Outer Counter-Rotating Orbital Seal Runes (+360 linear tween) */}
        {effectiveStage === 3 && (
          <motion.div
            animate={reducedMotion ? { rotate: 0 } : { rotate: 360 }}
            transition={
              reducedMotion
                ? { duration: 0.2 }
                : {
                    type: 'tween',
                    ease: 'linear',
                    duration: outerRuneDuration,
                    repeat: Infinity,
                  }
            }
            className="absolute inset-0 will-change-transform"
          >
            <svg viewBox="0 0 520 520" className="h-full w-full overflow-visible">
              <circle
                cx={CX}
                cy={CY}
                r={234}
                fill="none"
                stroke={palette.primary}
                strokeWidth="1.4"
                strokeOpacity="0.38"
                strokeDasharray="10 8"
              />
              <circle
                cx={CX}
                cy={CY}
                r={222}
                fill="none"
                stroke={palette.highlight}
                strokeWidth="1"
                strokeOpacity="0.28"
              />
              {OUTER_RUNE_ANGLES.map((angle) => {
                const isCardinal = angle % 90 === 0;
                return (
                  <g
                    key={`outer-rune-${angle}`}
                    transform={`rotate(${angle} ${CX} ${CY})`}
                  >
                    <polygon
                      points={
                        isCardinal
                          ? `${CX},14 ${CX + 6},26 ${CX},38 ${CX - 6},26`
                          : `${CX},20 ${CX + 4},28 ${CX},35 ${CX - 4},28`
                      }
                      fill={isCardinal ? palette.highlight : palette.primary}
                      fillOpacity={isCardinal ? 0.85 : 0.55}
                    />
                    <path
                      d={`M ${CX - 9} 30 L ${CX} 22 L ${CX + 9} 30`}
                      fill="none"
                      stroke={palette.highlight}
                      strokeWidth="1.1"
                      strokeOpacity="0.65"
                    />
                  </g>
                );
              })}
            </svg>
          </motion.div>
        )}
      </motion.div>

      {/* =================================================================== */}
      {/* DEPTH 2 (MID): Posterior Ribcage, Clavicles, Inner Pauldrons, Runes */}
      {/* =================================================================== */}
      <motion.div
        animate={
          reducedMotion
            ? { scaleX: 1, scaleY: 1, y: 0 }
            : {
                scaleX: [1, 1.03, 1],
                scaleY: [1, 1.016, 1],
                y: [0, -6, 0],
              }
        }
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : {
                type: 'tween',
                ease: 'easeInOut',
                duration: breathDuration,
                repeat: Infinity,
              }
        }
        className="absolute inset-0 will-change-transform"
      >
        <svg viewBox="0 0 520 520" className="h-full w-full overflow-visible">
          <defs>
            <filter
              id={fireMidId}
              filterUnits="userSpaceOnUse"
              x="-50"
              y="-50"
              width="620"
              height="620"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.03 0.055"
                numOctaves="2"
                seed="19"
                result="turbulence"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="turbulence"
                scale="12"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>

            <linearGradient
              id={ribMidGradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.82" />
              <stop offset="55%" stopColor={palette.primary} stopOpacity="0.64" />
              <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.34" />
            </linearGradient>

            <linearGradient
              id={armorGradId}
              x1="50%"
              y1="0%"
              x2="50%"
              y2="100%"
            >
              <stop offset="0%" stopColor={palette.primary} stopOpacity="0.72" />
              <stop offset="65%" stopColor={palette.deep} stopOpacity="0.78" />
              <stop offset="100%" stopColor="#09090B" stopOpacity="0.88" />
            </linearGradient>
          </defs>

          {/* Soft Outer Spectral Chakra Rim Encircling All 6 Rib Pairs */}
          <g filter={`url(#${fireMidId})`} opacity="0.42">
            {RIB_SPECS.map((spec) =>
              ([-1, 1] as const).map((side) => (
                <path
                  key={`aura-rib-${spec.id}-${side}`}
                  d={buildSculptedRibPath(spec, side)}
                  fill="none"
                  stroke={palette.secondary}
                  strokeWidth="8"
                  strokeOpacity="0.55"
                />
              )),
            )}
          </g>

          {/* Mid-Depth Rib Pairs (Pairs 1, 3, 5) */}
          <g>
            {midRibs.map((spec) =>
              ([-1, 1] as const).map((side) => (
                <g key={`mid-rib-${spec.id}-${side}`}>
                  <path
                    d={buildSculptedRibPath(spec, side)}
                    fill={`url(#${ribMidGradId})`}
                    stroke={palette.primary}
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                    strokeLinejoin="round"
                  />
                  <path
                    d={buildRibRidgePath(spec, side)}
                    fill="none"
                    stroke={palette.highlight}
                    strokeWidth="1.3"
                    strokeOpacity="0.82"
                    strokeLinecap="round"
                  />
                </g>
              )),
            )}
          </g>

          {/* Phase 2+ Jagged Skeletal Clavicles & Shoulder Blades */}
          {effectiveStage >= 2 &&
            ([-1, 1] as const).map((side) => (
              <g key={`clavicle-${side}`}>
                <path
                  d={[
                    `M ${sx(36, side)} 74`,
                    `L ${sx(118, side)} 64`,
                    `L ${sx(188, side)} 88`,
                    `L ${sx(218, side)} 58`,
                    `L ${sx(196, side)} 110`,
                    `L ${sx(128, side)} 92`,
                    `L ${sx(52, side)} 92`,
                    'Z',
                  ].join(' ')}
                  fill={palette.deep}
                  fillOpacity="0.72"
                  stroke={palette.primary}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${sx(44, side)} 78 L ${sx(118, side)} 68 L ${sx(186, side)} 92 L ${sx(212, side)} 66`}
                  fill="none"
                  stroke={palette.highlight}
                  strokeWidth="1.5"
                  strokeOpacity="0.88"
                  strokeLinecap="round"
                />
              </g>
            ))}

          {/* Phase 3 Inner Armored Pauldrons & Kusazuri Skirt Plates */}
          {effectiveStage === 3 &&
            ([-1, 1] as const).map((side) => (
              <g key={`mid-pauldron-${side}`}>
                <path
                  d={`M ${sx(156, side)} 78 L ${sx(228, side)} 96 L ${sx(242, side)} 146 L ${sx(182, side)} 136 Z`}
                  fill={`url(#${armorGradId})`}
                  stroke={palette.primary}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${sx(182, side)} 142 L ${sx(246, side)} 158 L ${sx(248, side)} 206 L ${sx(192, side)} 192 Z`}
                  fill={`url(#${armorGradId})`}
                  stroke={palette.primary}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                {/* Lower Samurai Skirt Waistguard Accent */}
                <path
                  d={`M ${sx(108, side)} 420 L ${sx(152, side)} 444 L ${sx(132, side)} 478 L ${sx(82, side)} 452 Z`}
                  fill={`url(#${armorGradId})`}
                  stroke={palette.highlight}
                  strokeWidth="1.4"
                  strokeOpacity="0.78"
                />
              </g>
            ))}
        </svg>

        {/* Phase 3 Inner Counter-Rotating Orbital Seal Runes (-360 linear tween) */}
        {effectiveStage === 3 && (
          <motion.div
            animate={reducedMotion ? { rotate: 0 } : { rotate: -360 }}
            transition={
              reducedMotion
                ? { duration: 0.2 }
                : {
                    type: 'tween',
                    ease: 'linear',
                    duration: innerRuneDuration,
                    repeat: Infinity,
                  }
            }
            className="absolute inset-0 will-change-transform"
          >
            <svg viewBox="0 0 520 520" className="h-full w-full overflow-visible">
              <circle
                cx={CX}
                cy={CY}
                r={202}
                fill="none"
                stroke={palette.highlight}
                strokeWidth="1.2"
                strokeOpacity="0.44"
                strokeDasharray="4 10"
              />
              {INNER_RUNE_ANGLES.map((angle) => (
                <g
                  key={`inner-rune-${angle}`}
                  transform={`rotate(${angle} ${CX} ${CY})`}
                >
                  <circle
                    cx={CX}
                    cy={58}
                    r={3.5}
                    fill={palette.highlight}
                    fillOpacity="0.85"
                  />
                  <circle
                    cx={CX}
                    cy={58}
                    r={6.5}
                    fill="none"
                    stroke={palette.primary}
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                </g>
              ))}
            </svg>
          </motion.div>
        )}
      </motion.div>

      {/* =================================================================== */}
      {/* DEPTH 3 (FG): Anterior Rib Claws, Skull/Tengu Helm, Pauldrons, Weapons */}
      {/* =================================================================== */}
      <motion.div
        style={{ x: fgParallaxX, y: fgParallaxY }}
        className="absolute inset-0 will-change-transform"
      >
        {/* Phased Thoracic Breathing in FG Depth (offset phase for 2.5D volume) */}
        <motion.div
          animate={
            reducedMotion
              ? { scaleX: 1, scaleY: 1, y: 0 }
              : {
                  scaleX: [1, 1.038, 1],
                  scaleY: [1, 1.022, 1],
                  y: [0, -8, 0],
                }
          }
          transition={
            reducedMotion
              ? { duration: 0.2 }
              : {
                  type: 'tween',
                  ease: 'easeInOut',
                  duration: breathDuration,
                  delay: 0.28,
                  repeat: Infinity,
                }
          }
          className="absolute inset-0 will-change-transform"
        >
          <svg viewBox="0 0 520 520" className="h-full w-full overflow-visible">
            <defs>
              <filter
                id={fireFgId}
                filterUnits="userSpaceOnUse"
                x="-40"
                y="-40"
                width="600"
                height="600"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.036 0.065"
                  numOctaves="2"
                  seed="31"
                  result="turbulence"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="turbulence"
                  scale="10"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>

              <linearGradient
                id={ribFgGradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.95" />
                <stop offset="48%" stopColor={palette.primary} stopOpacity="0.82" />
                <stop offset="100%" stopColor={palette.deep} stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {/* FG Rib Pairs (Pairs 2, 4, 6) + Sternum Xiphoid Clasp */}
            <g>
              {fgRibs.map((spec) =>
                ([-1, 1] as const).map((side) => (
                  <g key={`fg-rib-${spec.id}-${side}`}>
                    <path
                      d={buildSculptedRibPath(spec, side)}
                      fill={`url(#${ribFgGradId})`}
                      stroke={palette.highlight}
                      strokeWidth="1.6"
                      strokeOpacity="0.9"
                      strokeLinejoin="round"
                    />
                    <path
                      d={buildRibRidgePath(spec, side)}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      strokeOpacity="0.45"
                      strokeLinecap="round"
                    />
                  </g>
                )),
              )}

              {/* Bottom Xiphoid Sternum Clasp framing base of clock */}
              <path
                d="M 218 446 L 260 476 L 302 446 L 278 456 L 260 492 L 242 456 Z"
                fill={palette.deep}
                fillOpacity="0.8"
                stroke={palette.highlight}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </g>

            {/* Phase 2: Horned Spectral Warrior Skull above the Clock */}
            {effectiveStage === 2 && (
              <g>
                {/* Fiery Chakra Hair Crest around Skull */}
                <path
                  filter={`url(#${fireFgId})`}
                  d="M 216 42 C 208 14, 232 -6, 260 -18 C 288 -6, 312 14, 304 42 Z"
                  fill={palette.secondary}
                  fillOpacity="0.5"
                />
                {/* Oni / Warrior Skull Horns */}
                {([-1, 1] as const).map((side) => (
                  <path
                    key={`skull-horn-${side}`}
                    d={`M ${sx(26, side)} 24 C ${sx(52, side)} 8, ${sx(72, side)} -6, ${sx(66, side)} -22 C ${sx(56, side)} -4, ${sx(38, side)} 10, ${sx(18, side)} 16 Z`}
                    fill={palette.primary}
                    fillOpacity="0.88"
                    stroke={palette.highlight}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                ))}
                {/* Cranium & Cheekbones */}
                <path
                  d="M 226 24 C 226 -2, 294 -2, 294 24 L 302 46 L 288 68 L 274 62 L 268 76 L 260 66 L 252 76 L 246 62 L 232 68 L 218 46 Z"
                  fill={palette.deep}
                  fillOpacity="0.88"
                  stroke={palette.highlight}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                {/* Cranial Brow Crest & Nasal Fissure */}
                <path
                  d="M 260 6 L 260 32 M 256 48 L 260 38 L 264 48 Z"
                  fill={palette.highlight}
                  stroke={palette.highlight}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Slanted Dark Orbital Sockets + Glowing Spiritual Eyes */}
                {([-1, 1] as const).map((side) => (
                  <g key={`skull-eye-${side}`}>
                    <path
                      d={`M ${sx(8, side)} 34 L ${sx(32, side)} 27 L ${sx(30, side)} 42 L ${sx(10, side)} 44 Z`}
                      fill="#09090B"
                      fillOpacity="0.92"
                    />
                    <path
                      d={`M ${sx(11, side)} 36 L ${sx(28, side)} 31 L ${sx(24, side)} 40 Z`}
                      fill={palette.highlight}
                    />
                    <circle cx={sx(19, side)} cy={36} r="2.2" fill="#FFFFFF" />
                  </g>
                ))}
              </g>
            )}

            {/* Phase 3: Complete Fierce Long-Nosed Tengu Helm/Mask & Outer Pauldrons */}
            {effectiveStage === 3 && (
              <g>
                {/* Sweeping Samurai Maedate Horns (variant-styled) */}
                {([-1, 1] as const).map((side) => (
                  <g key={`tengu-horn-${side}`}>
                    <path
                      d={
                        variant === 'madara'
                          ? `M ${sx(18, side)} 14 C ${sx(56, side)} -6, ${sx(88, side)} -22, ${sx(104, side)} -30 C ${sx(84, side)} -8, ${sx(62, side)} 12, ${sx(34, side)} 26 Z`
                          : `M ${sx(16, side)} 16 C ${sx(48, side)} -4, ${sx(82, side)} -16, ${sx(94, side)} -26 C ${sx(76, side)} 2, ${sx(54, side)} 18, ${sx(32, side)} 28 Z`
                      }
                      fill={palette.highlight}
                      fillOpacity="0.92"
                      stroke={palette.primary}
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    {/* Kabuto Shikoro Flared Neck Armor Flaps */}
                    <path
                      d={`M ${sx(38, side)} 24 L ${sx(76, side)} 44 L ${sx(84, side)} 74 L ${sx(48, side)} 64 Z`}
                      fill={palette.deep}
                      fillOpacity="0.88"
                      stroke={palette.primary}
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}

                {/* Tengu Kabuto Helm Dome */}
                <path
                  d="M 218 24 C 218 -8, 302 -8, 302 24 L 312 48 L 288 74 L 260 80 L 232 74 L 208 48 Z"
                  fill={palette.deep}
                  fillOpacity="0.92"
                  stroke={palette.highlight}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Forehead Crest Gem */}
                <polygon
                  points="260,-2 267,10 260,22 253,10"
                  fill={palette.highlight}
                  stroke={palette.primary}
                  strokeWidth="1.2"
                />

                {/* Fierce Glowing Eyes Beneath Tengu Visor */}
                {([-1, 1] as const).map((side) => (
                  <g key={`tengu-eye-${side}`}>
                    <path
                      d={`M ${sx(9, side)} 34 L ${sx(34, side)} 26 L ${sx(32, side)} 40 L ${sx(11, side)} 42 Z`}
                      fill="#09090B"
                    />
                    <path
                      d={`M ${sx(12, side)} 35 L ${sx(30, side)} 29 L ${sx(26, side)} 38 Z`}
                      fill={palette.highlight}
                    />
                    <circle cx={sx(21, side)} cy={34} r="2" fill="#FFFFFF" />
                  </g>
                ))}

                {/* Prominent Long-Nosed Tengu Mask Bridge */}
                <path
                  d="M 252 30 L 260 22 L 268 30 L 265 68 L 260 76 L 255 68 Z"
                  fill={palette.primary}
                  stroke={palette.highlight}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <line
                  x1={260}
                  y1={24}
                  x2={260}
                  y2={72}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
                />

                {/* Tengu Mask Grimacing Mouth / Side Cheek Guards */}
                <path
                  d="M 238 62 L 252 58 L 260 64 L 268 58 L 282 62 L 274 72 L 260 70 L 246 72 Z"
                  fill="#09090B"
                  stroke={palette.highlight}
                  strokeWidth="1.2"
                />

                {/* Outer Laminar Samurai Sode Pauldrons (fg layer) */}
                {([-1, 1] as const).map((side) => (
                  <g key={`fg-pauldron-${side}`}>
                    {/* Shoulder Horn Spike */}
                    <path
                      d={`M ${sx(172, side)} 82 L ${sx(218, side)} 56 L ${sx(206, side)} 98 Z`}
                      fill={palette.primary}
                      stroke={palette.highlight}
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    {/* Tier 1 Outer Lamella */}
                    <path
                      d={`M ${sx(166, side)} 92 L ${sx(234, side)} 110 L ${sx(240, side)} 136 L ${sx(174, side)} 120 Z`}
                      fill={palette.deep}
                      fillOpacity="0.88"
                      stroke={palette.highlight}
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    {/* Tier 2 Outer Lamella */}
                    <path
                      d={`M ${sx(176, side)} 126 L ${sx(242, side)} 144 L ${sx(244, side)} 172 L ${sx(184, side)} 156 Z`}
                      fill={palette.deep}
                      fillOpacity="0.86"
                      stroke={palette.highlight}
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    {/* Tier 3 Outer Lamella */}
                    <path
                      d={`M ${sx(186, side)} 162 L ${sx(244, side)} 180 L ${sx(240, side)} 208 L ${sx(192, side)} 192 Z`}
                      fill={palette.deep}
                      fillOpacity="0.84"
                      stroke={palette.primary}
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    {/* Armor Cord Rivets */}
                    <circle
                      cx={sx(204, side)}
                      cy={112}
                      r="2.4"
                      fill={palette.highlight}
                    />
                    <circle
                      cx={sx(212, side)}
                      cy={148}
                      r="2.4"
                      fill={palette.highlight}
                    />
                  </g>
                ))}
              </g>
            )}
          </svg>
        </motion.div>

        {/* Phase 2+ Floating Flanking Chakra Armaments in 2.5D Depth */}
        {effectiveStage >= 2 && (
          <>
            {/* Left Floating Armament (Yata Shield / Greatbow / Twin Blade) */}
            <motion.div
              animate={
                reducedMotion
                  ? { y: 0, rotate: 0 }
                  : {
                      y: [0, -10, 0],
                      rotate: [0, -1.5, 0],
                    }
              }
              transition={
                reducedMotion
                  ? { duration: 0.2 }
                  : {
                      type: 'tween',
                      ease: 'easeInOut',
                      duration: isRunning ? 3.4 : 4.8,
                      delay: 0.2,
                      repeat: Infinity,
                    }
              }
              className="absolute inset-0 will-change-transform"
            >
              <svg
                viewBox="0 0 520 520"
                className="h-full w-full overflow-visible"
                style={{
                  filter: `drop-shadow(0 0 12px ${palette.glowRgba})`,
                }}
              >
                <ChakraBladeGradientDef
                  id={`${bladeGradId}-left`}
                  palette={palette}
                />
                {renderFlankingArmaments(
                  variant,
                  'left',
                  palette,
                  `${bladeGradId}-left`,
                )}
              </svg>
            </motion.div>

            {/* Right Floating Armament (Totsuka Spectral Blade / Variant Weapon) */}
            <motion.div
              animate={
                reducedMotion
                  ? { y: 0, rotate: 0 }
                  : {
                      y: [0, -11, 0],
                      rotate: [0, 1.5, 0],
                    }
              }
              transition={
                reducedMotion
                  ? { duration: 0.2 }
                  : {
                      type: 'tween',
                      ease: 'easeInOut',
                      duration: isRunning ? 3.2 : 4.5,
                      delay: 0.65,
                      repeat: Infinity,
                    }
              }
              className="absolute inset-0 will-change-transform"
            >
              <svg
                viewBox="0 0 520 520"
                className="h-full w-full overflow-visible"
                style={{
                  filter: `drop-shadow(0 0 12px ${palette.glowRgba})`,
                }}
              >
                <ChakraBladeGradientDef
                  id={`${bladeGradId}-right`}
                  palette={palette}
                />
                {renderFlankingArmaments(
                  variant,
                  'right',
                  palette,
                  `${bladeGradId}-right`,
                )}
              </svg>
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function SusanooAura({
  progress,
  enabled,
  isRunning = false,
  variant,
  stageOverride,
  className,
}: SusanooAuraProps) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);

  const storeVariant = useTsukuyomiStore((state) => state.mangekyouVariant);
  const storeStageOverride = useSusanooStageOverride();

  const activeVariant = variant ?? storeVariant;
  const activeStageOverride = stageOverride ?? storeStageOverride;
  const clamped = Math.max(0, Math.min(100, progress));
  const effectiveStage =
    activeStageOverride === 'auto'
      ? getSusanooPhase(clamped)
      : activeStageOverride;

  const palette = SUSANOO_PALETTES[activeVariant];

  // Zero-re-render 2.5D depth parallax separation between bg and fg layers
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const smoothX = useSpring(rawX, PARALLAX_SPRING);
  const smoothY = useSpring(rawY, PARALLAX_SPRING);

  const factor = enabled && !reducedMotion ? 1 : 0;
  const bgParallaxX = useTransform(smoothX, [-0.5, 0.5], [8 * factor, -8 * factor]);
  const bgParallaxY = useTransform(smoothY, [-0.5, 0.5], [8 * factor, -8 * factor]);
  const fgParallaxX = useTransform(smoothX, [-0.5, 0.5], [-10 * factor, 10 * factor]);
  const fgParallaxY = useTransform(smoothY, [-0.5, 0.5], [-10 * factor, 10 * factor]);

  useEffect(() => {
    if (!enabled || reducedMotion || typeof window === 'undefined') {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const normX = Math.max(-0.5, Math.min(0.5, event.clientX / vw - 0.5));
      const normY = Math.max(-0.5, Math.min(0.5, event.clientY / vh - 0.5));
      rawX.set(normX);
      rawY.set(normY);
    };

    const handlePointerLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [enabled, reducedMotion, rawX, rawY]);

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          key="susanoo-aura"
          aria-hidden="true"
          data-susanoo-stage={effectiveStage}
          data-susanoo-variant={activeVariant}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{
            duration: reducedMotion ? 0.15 : 0.45,
            ease: CINEMATIC_EASE,
          }}
          className={cn(
            'pointer-events-none relative select-none will-change-transform',
            className,
          )}
        >
          <AnimatePresence>
            <SusanooStageLayers
              key={`${effectiveStage}-${activeVariant}`}
              effectiveStage={effectiveStage}
              variant={activeVariant}
              palette={palette}
              isRunning={isRunning}
              reducedMotion={reducedMotion}
              bgParallaxX={bgParallaxX}
              bgParallaxY={bgParallaxY}
              fgParallaxX={fgParallaxX}
              fgParallaxY={fgParallaxY}
            />
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
