'use client';

import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  motion,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Clock, Eye, Flame, GripVertical, Sparkles, Trash2 } from 'lucide-react';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { calculateSessionChakra } from '@/lib/gamification';
import type { Mission } from '@/types/tsukuyomi';

export interface MissionCardProps {
  mission: Mission;
  isActiveInTemple?: boolean;
  isOverlay?: boolean;
  onDragToTsukuyomi?: (id: string) => void;
  onToggleAmaterasu?: (id: string) => void;
  onDelete?: (id: string) => void;
}

interface MissionCardSurfaceProps extends MissionCardProps {
  isDragging?: boolean;
}

const TILT_SPRING_CONFIG = {
  stiffness: 190,
  damping: 24,
  mass: 0.5,
} as const;

const GLARE_SPRING_CONFIG = {
  stiffness: 240,
  damping: 28,
} as const;

const BUTTON_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 24,
} as const;

const AMATERASU_EMBERS: ReadonlyArray<{
  id: string;
  positionClass: string;
  left?: string;
  top?: string;
  dx: number;
  delay: number;
  duration: number;
  size: number;
}> = [
  {
    id: 'ember-top-1',
    positionClass: '-top-1',
    left: '14%',
    dx: -4,
    delay: 0,
    duration: 2.1,
    size: 4,
  },
  {
    id: 'ember-top-2',
    positionClass: '-top-1',
    left: '36%',
    dx: 5,
    delay: 0.45,
    duration: 2.35,
    size: 5,
  },
  {
    id: 'ember-top-3',
    positionClass: '-top-1',
    left: '62%',
    dx: -4,
    delay: 0.85,
    duration: 2.0,
    size: 4,
  },
  {
    id: 'ember-top-4',
    positionClass: '-top-1',
    left: '84%',
    dx: 4,
    delay: 0.25,
    duration: 2.25,
    size: 5,
  },
  {
    id: 'ember-left-1',
    positionClass: 'left-1.5',
    top: '44%',
    dx: 6,
    delay: 0.3,
    duration: 1.9,
    size: 4,
  },
  {
    id: 'ember-right-1',
    positionClass: 'right-1.5',
    top: '48%',
    dx: -6,
    delay: 0.65,
    duration: 1.95,
    size: 4,
  },
];

