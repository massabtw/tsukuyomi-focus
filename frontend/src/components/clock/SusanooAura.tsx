'use client';

import { memo, useEffect, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
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
type MotionNumber = ReturnType<typeof useTransform<number, number>>;

interface SusanooPalette {
  primary: string;
  secondary: string;
  highlight: string;
  glowRgba: string;
  cssTintFilter: string;
}

const SUSANOO_PHASE_ASSETS: Record<SusanooPhase, string> = {
  1: '/assets/vfx/susanoo-phase1-ribcage.webp',
  2: '/assets/vfx/susanoo-phase2-skeleton.webp',
  3: '/assets/vfx/susanoo-phase3-tengu.webp',
};

const SUSANOO_PALETTES: Record<MangekyouVariant, SusanooPalette> = {
  itachi: {
    primary: '#DC2626',
    secondary: '#991B1B',
    highlight: '#FCA5A5',
    glowRgba: 'rgba(220, 38, 38, 0.58)',
    cssTintFilter: 'hue-rotate(-2deg) saturate(1.22) brightness(1.06)',
  },
  sasuke: {
    primary: '#8B5CF6',
    secondary: '#6D28D9',
    highlight: '#DDD6FE',
    glowRgba: 'rgba(139, 92, 246, 0.58)',
    cssTintFilter: 'hue-rotate(266deg) saturate(1.36) brightness(1.08)',
  },
  shisui: {
    primary: '#10B981',
    secondary: '#059669',
    highlight: '#A7F3D0',
    glowRgba: 'rgba(16, 185, 129, 0.54)',
    cssTintFilter: 'hue-rotate(146deg) saturate(1.24) brightness(1.02)',
  },
  madara: {
    primary: '#2563EB',
    secondary: '#1D4ED8',
    highlight: '#BFDBFE',
    glowRgba: 'rgba(37, 99, 235, 0.58)',
    cssTintFilter: 'hue-rotate(222deg) saturate(1.42) brightness(1.1)',
  },
  obito: {
    primary: '#0EA5E9',
    secondary: '#0284C7',
    highlight: '#BAE6FD',
    glowRgba: 'rgba(14, 165, 233, 0.56)',
    cssTintFilter: 'hue-rotate(199deg) saturate(1.32) brightness(1.1)',
  },
};

const STAGE_FRAME_CONFIG: Record<
  SusanooPhase,
  { sizeClass: string; topPercent: string }
> = {
  1: {
    sizeClass: 'h-[104%] w-[104%] sm:h-[108%] sm:w-[108%]',
    topPercent: '50%',
  },
  2: {
    sizeClass: 'h-[100%] w-[100%] sm:h-[104%] sm:w-[104%]',
    topPercent: '45.5%',
  },
  3: {
    sizeClass: 'h-[110%] w-[110%] sm:h-[114%] sm:w-[114%]',
    topPercent: '41.5%',
  },
};

// Independent 2.5D spring inertia profiles for helm, torso core, and delayed flanks
const HELM_SPRING = { stiffness: 145, damping: 20, mass: 0.55 } as const;
const TORSO_SPRING = { stiffness: 105, damping: 24, mass: 0.7 } as const;
const FLANK_SPRING = { stiffness: 60, damping: 20 } as const;
const CINEMATIC_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const IMAGE_SIZES = '(max-width: 640px) 560px, 640px';

const DUAL_OPTICAL_FUSION_MASK =
  'radial-gradient(circle at center, black 28%, rgba(0, 0, 0, 0.6) 52%, transparent 72%)';

const OUTER_EDGE_DISSOLVE_STYLE: CSSProperties = {
  maskImage: DUAL_OPTICAL_FUSION_MASK,
  WebkitMaskImage: DUAL_OPTICAL_FUSION_MASK,
};

const SUSANOO_CANVAS_SIZE = 560;
const SUSANOO_CANVAS_CENTER = SUSANOO_CANVAS_SIZE / 2;
const SUSANOO_SPARK_COUNT = 12;
const SUSANOO_ARC_COUNT = 3;
const SUSANOO_FADE_RADIUS = 255;

interface ChakraSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  turbAmp: number;
  turbFreq: number;
  turbPhase: number;
  size: number;
  age: number;
  maxLife: number;
  baseAlpha: number;
  useHighlight: boolean;
}

interface ChakraArc {
  baseAngle: number;
  span: number;
  direction: 1 | -1;
  baseRadius: number;
  yRise: number;
  riseSpeed: number;
  age: number;
  maxLife: number;
  crackleTimer: number;
  radialOffsets: number[];
  branchIndex: number;
  branchAngleOffset: number;
  branchLen: number;
}

