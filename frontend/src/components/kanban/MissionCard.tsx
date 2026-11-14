'use client';

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  motion,
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
  left: string;
  dx: number;
  delay: number;
  duration: number;
  size: number;
}> = [
  { id: 'ember-1', left: '12%', dx: -4, delay: 0, duration: 2.1, size: 4 },
  { id: 'ember-2', left: '28%', dx: 5, delay: 0.45, duration: 2.4, size: 5 },
  { id: 'ember-3', left: '46%', dx: -3, delay: 0.9, duration: 1.9, size: 4 },
  { id: 'ember-4', left: '63%', dx: 4, delay: 0.25, duration: 2.3, size: 5 },
  { id: 'ember-5', left: '78%', dx: -5, delay: 0.75, duration: 2.0, size: 4 },
  { id: 'ember-6', left: '90%', dx: 3, delay: 1.2, duration: 2.2, size: 3 },
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
      className="pointer-events-none relative flex h-5 w-5 items-center justify-center will-change-transform"
      style={{
        filter: 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.75))',
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
}: {
  prefersReducedMotion: boolean;
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
            filter: 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.8))',
          }}
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
          filter: 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.7))',
        }}
        className="absolute top-4 -left-2 h-16 w-3 will-change-transform"
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
          filter: 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.7))',
        }}
        className="absolute top-4 -right-2 h-16 w-3 will-change-transform"
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

      {/* Rising Black & Crimson Embers (never orange/yellow) */}
      {!prefersReducedMotion &&
        AMATERASU_EMBERS.map((ember) => (
          <motion.span
            key={ember.id}
            style={{
              left: ember.left,
              width: ember.size,
              height: ember.size,
              boxShadow: '0 0 7px rgba(220, 38, 38, 0.9)',
            }}
            animate={{
              y: [4, -14, -28],
              x: [0, ember.dx, -ember.dx],
              opacity: [0, 0.95, 0],
              scale: [0.7, 1.1, 0.25],
            }}
            transition={{
              type: 'tween',
              duration: ember.duration,
              delay: ember.delay,
              ease: 'easeOut',
              repeat: Infinity,
            }}
            className="absolute -top-1 rounded-full border border-[#DC2626] bg-[#000000] will-change-transform"
          />
        ))}
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
  const [isVortexing, setIsVortexing] = useState(false);
  const vortexTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (vortexTimerRef.current !== null) {
        window.clearTimeout(vortexTimerRef.current);
      }
    };
  }, []);

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
      ? 'rgba(220, 38, 38, 0.22)'
      : 'rgba(255, 255, 255, 0.12)'
  } 0%, ${
    mission.isAmaterasu
      ? 'rgba(127, 29, 29, 0.08)'
      : 'rgba(220, 38, 38, 0.06)'
  } 40%, transparent 72%), linear-gradient(${diagonalAngle}deg, transparent 28%, rgba(255, 255, 255, 0.05) 50%, transparent 72%)`;

  function handlePointerEnter() {
    if (disableTilt) return;
    audioEngine.playHover();
    if (!prefersReducedMotion) {
      glareOpacityTarget.set(1);
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
    rawX.set(0);
    rawY.set(0);
    glareOpacityTarget.set(0);
  }

  function handleTragarClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!onDragToTsukuyomi || isVortexing) return;

    void audioEngine.play('sharingan-activate');

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

  return (
    <div style={{ perspective: '1200px' }} className="relative">
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
                scale: [1, 1.06, 0.05],
                rotate: [0, -10, 240],
                opacity: [1, 1, 0],
                filter: ['blur(0px)', 'blur(0px)', 'blur(10px)'],
              }
            : {
                scale: 1,
                rotate: 0,
                opacity: 1,
                filter: 'blur(0px)',
              }
        }
        transition={
          isVortexing && !prefersReducedMotion
            ? {
                type: 'tween',
                duration: 0.45,
                times: [0, 0.25, 1],
                ease: [0.32, 0, 0.67, 0],
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
          mission.isAmaterasu
            ? 'animate-amaterasu-flicker border-[#DC2626]/75 bg-[#000000] shadow-[inset_0_0_26px_rgba(0,0,0,0.98),0_14px_34px_rgba(0,0,0,0.94)]'
            : 'border-[#27272A] border-t-white/[0.08] bg-[#121215]/95 shadow-[0_14px_34px_rgba(0,0,0,0.85)] hover:border-[#3F3F46]',
          isActiveInTemple &&
            !mission.isAmaterasu &&
            'border-[#DC2626]/55 border-t-[#EF4444]/30',
          isOverlay &&
            'ring-1 ring-[#DC2626]/65 shadow-[0_24px_56px_rgba(0,0,0,0.95)]',
        )}
      >
        {/* Clipped Inner Backdrop & Specular Spotlight Glare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
          {mission.isAmaterasu && (
            <>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DC2626] to-transparent opacity-95" />
              <motion.div
                style={
                  disableTilt ? undefined : { x: bgShiftX, y: bgShiftY }
                }
                className="absolute -inset-2 bg-[radial-gradient(circle_at_85%_15%,rgba(127,29,29,0.3)_0%,rgba(0,0,0,0.96)_62%,#000000_100%)] will-change-transform"
              />
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
        </div>

        {/* Living Black Flames on Amaterasu Missions */}
        {mission.isAmaterasu && (
          <AmaterasuLivingFlames prefersReducedMotion={prefersReducedMotion} />
        )}

        {/* Card Content */}
        <div
          className="relative z-10 space-y-3"
          style={
            disableTilt || prefersReducedMotion
              ? undefined
              : { transformStyle: 'preserve-3d' }
          }
        >
          {/* Top Row: Rank Badge (translateZ elevated) + Amaterasu + Controls */}
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
              <motion.span
                style={{
                  color: rankDef.badgeColor,
                  borderColor: rankDef.borderColor,
                  backgroundColor: 'rgba(9, 9, 11, 0.94)',
                  boxShadow: `0 0 14px ${rankDef.glowColor}`,
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
                <span className="inline-flex items-center gap-1 rounded-md border border-[#7F1D1D]/70 bg-[#450A0A]/40 px-2 py-0.5 font-mono text-[10px] font-medium text-[#FCA5A5]">
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
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
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
                    'rounded-md border p-1.5 transition-colors',
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
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
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
                  className="rounded-md border border-transparent p-1.5 text-[#52525B] transition-colors hover:border-[#27272A] hover:bg-[#09090B] hover:text-[#EF4444]"
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
          <div className="space-y-1">
            <h4
              className={cn(
                'text-sm leading-snug font-semibold text-[#FAFAFA]',
                isCompleted && 'text-[#A1A1AA] line-through decoration-[#52525B]',
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

          {/* Metrics Row: Estimated Minutes & Chakra Preview */}
          <div className="flex items-center justify-between gap-2 border-t border-[#27272A]/80 pt-2.5 text-xs">
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
                'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-colors',
                mission.isAmaterasu
                  ? 'border-[#DC2626]/70 bg-[#000000] text-[#FAFAFA] hover:border-[#EF4444] hover:bg-[#450A0A]/50'
                  : isActiveInTemple
                    ? 'border-[#DC2626]/55 bg-[#450A0A]/30 text-[#FCA5A5] hover:bg-[#450A0A]/55 hover:text-[#FFFFFF]'
                    : 'border-[#27272A] bg-[#09090B]/90 text-[#A1A1AA] hover:border-[#DC2626]/60 hover:bg-[#18181B] hover:text-[#FAFAFA]',
              )}
            >
              <Eye className="h-3.5 w-3.5 text-[#DC2626]" />
              <span>Tragar para o Tsukuyomi</span>
            </motion.button>
          )}
        </div>
      </motion.div>
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

export function MissionCard(props: MissionCardProps) {
  if (props.isOverlay) {
    return <MissionCardSurface {...props} isDragging isOverlay />;
  }
  return <SortableMissionCard {...props} />;
}
