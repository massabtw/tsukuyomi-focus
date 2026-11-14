'use client';

import { memo, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { MissionCard } from '@/components/kanban/MissionCard';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import type { Mission, MissionStatus } from '@/types/tsukuyomi';

export interface KanbanColumnProps {
  status: MissionStatus;
  code?: string;
  title: string;
  subtitle: string;
  emptyText: string;
  icon: ReactNode;
  missions: Mission[];
  activeMissionId: string | null;
  onAddClick: (status: MissionStatus) => void;
  onDragToTsukuyomi: (id: string) => void;
  onToggleAmaterasu: (id: string) => void;
  onDeleteMission: (id: string) => void;
}

const COUNT_BADGE_SPRING = {
  type: 'spring',
  stiffness: 380,
  damping: 24,
} as const;

const BUTTON_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 22,
} as const;

const CHAMFER_CLIP =
  'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)';

const STATUS_VISUALS: Record<
  MissionStatus,
  {
    defaultCode: string;
    rimGlowClass: string;
    topWashClass: string;
    ledClass: string;
    dividerClass: string;
    iconSocketClass: string;
    badgeBorderClass: string;
    accentHex: string;
    subtleHex: string;
  }
> = {
  todo: {
    defaultCode: '01 // PERGAMINHO',
    rimGlowClass:
      'bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent',
    topWashClass:
      'bg-gradient-to-b from-white/[0.06] via-transparent to-transparent',
    ledClass: 'bg-zinc-300 shadow-[0_0_8px_rgba(212,212,216,0.65)]',
    dividerClass:
      'bg-gradient-to-r from-transparent via-white/20 to-transparent',
    iconSocketClass: 'border-white/10 bg-[#0A0A0E] text-zinc-300',
    badgeBorderClass: 'border-white/15 text-zinc-100',
    accentHex: '#71717A',
    subtleHex: 'rgba(212, 212, 216, 0.25)',
  },
  in_tsukuyomi: {
    defaultCode: '02 // GENJUTSU',
    rimGlowClass:
      'bg-gradient-to-r from-transparent via-[#EF4444] to-transparent',
    topWashClass:
      'bg-gradient-to-b from-[#DC2626]/22 via-transparent to-transparent',
    ledClass: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
    dividerClass:
      'bg-gradient-to-r from-transparent via-[#EF4444]/55 to-transparent',
    iconSocketClass:
      'border-[#DC2626]/60 bg-[#450A0A]/50 text-[#EF4444] shadow-[0_0_14px_rgba(220,38,38,0.28)]',
    badgeBorderClass: 'border-[#DC2626]/55 text-[#FCA5A5]',
    accentHex: '#DC2626',
    subtleHex: 'rgba(239, 68, 68, 0.4)',
  },
  completed: {
    defaultCode: '03 // SELO CUMPRIDO',
    rimGlowClass:
      'bg-gradient-to-r from-transparent via-[#DC2626]/65 to-transparent',
    topWashClass:
      'bg-gradient-to-b from-[#7F1D1D]/16 via-transparent to-transparent',
    ledClass: 'bg-[#DC2626] shadow-[0_0_8px_rgba(220,38,38,0.65)]',
    dividerClass:
      'bg-gradient-to-r from-transparent via-[#DC2626]/35 to-transparent',
    iconSocketClass:
      'border-[#7F1D1D]/60 bg-[#1B0708]/70 text-[#FCA5A5]/85',
    badgeBorderClass: 'border-[#7F1D1D]/60 text-zinc-100',
    accentHex: '#991B1B',
    subtleHex: 'rgba(220, 38, 38, 0.28)',
  },
};