function createChakraSpark(prewarm = false): ChakraSpark {
  const angle = Math.random() * Math.PI * 2;
  const radius = 110 + Math.random() * 100;
  const maxLife = 1.6 + Math.random() * 2.0;

  return {
    x: SUSANOO_CANVAS_CENTER + Math.cos(angle) * radius,
    y: SUSANOO_CANVAS_CENTER + Math.sin(angle) * radius,
    vx: (Math.random() - 0.5) * 14,
    vy: -(28 + Math.random() * 36),
    turbAmp: 10 + Math.random() * 18,
    turbFreq: 1.8 + Math.random() * 2.4,
    turbPhase: Math.random() * Math.PI * 2,
    size: 1.2 + Math.random() * 1.8,
    age: prewarm ? Math.random() * maxLife : 0,
    maxLife,
    baseAlpha: 0.55 + Math.random() * 0.4,
    useHighlight: Math.random() > 0.45,
  };
}

function rollArcOffsets(segmentCount: number): number[] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const t = index / segmentCount;
    const envelope = Math.sin(t * Math.PI);
    return (Math.random() - 0.5) * 28 * envelope;
  });
}

function createChakraArc(prewarm = false): ChakraArc {
  const segmentCount = 10;
  const maxLife = 0.24 + Math.random() * 0.26;
  return {
    baseAngle: Math.random() * Math.PI * 2,
    span: 0.36 + Math.random() * 0.46,
    direction: Math.random() > 0.5 ? 1 : -1,
    baseRadius: 162 + Math.random() * 48,
    yRise: 0,
    riseSpeed: -(18 + Math.random() * 28),
    age: prewarm ? Math.random() * maxLife : 0,
    maxLife,
    crackleTimer: 0,
    radialOffsets: rollArcOffsets(segmentCount),
    branchIndex: 3 + Math.floor(Math.random() * 5),
    branchAngleOffset: (Math.random() - 0.5) * 0.24,
    branchLen: 12 + Math.random() * 14,
  };
}

const REGION_MASKS = {
  phase1UpperRibs: 'linear-gradient(to bottom, black 0%, black 46%, transparent 56%)',
  phase1LowerRibs: 'linear-gradient(to bottom, transparent 44%, black 54%, black 100%)',
  phase2SkullVertical: 'linear-gradient(to bottom, black 0%, black 27%, transparent 34%)',
  phase2SkullHorizontal:
    'linear-gradient(to right, transparent 21%, black 27%, black 73%, transparent 79%)',
  phase2TorsoHorizontal:
    'linear-gradient(to right, transparent 21%, black 28%, black 72%, transparent 79%)',
  phase2UpperRibsVertical:
    'linear-gradient(to bottom, transparent 25%, black 32%, black 52%, transparent 60%)',
  phase2LowerRibsVertical:
    'linear-gradient(to bottom, transparent 48%, black 56%, black 100%)',
  phase2FlankVertical:
    'linear-gradient(to bottom, transparent 17%, black 24%, black 100%)',
  phase2LeftFlankHorizontal:
    'linear-gradient(to right, black 0%, black 25%, transparent 32%)',
  phase2RightFlankHorizontal:
    'linear-gradient(to right, transparent 68%, black 75%, black 100%)',
  phase3HelmVertical: 'linear-gradient(to bottom, black 0%, black 25%, transparent 32%)',
  phase3HelmHorizontal:
    'linear-gradient(to right, transparent 22%, black 27%, black 73%, transparent 78%)',
  phase3TorsoVertical:
    'linear-gradient(to bottom, transparent 25%, black 31%, black 100%)',
  phase3TorsoHorizontal:
    'linear-gradient(to right, transparent 19%, black 26%, black 74%, transparent 81%)',
  phase3LeftFlankHorizontal:
    'linear-gradient(to right, black 0%, black 23%, transparent 29%)',
  phase3RightFlankHorizontal:
    'linear-gradient(to right, transparent 71%, black 77%, black 100%)',
} as const;

function getSusanooPhase(clampedProgress: number): SusanooPhase {
  if (clampedProgress >= 67) return 3;
  if (clampedProgress >= 34) return 2;
  return 1;
}

interface MaskedSusanooAssetProps {
  src: string;
  filterCss: string;
  verticalMask?: string;
  horizontalMask?: string;
  opacity?: number;
}