function AmaterasuFlameEmblem({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={
        prefersReducedMotion
          ? undefined
          : {
              scaleY: [1, 1.12, 0.94, 1.08, 1],
              rotate: [0, -3, 2, -2, 0],
            }
      }
      transition={
        prefersReducedMotion
          ? undefined
          : {
              type: 'tween',
              duration: 1.8,
              ease: 'easeInOut',
              repeat: Infinity,
            }
      }
      className="pointer-events-none relative flex h-5 w-5 items-center justify-center will-change-transform transform-gpu"
      style={{
        transformOrigin: 'bottom center',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.5C13.6 6.2 16.9 8.1 17.5 12.2C18 15.8 15.6 19.6 12 20.5C8.4 19.6 6 15.8 6.5 12.2C7.1 8.1 10.4 6.2 12 2.5Z"
          fill="#000000"
          stroke="#DC2626"
          strokeWidth="1.4"
        />
        <path
          d="M12 8.2C13 10.6 14.5 11.9 14.3 14.2C14.1 16 13.1 17.3 12 17.7C10.9 17.3 9.9 16 9.7 14.2C9.5 11.9 11 10.6 12 8.2Z"
          fill="#000000"
          stroke="#7F1D1D"
          strokeWidth="1.1"
        />
      </svg>
    </motion.div>
  );
}

function AmaterasuLivingFlames({
  prefersReducedMotion,
  isHovered,
}: {
  prefersReducedMotion: boolean;
  isHovered: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible rounded-xl"
    >
      {/* Top Living Black Flames Crown (strictly #000000 core + #DC2626/#EF4444/#7F1D1D contour) */}
      <div className="absolute -top-3.5 inset-x-2 h-6 overflow-visible">
        {/* Crimson ember under-glow */}
        <motion.div
          animate={
            prefersReducedMotion
              ? { opacity: 0.75 }
              : {
                  opacity: [0.55, 0.92, 0.65, 0.96, 0.55],
                  scaleY: [0.95, 1.15, 0.92, 1.1, 0.95],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'tween',
                  duration: 2.6,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }
          }
          style={{ transformOrigin: 'bottom center' }}
          className="absolute inset-x-0 bottom-0 h-5 will-change-transform"
        >
          <svg
            viewBox="0 0 320 28"
            preserveAspectRatio="none"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 28 L8 17 L18 24 L29 10 L41 21 L54 7 L67 20 L80 12 L94 22 L109 6 L124 19 L138 11 L153 23 L168 5 L182 20 L197 9 L212 22 L227 8 L241 19 L256 12 L270 21 L285 8 L299 20 L310 13 L320 28 Z"
              fill="#7F1D1D"
              fillOpacity="0.6"
              stroke="#EF4444"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          </svg>
        </motion.div>

        {/* Primary undulating absolute-black flame tongues */}
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scaleY: [1, 1.2, 0.9, 1.14, 1],
                  skewX: [-1.5, 1.5, -1, 1.2, -1.5],
                  y: [0, -1.5, 0.5, -1, 0],
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  type: 'tween',
                  duration: 1.9,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }
          }
          style={{
            transformOrigin: 'bottom center',
          }}
          className="absolute inset-x-0 bottom-0 h-5 will-change-transform transform-gpu"
        >
          <svg
            viewBox="0 0 320 28"
            preserveAspectRatio="none"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 28 C4 18, 10 13, 14 20 C20 9, 27 5, 34 18 C42 7, 48 4, 56 17 C64 10, 72 8, 79 20 C88 6, 97 3, 106 18 C115 9, 122 8, 130 20 C140 5, 150 2, 160 18 C168 8, 177 6, 185 19 C195 6, 204 4, 213 18 C221 9, 230 8, 238 20 C247 7, 255 4, 264 18 C273 9, 281 8, 289 19 C297 8, 306 9, 314 19 L320 28 Z"
              fill="#000000"
              stroke="#DC2626"
              strokeWidth="1.35"
            />
          </svg>
        </motion.div>
      </div>

      {/* Left & Right lateral black flame wisps */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                scaleX: [1, 1.18, 0.92, 1],
                y: [0, -2, 1, 0],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                type: 'tween',
                duration: 2.2,
                ease: 'easeInOut',
                repeat: Infinity,
              }
        }
        style={{
          transformOrigin: 'right center',
        }}
        className="absolute top-4 -left-2 h-16 w-3 will-change-transform transform-gpu"
      >
        <svg
          viewBox="0 0 12 64"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 64 C5 56, 4 46, 9 38 C2 28, 3 18, 9 12 C6 6, 8 2, 12 0 Z"
            fill="#000000"
            stroke="#DC2626"
            strokeWidth="1.2"
          />
        </svg>
      </motion.div>

      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                scaleX: [1, 1.18, 0.92, 1],
                y: [0, -2, 1, 0],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                type: 'tween',
                duration: 2.35,
                delay: 0.4,
                ease: 'easeInOut',
                repeat: Infinity,
              }
        }
        style={{
          transformOrigin: 'left center',
        }}
        className="absolute top-4 -right-2 h-16 w-3 will-change-transform transform-gpu"
      >
        <svg
          viewBox="0 0 12 64"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 64 C7 56, 8 46, 3 38 C10 28, 9 18, 3 12 C6 6, 4 2, 0 0 Z"
            fill="#000000"
            stroke="#DC2626"
            strokeWidth="1.2"
          />
        </svg>
      </motion.div>

      {/* Rising Black Embers Rimmed in #DC2626 (pure CSS GPU particles, disabled on mobile < 768px) */}
      {!prefersReducedMotion && (
        <div className="hidden md:block">
          {AMATERASU_EMBERS.map((ember) => (
            <span
              key={ember.id}
              style={
                {
                  left: ember.left,
                  top: ember.top,
                  width: ember.size,
                  height: ember.size,
                  '--ember-drift': `${ember.dx}px`,
                  '--ember-duration': `${
                    isHovered ? ember.duration * 0.8 : ember.duration
                  }s`,
                  '--ember-delay': `${ember.delay}s`,
                } as CSSProperties
              }
              className={cn(
                'animate-amaterasu-ember absolute rounded-full border border-[#DC2626] bg-[#000000] will-change-transform',
                ember.positionClass,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function stopCardEvent(
  event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>,
) {
  event.stopPropagation();
}

function MissionCardSurface({
  mission,
  isActiveInTemple = false,
  isOverlay = false,
  isDragging = false,
  onDragToTsukuyomi,
  onToggleAmaterasu,
  onDelete,
}: MissionCardSurfaceProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [cardScope, animateCard] = useAnimate<HTMLDivElement>();
  const [isVortexing, setIsVortexing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const vortexTimerRef = useRef<number | null>(null);
  const hasSlammedCompletedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (vortexTimerRef.current !== null) {
        window.clearTimeout(vortexTimerRef.current);
      }
    };
  }, []);

  // Trigger Hanko (完) slam & 120ms card shake cleanly on mount in `completed` or transition into `completed`
  useEffect(() => {
    if (isOverlay) return;

    if (mission.status !== 'completed') {
      hasSlammedCompletedRef.current = false;
      return;
    }

    if (isDragging) return;

    if (!hasSlammedCompletedRef.current) {
      hasSlammedCompletedRef.current = true;
      if (prefersReducedMotion || !cardScope.current) return;

      void animateCard(
        cardScope.current,
        { x: [0, -3, 3, -2, 0] },
        { type: 'tween', duration: 0.12, ease: 'easeOut' },
      );

      void animateCard(
        '[data-hanko-stamp]',
        { scale: [3, 1], opacity: [0, 1] },
        { type: 'tween', duration: 0.2, ease: [0.16, 1, 0.3, 1] },
      );

      void animateCard(
        '[data-hanko-impact]',
        { scale: [0.65, 1.85], opacity: [0.9, 0] },
        { type: 'tween', duration: 0.36, ease: 'easeOut' },
      );
    }
  }, [
    mission.status,
    isDragging,
    isOverlay,
    prefersReducedMotion,
    cardScope,
    animateCard,
  ]);

  // Disable 3D pointer tilt while dragging, inside DragOverlay, or during spiral vortex
  const disableTilt = isDragging || isOverlay || isVortexing;
  const tiltFactor = disableTilt || prefersReducedMotion ? 0 : 1;

  // Per-card pointer tracking via MotionValues (ZERO useState for mouse coordinates)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glareOpacityTarget = useMotionValue(0);

  const smoothX = useSpring(rawX, TILT_SPRING_CONFIG);
  const smoothY = useSpring(rawY, TILT_SPRING_CONFIG);
  const smoothGlareOpacity = useSpring(glareOpacityTarget, GLARE_SPRING_CONFIG);

  const rotateX = useTransform(
    smoothY,
    [-0.5, 0.5],
    [7 * tiltFactor, -7 * tiltFactor],
  );
  const rotateY = useTransform(
    smoothX,
    [-0.5, 0.5],
    [-7 * tiltFactor, 7 * tiltFactor],
  );

  const bgShiftX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [8 * tiltFactor, -8 * tiltFactor],
  );
  const bgShiftY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [8 * tiltFactor, -8 * tiltFactor],
  );

  const fgShiftX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [-5 * tiltFactor, 5 * tiltFactor],
  );
  const fgShiftY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [-3 * tiltFactor, 3 * tiltFactor],
  );

  const glareXPercent = useTransform(smoothX, [-0.5, 0.5], [0, 100]);
  const glareYPercent = useTransform(smoothY, [-0.5, 0.5], [0, 100]);
  const diagonalAngle = useTransform(smoothX, [-0.5, 0.5], [112, 148]);

  const specularGlareBg = useMotionTemplate`radial-gradient(280px circle at ${glareXPercent}% ${glareYPercent}%, ${
    mission.isAmaterasu
      ? 'rgba(220, 38, 38, 0.24)'
      : 'rgba(255, 255, 255, 0.12)'
  } 0%, ${
    mission.isAmaterasu
      ? 'rgba(127, 29, 29, 0.1)'
      : 'rgba(220, 38, 38, 0.06)'
  } 40%, transparent 72%), linear-gradient(${diagonalAngle}deg, transparent 28%, rgba(255, 255, 255, 0.05) 50%, transparent 72%)`;

  function handlePointerEnter() {
    if (disableTilt) return;
    audioEngine.playHover();
    setIsHovered(true);

    if (!prefersReducedMotion) {
      glareOpacityTarget.set(1);

      if (cardScope.current) {
        void animateCard(
          '[data-katana-carrier]',
          { x: ['-18%', '118%'], opacity: [0, 1, 1, 0] },
          {
            type: 'tween',
            duration: 0.18,
            times: [0, 0.15, 0.85, 1],
            ease: [0.16, 1, 0.3, 1],
          },
        );
        void animateCard(
          '[data-katana-top]',
          { x: [0, 1.5, 0] },
          { type: 'tween', duration: 0.18, ease: 'easeOut' },
        );
        void animateCard(
          '[data-katana-bottom]',
          { x: [0, -1.5, 0] },
          { type: 'tween', duration: 0.18, ease: 'easeOut' },
        );
      }
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLElement>) {
    if (disableTilt || prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = Math.max(
      -0.5,
      Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5),
    );
    const normY = Math.max(
      -0.5,
      Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5),
    );
    rawX.set(normX);
    rawY.set(normY);
    glareOpacityTarget.set(1);
  }

  function handlePointerLeave() {
    setIsHovered(false);
    rawX.set(0);
    rawY.set(0);
    glareOpacityTarget.set(0);
  }

  function handleTragarClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!onDragToTsukuyomi || isVortexing) return;

    audioEngine.playClick();
    setIsHovered(false);

    if (prefersReducedMotion) {
      onDragToTsukuyomi(mission.id);
      return;
    }

    rawX.set(0);
    rawY.set(0);
    glareOpacityTarget.set(0);
    setIsVortexing(true);

    vortexTimerRef.current = window.setTimeout(() => {
      vortexTimerRef.current = null;
      onDragToTsukuyomi(mission.id);
    }, 450);
  }

  const rankDef = RANK_DEFINITIONS[mission.rank];
  const isCompleted = mission.status === 'completed';

  const chakraPreview = calculateSessionChakra({
    durationMinutes: mission.estimatedMinutes,
    rank: mission.rank,
    isAmaterasu: mission.isAmaterasu,
    usedSusanoo: false,
  });

  const activeHover = isHovered && !disableTilt;

  return (
    <div style={{ perspective: '1200px' }} className="relative">
      <div ref={cardScope} className="relative will-change-transform">
        {/* 2.5D Kamui/Tsukuyomi Spiral Suction Ring on click */}
        {isVortexing && !prefersReducedMotion && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.35, rotate: 0 }}
            animate={{
              opacity: [0, 0.95, 0],
              scale: [0.35, 1.25, 0.1],
              rotate: [0, 180, 360],
            }}
            transition={{
              type: 'tween',
              duration: 0.45,
              ease: 'easeInOut',
            }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center will-change-transform"
          >
            <div className="h-36 w-36 rounded-full border-2 border-dashed border-[#DC2626] bg-[radial-gradient(circle,rgba(0,0,0,0.95)_0%,rgba(127,29,29,0.45)_55%,transparent_75%)] shadow-[0_0_32px_rgba(220,38,38,0.75)]" />
          </motion.div>
        )}

        <motion.div
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          animate={
            isVortexing && !prefersReducedMotion
              ? {
                  rotate: 360,
                  scale: 0,
                  borderRadius: '50%',
                  filter: 'blur(8px)',
                  opacity: 0,
                }
              : {
                  rotate: 0,
                  scale: 1,
                  borderRadius: '12px',
                  filter: 'blur(0px)',
                  opacity: 1,
                }
          }
          transition={
            isVortexing && !prefersReducedMotion
              ? {
                  type: 'tween',
                  duration: 0.44,
                  ease: [0.42, 0, 0.85, 0.15],
                }
              : { duration: 0.15 }
          }
          style={{
            rotateX: disableTilt ? 0 : rotateX,
            rotateY: disableTilt ? 0 : rotateY,
            transformStyle: 'preserve-3d',
          }}
          className={cn(
            'group relative rounded-xl border p-4 transition-colors duration-200 will-change-transform',
            isVortexing && 'overflow-hidden',
            mission.isAmaterasu
              ? 'animate-amaterasu-flicker border-[#DC2626]/75 bg-gradient-to-b from-[#080203]/95 via-[#020001]/98 to-[#000000] shadow-[inset_0_1px_0_0_rgba(220,38,38,0.22),inset_0_0_26px_rgba(0,0,0,0.98),0_25px_50px_-12px_rgba(0,0,0,0.98)] hover:border-[#EF4444]'
              : 'border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] hover:border-red-500/30',
            isActiveInTemple &&
              !mission.isAmaterasu &&
              'border-[#DC2626]/55 border-t-[#EF4444]/30',
            isOverlay &&
              'ring-1 ring-[#DC2626]/65 shadow-[0_24px_56px_rgba(0,0,0,0.95)]',
          )}
        >
          {/* Clipped Inner Backdrop, Amaterasu Burn Reveal, Specular Glare & Katana Slash */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          >
            {/* Subtle Tactical Scroll Top Rim Specular */}
            <div
              className={cn(
                'absolute inset-x-4 top-0 h-px',
                mission.isAmaterasu
                  ? 'bg-gradient-to-r from-transparent via-[#DC2626] to-transparent opacity-95'
                  : isActiveInTemple
                    ? 'bg-gradient-to-r from-transparent via-[#EF4444]/75 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-white/20 to-transparent',
              )}
            />

            {/* Amaterasu Burn Reveal with /assets/vfx/amaterasu-black-flames.webp */}
            {mission.isAmaterasu && (
              <>
                <motion.div
                  style={
                    disableTilt ? undefined : { x: bgShiftX, y: bgShiftY }
                  }
                  className="absolute -inset-2 bg-[radial-gradient(circle_at_85%_15%,rgba(127,29,29,0.28)_0%,rgba(0,0,0,0.96)_62%,#000000_100%)] will-change-transform"
                />

                {/* Edge-anchored Amaterasu black flames texture */}
                <motion.div
                  animate={{ opacity: activeHover ? 0.88 : 0.45 }}
                  transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <Image
                    src="/assets/vfx/amaterasu-black-flames.webp"
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]"
                  />
                </motion.div>

                {/* Left burning-paper edge creep inward on hover (GPU scaleX, zero layout thrashing) */}
                <motion.div
                  style={{ transformOrigin: 'left center' }}
                  animate={{
                    scaleX: activeHover ? 1 : 0.4,
                    opacity: activeHover ? 0.96 : 0.62,
                  }}
                  transition={{ type: 'tween', duration: 0.32, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 w-28 overflow-hidden will-change-transform transform-gpu"
                >
                  <div className="relative h-full w-32">
                    <Image
                      src="/assets/vfx/amaterasu-black-flames.webp"
                      alt=""
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover object-left mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/92 via-[#000000]/55 to-transparent" />
                  <div className="absolute inset-y-2 right-0 w-px bg-gradient-to-b from-transparent via-[#DC2626]/80 to-transparent" />
                </motion.div>

                {/* Right burning-paper edge creep inward on hover (GPU scaleX, zero layout thrashing) */}
                <motion.div
                  style={{ transformOrigin: 'right center' }}
                  animate={{
                    scaleX: activeHover ? 1 : 0.4,
                    opacity: activeHover ? 0.96 : 0.62,
                  }}
                  transition={{ type: 'tween', duration: 0.32, ease: 'easeOut' }}
                  className="absolute inset-y-0 right-0 w-28 overflow-hidden will-change-transform transform-gpu"
                >
                  <div className="relative ml-auto h-full w-32">
                    <Image
                      src="/assets/vfx/amaterasu-black-flames.webp"
                      alt=""
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover object-right mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-l from-[#000000]/92 via-[#000000]/55 to-transparent" />
                  <div className="absolute inset-y-2 left-0 w-px bg-gradient-to-b from-transparent via-[#DC2626]/80 to-transparent" />
                </motion.div>

                {/* Central abyssal scrim so mission title stays sharp */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.74)_28%,rgba(0,0,0,0.28)_76%,transparent_100%)]" />
              </>
            )}

            {/* Dynamic 2.5D Specular Pointer Glare (disabled during drag/overlay) */}
            {!disableTilt && !prefersReducedMotion && (
              <motion.div
                style={{
                  background: specularGlareBg,
                  opacity: smoothGlareOpacity,
                }}
                className="absolute inset-0 will-change-transform"
              />
            )}

            {/* Katana Slash Sheen (2px diagonal beam rotated 35deg, white core + red halo) */}
            <div
              data-katana-carrier=""
              style={{ opacity: 0, transform: 'translateX(-18%)' }}
              className="pointer-events-none absolute inset-0 z-20 will-change-transform"
            >
              <div
                className="absolute -top-[45%] left-0 h-[190%] w-[2px] rotate-[35deg] bg-white"
                style={{
                  boxShadow:
                    '0 0 8px 1px #FFFFFF, 0 0 16px 3px rgba(239, 68, 68, 0.95), 0 0 28px 6px rgba(220, 38, 38, 0.65)',
                }}
              />
            </div>
          </div>

          {/* Living Black Flames Crown & Lateral Wisps on Amaterasu Missions */}
          {mission.isAmaterasu && (
            <AmaterasuLivingFlames
              prefersReducedMotion={prefersReducedMotion}
              isHovered={activeHover}
            />
          )}

          {/* Incandescent Completion Stamp (完 Hanko Slam) */}
          {isCompleted && (!isDragging || isOverlay) && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-11 right-3 z-20 flex items-center justify-center"
            >
              {/* Smoldering red ember glow mark */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? { opacity: 0.7 }
                    : {
                        opacity: [0.45, 0.85, 0.45],
                        scale: [0.96, 1.06, 0.96],
                      }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        type: 'tween',
                        duration: 2.6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      }
                }
                className="absolute h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.42)_0%,rgba(127,29,29,0.2)_50%,transparent_76%)] will-change-transform"
              />

              {/* Brief incandescent ring shockwave on stamp slam */}
              <div
                data-hanko-impact=""
                style={{ opacity: 0 }}
                className="absolute h-11 w-11 rounded-[6px] border border-[#EF4444] shadow-[0_0_16px_rgba(239,68,68,0.9)] will-change-transform"
              />

              {/* Traditional Japanese Red Hanko Stamp: 完 */}
              <div
                data-hanko-stamp=""
                className="relative flex items-center justify-center will-change-transform"
              >
                <div className="flex h-10 w-10 -rotate-12 items-center justify-center rounded-[5px] border-2 border-[#EF4444]/90 bg-[#450A0A]/60 p-0.5 shadow-[0_0_16px_rgba(220,38,38,0.68),inset_0_0_10px_rgba(220,38,38,0.48)]">
                  <div className="flex h-full w-full items-center justify-center rounded-[2px] border border-[#DC2626]/55">
                    <span className="font-serif text-lg leading-none font-extrabold text-[#EF4444] select-none drop-shadow-[0_0_6px_rgba(239,68,68,0.85)]">
                      完
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Content (Top Half + Hairline Divider + Bottom Half for Katana Micro-Split) */}
          <div
            className="relative z-10 space-y-2.5"
            style={
              disableTilt || prefersReducedMotion
                ? undefined
                : { transformStyle: 'preserve-3d' }
            }
          >
            {/* TOP HALF: Tactical Rank Header + Title & Description */}
            <div
              data-katana-top=""
              className="space-y-2.5 will-change-transform"
              style={
                disableTilt || prefersReducedMotion
                  ? undefined
                  : { transformStyle: 'preserve-3d' }
              }
            >
              {/* Top Row: LED + Glowing Rank Badge + Amaterasu + Controls */}
              <div
                className="flex items-center justify-between gap-2"
                style={
                  disableTilt || prefersReducedMotion
                    ? undefined
                    : { transformStyle: 'preserve-3d' }
                }
              >
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  style={
                    disableTilt || prefersReducedMotion
                      ? undefined
                      : { transformStyle: 'preserve-3d' }
                  }
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      mission.isAmaterasu
                        ? 'bg-[#DC2626] shadow-[0_0_8px_#dc2626]'
                        : isActiveInTemple
                          ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                          : isCompleted
                            ? 'bg-[#DC2626]/80 shadow-[0_0_6px_rgba(220,38,38,0.6)]'
                            : 'bg-zinc-400/75 shadow-[0_0_6px_rgba(161,161,170,0.4)]',
                    )}
                  />

                  <motion.span
                    style={{
                      color: rankDef.badgeColor,
                      borderColor: rankDef.borderColor,
                      backgroundColor: 'rgba(9, 9, 12, 0.95)',
                      boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 16px ${rankDef.glowColor}`,
                      ...(disableTilt || prefersReducedMotion
                        ? {}
                        : {
                            x: fgShiftX,
                            y: fgShiftY,
                            transform: 'translateZ(26px)',
                          }),
                    }}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide tabular-nums will-change-transform"
                  >
                    <span>{rankDef.rank}</span>
                    <span className="text-[10px] font-normal opacity-80">
                      {rankDef.multiplier.toFixed(1)}x
                    </span>
                  </motion.span>

                  {mission.isAmaterasu && (
                    <motion.button
                      type="button"
                      onPointerDown={stopCardEvent}
                      onMouseEnter={() => audioEngine.playHover()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void audioEngine.play('amaterasu-ignite');
                      }}
                      title="Selo Amaterasu ativo (2.0x Chakra)"
                      aria-label="Ativar ressonância das chamas negras do Amaterasu"
                      style={
                        disableTilt || prefersReducedMotion
                          ? undefined
                          : {
                              x: fgShiftX,
                              y: fgShiftY,
                              transform: 'translateZ(22px)',
                            }
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#DC2626]/75 bg-[#000000] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#EF4444] uppercase transition-colors hover:border-[#EF4444] will-change-transform"
                    >
                      <AmaterasuFlameEmblem
                        prefersReducedMotion={prefersReducedMotion}
                      />
                      <span>Amaterasu 2.0x</span>
                    </motion.button>
                  )}

                  {isActiveInTemple && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#7F1D1D]/70 bg-[#450A0A]/45 px-2 py-0.5 font-mono text-[10px] font-medium text-[#FCA5A5]">
                      <Eye className="h-3 w-3 text-[#EF4444]" />
                      No Altar
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!isCompleted && onToggleAmaterasu && (
                    <motion.button
                      type="button"
                      whileHover={
                        prefersReducedMotion ? undefined : { scale: 1.1 }
                      }
                      whileTap={
                        prefersReducedMotion ? undefined : { scale: 0.92 }
                      }
                      transition={BUTTON_SPRING}
                      onPointerDown={stopCardEvent}
                      onMouseEnter={() => audioEngine.playHover()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAmaterasu(mission.id);
                      }}
                      disabled={isVortexing}
                      title={
                        mission.isAmaterasu
                          ? 'Apagar chamas do Amaterasu'
                          : 'Selar com Amaterasu (2.0x Chakra hoje)'
                      }
                      aria-label={
                        mission.isAmaterasu
                          ? `Apagar Amaterasu da missão ${mission.title}`
                          : `Marcar missão ${mission.title} com Amaterasu`
                      }
                      className={cn(
                        'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border p-2 transition-colors',
                        mission.isAmaterasu
                          ? 'border-[#DC2626]/80 bg-[#000000] text-[#EF4444] hover:bg-[#450A0A]/60'
                          : 'border-transparent bg-transparent text-[#52525B] hover:border-[#7F1D1D]/60 hover:bg-[#09090B] hover:text-[#DC2626]',
                      )}
                    >
                      <Flame className="h-3.5 w-3.5" />
                    </motion.button>
                  )}

                  {onDelete && (
                    <motion.button
                      type="button"
                      whileHover={
                        prefersReducedMotion ? undefined : { scale: 1.1 }
                      }
                      whileTap={
                        prefersReducedMotion ? undefined : { scale: 0.92 }
                      }
                      transition={BUTTON_SPRING}
                      onPointerDown={stopCardEvent}
                      onMouseEnter={() => audioEngine.playHover()}
                      onClick={(e) => {
                        e.stopPropagation();
                        audioEngine.playClick();
                        onDelete(mission.id);
                      }}
                      disabled={isVortexing}
                      title="Remover missão"
                      aria-label={`Remover missão ${mission.title}`}
                      className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-transparent p-2 text-[#52525B] transition-colors hover:border-[#27272A] hover:bg-[#09090B] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}

                  <span
                    aria-hidden="true"
                    className="cursor-grab p-1 text-[#52525B] group-hover:text-[#A1A1AA] active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className={cn('space-y-1', isCompleted && 'pr-12')}>
                <h4
                  className={cn(
                    'text-sm leading-snug font-semibold text-[#FAFAFA]',
                    isCompleted &&
                      'text-[#A1A1AA] line-through decoration-[#52525B]',
                  )}
                >
                  {mission.title}
                </h4>
                {mission.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#A1A1AA]">
                    {mission.description}
                  </p>
                )}
              </div>
            </div>

            {/* Gradient Hairline Divider along the Katana Cut Line */}
            <div
              aria-hidden="true"
              className={cn(
                'h-px w-full',
                mission.isAmaterasu
                  ? 'bg-gradient-to-r from-transparent via-[#DC2626]/55 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-white/[0.12] to-transparent',
              )}
            />

            {/* BOTTOM HALF: Metrics Row & Quick Action */}
            <div
              data-katana-bottom=""
              className="space-y-2.5 will-change-transform"
            >
              {/* Metrics Row: Estimated Minutes & Chakra Preview */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 font-mono tabular-nums text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#7F1D1D]" />
                    {mission.estimatedMinutes}m
                  </span>
                  {mission.completedMinutes > 0 && (
                    <span className="text-[11px] text-[#52525B]">
                      ({mission.completedMinutes}m focados)
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-[#FAFAFA]">
                  <Sparkles className="h-3 w-3 text-[#DC2626]" />
                  +{chakraPreview.toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Quick Action: Tragar para o Tsukuyomi */}
              {onDragToTsukuyomi && (
                <motion.button
                  type="button"
                  whileHover={
                    prefersReducedMotion || isVortexing
                      ? undefined
                      : { y: -1, scale: 1.01 }
                  }
                  whileTap={
                    prefersReducedMotion || isVortexing
                      ? undefined
                      : { scale: 0.98 }
                  }
                  transition={BUTTON_SPRING}
                  onPointerDown={stopCardEvent}
                  onMouseEnter={() => audioEngine.playHover()}
                  onClick={handleTragarClick}
                  disabled={isVortexing}
                  className={cn(
                    'flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-colors',
                    mission.isAmaterasu
                      ? 'border-[#DC2626]/70 bg-[#000000] text-[#FAFAFA] hover:border-[#EF4444] hover:bg-[#450A0A]/50'
                      : isActiveInTemple
                        ? 'border-[#DC2626]/55 bg-[#450A0A]/30 text-[#FCA5A5] hover:bg-[#450A0A]/55 hover:text-[#FFFFFF]'
                        : 'border-white/[0.08] bg-gradient-to-b from-[#16161C]/90 to-[#0B0B0E]/95 text-[#A1A1AA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#DC2626]/60 hover:text-[#FAFAFA]',
                  )}
                >
                  <Eye className="h-3.5 w-3.5 text-[#DC2626]" />
                  <span>Tragar para o Tsukuyomi</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SortableMissionCard(props: MissionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.mission.id,
    data: {
      type: 'mission',
      mission: props.mission,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'touch-manipulation outline-none',
        isDragging ? 'opacity-30' : 'opacity-100',
      )}
    >
      <MissionCardSurface {...props} isDragging={isDragging} />
    </div>
  );
}

export const MissionCard = memo(function MissionCard(props: MissionCardProps) {
  if (props.isOverlay) {
    return <MissionCardSurface {...props} isDragging isOverlay />;
  }
  return <SortableMissionCard {...props} />;
});