function TotemHeaderOrnament({ status }: { status: MissionStatus }) {
  const visuals = STATUS_VISUALS[status];
  const isTsukuyomi = status === 'in_tsukuyomi';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mb-2.5 flex items-center justify-between gap-2 px-1"
    >
      {/* Left Japanese Kamon corner lattice */}
      <svg
        width="32"
        height="10"
        viewBox="0 0 32 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M1 9V2H11L15 6H31"
          stroke={visuals.subtleHex}
          strokeWidth="1"
        />
        <rect
          x="4"
          y="4"
          width="4"
          height="4"
          transform="rotate(45 6 6)"
          stroke={visuals.accentHex}
          strokeWidth="1"
        />
      </svg>

      {/* Center etched scroll bar */}
      <div className="flex flex-1 items-center gap-1.5">
        <span className={cn('h-px flex-1', visuals.dividerClass)} />
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <polygon
            points="7,1 13,7 7,13 1,7"
            stroke={visuals.accentHex}
            strokeWidth="1.1"
            fill={isTsukuyomi ? 'rgba(127, 29, 29, 0.4)' : 'rgba(9, 9, 11, 0.85)'}
          />
          <circle
            cx="7"
            cy="7"
            r="1.6"
            fill={isTsukuyomi ? '#EF4444' : status === 'completed' ? '#DC2626' : '#A1A1AA'}
          />
        </svg>
        <span className={cn('h-px flex-1', visuals.dividerClass)} />
      </div>

      {/* Right Japanese Kamon corner lattice */}
      <svg
        width="32"
        height="10"
        viewBox="0 0 32 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M31 9V2H21L17 6H1"
          stroke={visuals.subtleHex}
          strokeWidth="1"
        />
        <rect
          x="24"
          y="4"
          width="4"
          height="4"
          transform="rotate(45 26 6)"
          stroke={visuals.accentHex}
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  code,
  title,
  subtitle,
  emptyText,
  icon,
  missions,
  activeMissionId,
  onAddClick,
  onDragToTsukuyomi,
  onToggleAmaterasu,
  onDeleteMission,
}: KanbanColumnProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  });

  const isTsukuyomiCol = status === 'in_tsukuyomi';
  const visuals = STATUS_VISUALS[status];
  const headerCode = code ?? visuals.defaultCode;

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${title}`}
      className={cn(
        'relative flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 p-4 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] transition-colors duration-200 hover:border-red-500/30',
        isTsukuyomiCol && 'border-red-500/25 hover:border-red-500/45',
        isOver &&
          'border-[#DC2626]/80 bg-gradient-to-b from-[#181014]/95 via-[#0E090C]/98 to-[#070507]/99 shadow-[inset_0_1px_0_0_rgba(239,68,68,0.28),0_0_34px_rgba(220,38,38,0.32),0_25px_50px_-12px_rgba(0,0,0,0.95)]',
      )}
    >
      {/* 2.5D Obsidian Totem Vertical Rims & Distinct Top Rim Illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        {/* Distinct Top Rim Illumination per column status */}
        <div className={cn('absolute inset-x-0 top-0 h-16', visuals.topWashClass)} />
        {!isTsukuyomiCol && (
          <div
            className={cn(
              'absolute inset-x-6 top-0 h-[1.5px]',
              visuals.rimGlowClass,
            )}
          />
        )}

        {/* Left & Right vertical engraved totem grooves */}
        <div
          className={cn(
            'absolute inset-y-8 left-1.5 w-px bg-gradient-to-b from-transparent to-transparent',
            isTsukuyomiCol
              ? 'via-[#DC2626]/40'
              : status === 'completed'
                ? 'via-[#7F1D1D]/35'
                : 'via-white/10',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-8 right-1.5 w-px bg-gradient-to-b from-transparent to-transparent',
            isTsukuyomiCol
              ? 'via-[#DC2626]/40'
              : status === 'completed'
                ? 'via-[#7F1D1D]/35'
                : 'via-white/10',
          )}
        />

        {/* Bottom totem seal occlusion */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/65 to-transparent" />
      </div>

      {/* Exclusive Pulsing Crimson Aura & Rim for Central Tsukuyomi Column */}
      {isTsukuyomiCol && (
        <>
          <motion.div
            aria-hidden="true"
            animate={
              prefersReducedMotion
                ? { opacity: 0.45 }
                : {
                    opacity: [0.28, 0.72, 0.28],
                    scale: [0.995, 1.01, 0.995],
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: 'tween',
                    duration: 3.4,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }
            }
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_50%_0%,rgba(220,38,38,0.22)_0%,rgba(127,29,29,0.1)_45%,transparent_78%)] will-change-transform"
          />
          <motion.div
            aria-hidden="true"
            animate={
              prefersReducedMotion
                ? { opacity: 0.6 }
                : { opacity: [0.35, 0.95, 0.35] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: 'tween',
                    duration: 2.8,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }
            }
            className="pointer-events-none absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#EF4444] to-transparent will-change-transform"
          />
        </>
      )}

      {/* Japanese Geometric Totem Ornament */}
      <div className="relative z-10">
        <TotemHeaderOrnament status={status} />
      </div>

      {/* Chamfered Tactical Column Header */}
      <div className="relative z-10 mb-4">
        <div
          style={{ clipPath: CHAMFER_CLIP }}
          className="relative bg-white/[0.08] p-px"
        >
          <header
            style={{ clipPath: CHAMFER_CLIP }}
            className="relative flex items-start justify-between gap-3 bg-gradient-to-b from-[#16161C]/95 via-[#0E0E13]/98 to-[#09090C]/98 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <div className="flex items-start gap-2.5">
              <div
                className={cn(
                  'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                  visuals.iconSocketClass,
                )}
              >
                {icon}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      visuals.ledClass,
                    )}
                  />
                  <span className="font-mono text-[10px] tracking-[0.22em] text-zinc-400 uppercase">
                    {headerCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold tracking-wide text-[#FAFAFA]">
                    {title}
                  </h3>
                  {/* Metallic Count Badge */}
                  <span
                    className={cn(
                      'relative inline-flex min-w-[1.85rem] items-center justify-center overflow-hidden rounded-md border bg-gradient-to-b from-[#2A2A32]/90 via-[#15151B] to-[#09090D] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.9),0_2px_6px_rgba(0,0,0,0.85)]',
                      visuals.badgeBorderClass,
                    )}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={missions.length}
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { y: -10, opacity: 0, scale: 0.85 }
                        }
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { y: 10, opacity: 0, scale: 0.85 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : COUNT_BADGE_SPRING
                        }
                        className="inline-block will-change-transform"
                      >
                        {missions.length}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">{subtitle}</p>
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
              transition={BUTTON_SPRING}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => {
                audioEngine.playClick();
                onAddClick(status);
              }}
              title={`Adicionar missão em ${title}`}
              aria-label={`Adicionar nova missão em ${title}`}
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-white/[0.08] bg-[#0B0B0F] p-2 text-[#A1A1AA] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-[#DC2626]/60 hover:text-[#FAFAFA]"
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </header>
        </div>

        {/* Gradient Hairline Divider */}
        <div
          aria-hidden="true"
          className={cn('mt-3 h-px w-full', visuals.dividerClass)}
        />
      </div>

      {/* Mission Cards Stack */}
      <SortableContext
        items={missions.map((mission) => mission.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="relative z-10 flex flex-1 flex-col gap-3">
          {missions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#09090B]/60 px-4 py-10 text-center">
              <p className="max-w-[22ch] text-xs leading-relaxed text-[#A1A1AA]">
                {emptyText}
              </p>
              <motion.button
                type="button"
                whileHover={
                  prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }
                }
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                transition={BUTTON_SPRING}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  onAddClick(status);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-gradient-to-b from-[#16161C] to-[#0C0C10] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-[#DC2626]/60"
              >
                <Plus className="h-3.5 w-3.5 text-[#DC2626]" />
                Selar Missão
              </motion.button>
            </div>
          ) : (
            missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                isActiveInTemple={mission.id === activeMissionId}
                onDragToTsukuyomi={onDragToTsukuyomi}
                onToggleAmaterasu={onToggleAmaterasu}
                onDelete={onDeleteMission}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Totem Base Seal Footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 mt-4 flex items-center justify-center pt-1"
      >
        <span
          className={cn(
            'h-1 w-14 rounded-full',
            isTsukuyomiCol
              ? 'bg-gradient-to-r from-transparent via-[#DC2626]/70 to-transparent'
              : 'bg-gradient-to-r from-transparent via-[#27272A] to-transparent',
          )}
        />
      </div>
    </section>
  );
});