function MaskedSusanooAsset({
  src,
  filterCss,
  verticalMask,
  horizontalMask,
  opacity = 1,
}: MaskedSusanooAssetProps) {
  const imageNode = (
    <div
      className="absolute inset-0 mix-blend-screen will-change-transform transform-gpu"
      style={{ filter: filterCss, opacity }}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        draggable={false}
        sizes={IMAGE_SIZES}
        className="object-contain mix-blend-screen [mask-image:radial-gradient(circle_at_center,black_28%,rgba(0,0,0,0.6)_52%,transparent_72%)]"
        style={{ WebkitMaskImage: DUAL_OPTICAL_FUSION_MASK }}
      />
    </div>
  );

  const horizontallyMasked = horizontalMask ? (
    <div
      className="absolute inset-0"
      style={{
        maskImage: horizontalMask,
        WebkitMaskImage: horizontalMask,
      }}
    >
      {imageNode}
    </div>
  ) : (
    imageNode
  );

  if (!verticalMask) {
    return horizontallyMasked;
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        maskImage: verticalMask,
        WebkitMaskImage: verticalMask,
      }}
    >
      {horizontallyMasked}
    </div>
  );
}

interface RibcageBreathingDuoProps {
  src: string;
  filterCss: string;
  breathDuration: number;
  reducedMotion: boolean;
  upperVerticalMask: string;
  lowerVerticalMask: string;
  horizontalMask?: string;
}

function RibcageBreathingDuo({
  src,
  filterCss,
  breathDuration,
  reducedMotion,
  upperVerticalMask,
  lowerVerticalMask,
  horizontalMask,
}: RibcageBreathingDuoProps) {
  const breathingAnim = reducedMotion
    ? { scaleX: 1, scaleY: 1 }
    : {
        scaleX: [1, 1.04, 1],
        scaleY: [1, 1.02, 1],
      };

  return (
    <>
      <motion.div
        animate={breathingAnim}
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : {
                type: 'tween',
                ease: 'easeInOut',
                duration: breathDuration,
                delay: 0,
                repeat: Infinity,
              }
        }
        style={{ transformOrigin: '50% 52%' }}
        className="absolute inset-0 will-change-transform"
      >
        <MaskedSusanooAsset
          src={src}
          filterCss={filterCss}
          verticalMask={upperVerticalMask}
          horizontalMask={horizontalMask}
        />
      </motion.div>

      <motion.div
        animate={breathingAnim}
        transition={
          reducedMotion
            ? { duration: 0.2 }
            : {
                type: 'tween',
                ease: 'easeInOut',
                duration: breathDuration,
                delay: 0.2,
                repeat: Infinity,
              }
        }
        style={{ transformOrigin: '50% 48%' }}
        className="absolute inset-0 will-change-transform"
      >
        <MaskedSusanooAsset
          src={src}
          filterCss={filterCss}
          verticalMask={lowerVerticalMask}
          horizontalMask={horizontalMask}
        />
      </motion.div>
    </>
  );
}

interface SusanooStageLayersProps {
  effectiveStage: SusanooPhase;
  palette: SusanooPalette;
  isRunning: boolean;
  reducedMotion: boolean;
  helmX: MotionNumber;
  helmY: MotionNumber;
  helmRotateZ: MotionNumber;
  helmRotateX: MotionNumber;
  helmRotateY: MotionNumber;
  torsoX: MotionNumber;
  torsoY: MotionNumber;
  flankLeftX: MotionNumber;
  flankLeftY: MotionNumber;
  flankLeftRotate: MotionNumber;
  flankRightX: MotionNumber;
  flankRightY: MotionNumber;
  flankRightRotate: MotionNumber;
}

function SusanooStageLayers({
  effectiveStage,
  palette,
  isRunning,
  reducedMotion,
  helmX,
  helmY,
  helmRotateZ,
  helmRotateX,
  helmRotateY,
  torsoX,
  torsoY,
  flankLeftX,
  flankLeftY,
  flankLeftRotate,
  flankRightX,
  flankRightY,
  flankRightRotate,
}: SusanooStageLayersProps) {
  const assetSrc = SUSANOO_PHASE_ASSETS[effectiveStage];
  const frameConfig = STAGE_FRAME_CONFIG[effectiveStage];
  const bodyFilter = `url(#susanoo-flame-warp) ${palette.cssTintFilter}`;
  const auraFilter = `url(#susanoo-flame-warp) ${palette.cssTintFilter}`;

  const breathDuration = isRunning ? 3.1 : 4.6;
  const flankFloatDuration = isRunning ? 3.3 : 4.8;

  return (
    <motion.div
      initial={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              scaleY: 0.84,
            }
      }
      animate={
        reducedMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              scaleY: 1,
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
        duration: reducedMotion ? 0.16 : 0.7,
        ease: CINEMATIC_EASE,
      }}
      style={{ transformOrigin: 'center' }}
      className="absolute inset-0 will-change-transform"
    >
      {/* Brief Spiritual Activation Flash on Stage / Variant / Enable */}
      {!reducedMotion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{
            opacity: [0, 0.72, 0],
            scale: [0.86, 1.08, 1.16],
          }}
          transition={{
            type: 'tween',
            duration: 0.68,
            times: [0, 0.24, 1],
            ease: 'easeOut',
          }}
          style={{
            background: `radial-gradient(circle at center, ${palette.highlight}55 0%, ${palette.primary}33 40%, transparent 72%)`,
          }}
          className="pointer-events-none absolute inset-6 rounded-full will-change-transform"
        />
      )}

      {/* Static Ambient Variant-Tinted Spiritual Halo behind Susanoo Armor */}
      <div
        aria-hidden="true"
        style={{
          opacity: isRunning ? 0.68 : 0.48,
          background: `radial-gradient(circle at center, ${palette.glowRgba} 0%, ${palette.secondary}26 42%, transparent 74%)`,
        }}
        className="pointer-events-none absolute inset-4 rounded-full mix-blend-screen"
      />

      {/* Scaled Anatomically-Aligned Susano'o Stage Framing OcularClock */}
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2',
          frameConfig.sizeClass,
        )}
        style={{
          top: frameConfig.topPercent,
          perspective: 950,
          ...OUTER_EDGE_DISSOLVE_STYLE,
        }}
      >
        {/* Back Layer: Liquid Plasma Fire Chakra Aura (turbulent flame evaporation) */}
        <motion.div
          style={{ x: torsoX, y: torsoY }}
          className="absolute inset-0 will-change-transform"
        >
          <motion.div
            animate={
              reducedMotion
                ? { scaleX: 1, scaleY: 1, opacity: 0.45 }
                : {
                    scaleX: [1.01, 1.045, 1.01],
                    scaleY: [1.015, 1.055, 1.015],
                    opacity: [0.5, 0.82, 0.5],
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
            style={{ transformOrigin: '50% 62%' }}
            className="absolute inset-0 will-change-transform"
          >
            <MaskedSusanooAsset
              src={assetSrc}
              filterCss={auraFilter}
              opacity={0.78}
            />
          </motion.div>
        </motion.div>

        {/* PHASE 1: Staggered Upper & Lower Ribcage Breathing */}
        {effectiveStage === 1 && (
          <motion.div
            style={{ x: torsoX, y: torsoY }}
            className="absolute inset-0 will-change-transform"
          >
            <RibcageBreathingDuo
              src={assetSrc}
              filterCss={bodyFilter}
              breathDuration={breathDuration}
              reducedMotion={reducedMotion}
              upperVerticalMask={REGION_MASKS.phase1UpperRibs}
              lowerVerticalMask={REGION_MASKS.phase1LowerRibs}
            />
          </motion.div>
        )}

        {/* PHASE 2: 2.5D Rigged Skeleton (Staggered Ribs + Delayed Flanks + Tracking Skull) */}
        {effectiveStage === 2 && (
          <>
            <motion.div
              style={{ x: torsoX, y: torsoY }}
              className="absolute inset-0 will-change-transform"
            >
              <RibcageBreathingDuo
                src={assetSrc}
                filterCss={bodyFilter}
                breathDuration={breathDuration}
                reducedMotion={reducedMotion}
                upperVerticalMask={REGION_MASKS.phase2UpperRibsVertical}
                lowerVerticalMask={REGION_MASKS.phase2LowerRibsVertical}
                horizontalMask={REGION_MASKS.phase2TorsoHorizontal}
              />
            </motion.div>

            {/* Left Flank Pauldron, Arm & Clawed Gauntlet (stiffness: 60, damping: 20) */}
            <motion.div
              style={{
                x: flankLeftX,
                y: flankLeftY,
                rotate: flankLeftRotate,
                transformOrigin: '27% 36%',
              }}
              className="absolute inset-0 will-change-transform"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? { y: 0, rotate: 0 }
                    : { y: [0, -8, 0], rotate: [0, -1.4, 0] }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'tween',
                        ease: 'easeInOut',
                        duration: flankFloatDuration,
                        delay: 0.15,
                        repeat: Infinity,
                      }
                }
                style={{ transformOrigin: '27% 36%' }}
                className="absolute inset-0 will-change-transform"
              >
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  verticalMask={REGION_MASKS.phase2FlankVertical}
                  horizontalMask={REGION_MASKS.phase2LeftFlankHorizontal}
                />
              </motion.div>
            </motion.div>

            {/* Right Flank Pauldron, Arm & Clawed Gauntlet (stiffness: 60, damping: 20) */}
            <motion.div
              style={{
                x: flankRightX,
                y: flankRightY,
                rotate: flankRightRotate,
                transformOrigin: '73% 36%',
              }}
              className="absolute inset-0 will-change-transform"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? { y: 0, rotate: 0 }
                    : { y: [0, -9, 0], rotate: [0, 1.4, 0] }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'tween',
                        ease: 'easeInOut',
                        duration: flankFloatDuration + 0.35,
                        delay: 0.55,
                        repeat: Infinity,
                      }
                }
                style={{ transformOrigin: '73% 36%' }}
                className="absolute inset-0 will-change-transform"
              >
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  verticalMask={REGION_MASKS.phase2FlankVertical}
                  horizontalMask={REGION_MASKS.phase2RightFlankHorizontal}
                />
              </motion.div>
            </motion.div>

            {/* Horned Warrior Skull (tilts & leans toward cursor) */}
            <motion.div
              style={{
                x: helmX,
                y: helmY,
                rotateZ: helmRotateZ,
                rotateX: helmRotateX,
                rotateY: helmRotateY,
                transformOrigin: '50% 30%',
                transformStyle: 'preserve-3d',
              }}
              className="absolute inset-x-0 -top-[1.5%] bottom-[1.5%] will-change-transform"
            >
              <motion.div
                animate={reducedMotion ? { y: 0 } : { y: [0, -3.5, 0] }}
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
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  verticalMask={REGION_MASKS.phase2SkullVertical}
                  horizontalMask={REGION_MASKS.phase2SkullHorizontal}
                />
              </motion.div>
            </motion.div>
          </>
        )}

        {/* PHASE 3: 2.5D Rigged Tengu (Torso Core + Delayed Wing/Arm Flanks + Tracking Tengu Helm) */}
        {effectiveStage === 3 && (
          <>
            <motion.div
              style={{ x: torsoX, y: torsoY }}
              className="absolute inset-0 will-change-transform"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? { scaleX: 1, scaleY: 1 }
                    : {
                        scaleX: [1, 1.022, 1],
                        scaleY: [1, 1.012, 1],
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
                style={{ transformOrigin: '50% 50%' }}
                className="absolute inset-0 will-change-transform"
              >
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  verticalMask={REGION_MASKS.phase3TorsoVertical}
                  horizontalMask={REGION_MASKS.phase3TorsoHorizontal}
                />
              </motion.div>
            </motion.div>

            {/* Left Tengu Wing, Sode Pauldron & Gauntlet (stiffness: 60, damping: 20) */}
            <motion.div
              style={{
                x: flankLeftX,
                y: flankLeftY,
                rotate: flankLeftRotate,
                transformOrigin: '26% 36%',
              }}
              className="absolute inset-0 will-change-transform"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? { y: 0, rotate: 0 }
                    : { y: [0, -9, 0], rotate: [0, -1.6, 0] }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'tween',
                        ease: 'easeInOut',
                        duration: flankFloatDuration,
                        delay: 0.15,
                        repeat: Infinity,
                      }
                }
                style={{ transformOrigin: '26% 36%' }}
                className="absolute inset-0 will-change-transform"
              >
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  horizontalMask={REGION_MASKS.phase3LeftFlankHorizontal}
                />
              </motion.div>
            </motion.div>

            {/* Right Tengu Wing, Sode Pauldron & Gauntlet (stiffness: 60, damping: 20) */}
            <motion.div
              style={{
                x: flankRightX,
                y: flankRightY,
                rotate: flankRightRotate,
                transformOrigin: '74% 36%',
              }}
              className="absolute inset-0 will-change-transform"
            >
              <motion.div
                animate={
                  reducedMotion
                    ? { y: 0, rotate: 0 }
                    : { y: [0, -10, 0], rotate: [0, 1.6, 0] }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        type: 'tween',
                        ease: 'easeInOut',
                        duration: flankFloatDuration + 0.35,
                        delay: 0.55,
                        repeat: Infinity,
                      }
                }
                style={{ transformOrigin: '74% 36%' }}
                className="absolute inset-0 will-change-transform"
              >
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  horizontalMask={REGION_MASKS.phase3RightFlankHorizontal}
                />
              </motion.div>
            </motion.div>

            {/* Fierce Tengu Helm & Blazing Mane (tilts & leans toward cursor) */}
            <motion.div
              style={{
                x: helmX,
                y: helmY,
                rotateZ: helmRotateZ,
                rotateX: helmRotateX,
                rotateY: helmRotateY,
                transformOrigin: '50% 29%',
                transformStyle: 'preserve-3d',
              }}
              className="absolute inset-x-0 -top-[1.2%] bottom-[1.2%] will-change-transform"
            >
              <motion.div
                animate={reducedMotion ? { y: 0 } : { y: [0, -3.5, 0] }}
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
                <MaskedSusanooAsset
                  src={assetSrc}
                  filterCss={bodyFilter}
                  verticalMask={REGION_MASKS.phase3HelmVertical}
                  horizontalMask={REGION_MASKS.phase3HelmHorizontal}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function areSusanooPropsEqual(
  prev: SusanooAuraProps,
  next: SusanooAuraProps,
): boolean {
  if (
    prev.enabled !== next.enabled ||
    prev.isRunning !== next.isRunning ||
    prev.variant !== next.variant ||
    prev.stageOverride !== next.stageOverride ||
    prev.className !== next.className
  ) {
    return false;
  }

  if (!prev.enabled && !next.enabled) {
    return true;
  }

  const prevPhase = getSusanooPhase(Math.max(0, Math.min(100, prev.progress)));
  const nextPhase = getSusanooPhase(Math.max(0, Math.min(100, next.progress)));
  return prevPhase === nextPhase;
}

export const SusanooAura = memo(function SusanooAura({
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<SusanooPalette>(palette);
  const isRunningRef = useRef<boolean>(isRunning);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // 60fps Chakra Sparks & Electrical Arcs Canvas
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetSize = Math.floor(SUSANOO_CANVAS_SIZE * dpr);
    if (canvas.width !== targetSize || canvas.height !== targetSize) {
      canvas.width = targetSize;
      canvas.height = targetSize;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!enabled || reducedMotion) {
      ctx.clearRect(0, 0, SUSANOO_CANVAS_SIZE, SUSANOO_CANVAS_SIZE);
      return;
    }

    const activeSparkCount = window.innerWidth < 768 ? 6 : SUSANOO_SPARK_COUNT;
    const activeArcCount = window.innerWidth < 768 ? 2 : SUSANOO_ARC_COUNT;

    const sparks: ChakraSpark[] = Array.from({ length: activeSparkCount }, () =>
      createChakraSpark(true),
    );
    const arcs: ChakraArc[] = Array.from({ length: activeArcCount }, () =>
      createChakraArc(true),
    );

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const currentPalette = paletteRef.current;
      const running = isRunningRef.current;
      const speedMult = running ? 1.32 : 1;

      ctx.clearRect(0, 0, SUSANOO_CANVAS_SIZE, SUSANOO_CANVAS_SIZE);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Rising Chakra Sparks (fagulhas, GPU-safe without shadowBlur)
      for (let i = 0; i < sparks.length; i += 1) {
        const spark = sparks[i];
        spark.age += dt * speedMult;
        const turbX =
          Math.sin(elapsed * spark.turbFreq + spark.turbPhase) * spark.turbAmp;
        spark.x += (spark.vx + turbX) * dt * speedMult;
        spark.y += spark.vy * dt * speedMult;

        const dist = Math.hypot(
          spark.x - SUSANOO_CANVAS_CENTER,
          spark.y - SUSANOO_CANVAS_CENTER,
        );

        if (spark.age >= spark.maxLife || dist >= SUSANOO_FADE_RADIUS) {
          sparks[i] = createChakraSpark(false);
          continue;
        }

        const lifeT = spark.age / spark.maxLife;
        const lifeAlpha =
          Math.min(1, lifeT / 0.18) * Math.min(1, (1 - lifeT) / 0.35);
        const radialAlpha =
          dist <= 212
            ? 1
            : Math.max(0, (SUSANOO_FADE_RADIUS - dist) / (SUSANOO_FADE_RADIUS - 212));
        const alpha = spark.baseAlpha * lifeAlpha * radialAlpha;
        if (alpha <= 0.01) continue;

        const sparkColor = spark.useHighlight
          ? currentPalette.highlight
          : currentPalette.primary;

        ctx.strokeStyle = currentPalette.primary;
        ctx.lineWidth = Math.max(0.8, spark.size * 0.72);
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x - (spark.vx + turbX) * 0.07, spark.y - spark.vy * 0.09);
        ctx.stroke();

        ctx.fillStyle = sparkColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Procedural Jagged Electrical / Chakra Arcs (arcos eletricos)
      for (let i = 0; i < arcs.length; i += 1) {
        const arc = arcs[i];
        arc.age += dt * (running ? 1.25 : 1);
        arc.crackleTimer += dt;
        arc.yRise += arc.riseSpeed * dt * speedMult;

        if (arc.age >= arc.maxLife) {
          arcs[i] = createChakraArc(false);
          continue;
        }

        const segCount = arc.radialOffsets.length - 1;
        if (arc.crackleTimer >= 0.055) {
          arc.crackleTimer = 0;
          arc.radialOffsets = rollArcOffsets(segCount);
        }

        const points: Array<{ x: number; y: number }> = [];
        let maxDist = 0;

        for (let j = 0; j <= segCount; j += 1) {
          const t = j / segCount;
          const theta = arc.baseAngle + arc.direction * arc.span * t;
          const r = arc.baseRadius + arc.radialOffsets[j];
          const px = SUSANOO_CANVAS_CENTER + Math.cos(theta) * r;
          const py = SUSANOO_CANVAS_CENTER + Math.sin(theta) * r + arc.yRise;
          const dist = Math.hypot(
            px - SUSANOO_CANVAS_CENTER,
            py - SUSANOO_CANVAS_CENTER,
          );
          if (dist > maxDist) {
            maxDist = dist;
          }
          points.push({ x: px, y: py });
        }

        if (maxDist >= SUSANOO_FADE_RADIUS) {
          arcs[i] = createChakraArc(false);
          continue;
        }

        const lifeRatio = arc.age / arc.maxLife;
        const lifeAlpha =
          Math.min(1, lifeRatio / 0.16) * Math.min(1, (1 - lifeRatio) / 0.35);
        const radialAlpha =
          maxDist <= 215
            ? 1
            : Math.max(
                0,
                (SUSANOO_FADE_RADIUS - maxDist) / (SUSANOO_FADE_RADIUS - 215),
              );
        const arcAlpha = lifeAlpha * radialAlpha * (running ? 0.92 : 0.72);
        if (arcAlpha <= 0.01) continue;

        const branchOrigin = points[arc.branchIndex] ?? points[Math.floor(segCount / 2)];
        const branchAngle =
          arc.baseAngle +
          arc.direction * arc.span * (arc.branchIndex / segCount) +
          arc.branchAngleOffset;
        const branchMidX =
          branchOrigin.x + Math.cos(branchAngle) * (arc.branchLen * 0.55);
        const branchMidY =
          branchOrigin.y + Math.sin(branchAngle) * (arc.branchLen * 0.55) - 3;
        const branchEndX =
          branchOrigin.x + Math.cos(branchAngle + 0.18) * arc.branchLen;
        const branchEndY =
          branchOrigin.y + Math.sin(branchAngle + 0.18) * arc.branchLen - 6;

        const traceArcPath = () => {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let j = 1; j < points.length; j += 1) {
            ctx.lineTo(points[j].x, points[j].y);
          }
          ctx.moveTo(branchOrigin.x, branchOrigin.y);
          ctx.lineTo(branchMidX, branchMidY);
          ctx.lineTo(branchEndX, branchEndY);
        };

        // Outer electric stroke
        ctx.strokeStyle = currentPalette.primary;
        ctx.lineWidth = 2.4;
        ctx.globalAlpha = arcAlpha * 0.72;
        traceArcPath();
        ctx.stroke();

        // Inner high-voltage highlight core
        ctx.strokeStyle = currentPalette.highlight;
        ctx.lineWidth = 0.95;
        ctx.globalAlpha = arcAlpha;
        traceArcPath();
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [enabled, reducedMotion]);

  // Zero-re-render 2.5D puppet pointer tracking (helm -> torso -> delayed flanks)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const helmSpringX = useSpring(rawX, HELM_SPRING);
  const helmSpringY = useSpring(rawY, HELM_SPRING);
  const torsoSpringX = useSpring(rawX, TORSO_SPRING);
  const torsoSpringY = useSpring(rawY, TORSO_SPRING);
  const flankSpringX = useSpring(rawX, FLANK_SPRING);
  const flankSpringY = useSpring(rawY, FLANK_SPRING);

  const factor = enabled && !reducedMotion ? 1 : 0;

  const helmX = useTransform(helmSpringX, [-0.5, 0.5], [-10 * factor, 10 * factor]);
  const helmY = useTransform(helmSpringY, [-0.5, 0.5], [-7 * factor, 7 * factor]);
  const helmRotateZ = useTransform(
    helmSpringX,
    [-0.5, 0.5],
    [-3.6 * factor, 3.6 * factor],
  );
  const helmRotateX = useTransform(
    helmSpringY,
    [-0.5, 0.5],
    [8 * factor, -8 * factor],
  );
  const helmRotateY = useTransform(
    helmSpringX,
    [-0.5, 0.5],
    [-10 * factor, 10 * factor],
  );

  const torsoX = useTransform(torsoSpringX, [-0.5, 0.5], [-4 * factor, 4 * factor]);
  const torsoY = useTransform(torsoSpringY, [-0.5, 0.5], [-3 * factor, 3 * factor]);

  const flankLeftX = useTransform(
    flankSpringX,
    [-0.5, 0.5],
    [11 * factor, -11 * factor],
  );
  const flankLeftY = useTransform(
    flankSpringY,
    [-0.5, 0.5],
    [9 * factor, -9 * factor],
  );
  const flankLeftRotate = useTransform(
    flankSpringX,
    [-0.5, 0.5],
    [-2.4 * factor, 2.4 * factor],
  );

  const flankRightX = useTransform(
    flankSpringX,
    [-0.5, 0.5],
    [11 * factor, -11 * factor],
  );
  const flankRightY = useTransform(
    flankSpringY,
    [-0.5, 0.5],
    [9 * factor, -9 * factor],
  );
  const flankRightRotate = useTransform(
    flankSpringX,
    [-0.5, 0.5],
    [2.4 * factor, -2.4 * factor],
  );

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
          {/* Hidden SVG Plasma Filter: always mounted while enabled */}
          <svg
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          >
            <defs>
              <filter
                id="susanoo-flame-warp"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
                colorInterpolationFilters="sRGB"
              >
                <feColorMatrix
                  in="SourceGraphic"
                  type="matrix"
                  values="1.12 0    0    0 0
                          0    1.04 0    0 0
                          0    0    1.04 0 0
                          2.3  0.95 0.95 0 -0.05"
                  result="knockedOut"
                />
                <feComposite
                  in="knockedOut"
                  in2="SourceGraphic"
                  operator="in"
                  result="cleanSprite"
                />
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.018 0.046"
                  numOctaves="2"
                  seed="11"
                  result="flameNoise"
                >
                  {!reducedMotion && (
                    <animate
                      attributeName="baseFrequency"
                      values="0.016 0.04; 0.026 0.064; 0.016 0.04"
                      dur="3.2s"
                      repeatCount="indefinite"
                    />
                  )}
                </feTurbulence>
                <feDisplacementMap
                  in="cleanSprite"
                  in2="flameNoise"
                  scale={reducedMotion ? 0 : isRunning ? 16 : 11}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          {/* 560x560 Dual Optical Fusion Susano'o Aura + 60fps Canvas Wrapper */}
          <div
            className="pointer-events-none absolute -inset-[110px] m-auto h-[560px] w-[560px] mix-blend-screen [mask-image:radial-gradient(circle_at_center,black_28%,rgba(0,0,0,0.6)_52%,transparent_72%)]"
            style={{ WebkitMaskImage: DUAL_OPTICAL_FUSION_MASK }}
          >
            <AnimatePresence>
              <SusanooStageLayers
                key={`${effectiveStage}-${activeVariant}`}
                effectiveStage={effectiveStage}
                palette={palette}
                isRunning={isRunning}
                reducedMotion={reducedMotion}
                helmX={helmX}
                helmY={helmY}
                helmRotateZ={helmRotateZ}
                helmRotateX={helmRotateX}
                helmRotateY={helmRotateY}
                torsoX={torsoX}
                torsoY={torsoY}
                flankLeftX={flankLeftX}
                flankLeftY={flankLeftY}
                flankLeftRotate={flankLeftRotate}
                flankRightX={flankRightX}
                flankRightY={flankRightY}
                flankRightRotate={flankRightRotate}
              />
            </AnimatePresence>

            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-[560px] w-[560px] mix-blend-screen"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}, areSusanooPropsEqual);
