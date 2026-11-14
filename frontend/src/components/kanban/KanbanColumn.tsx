'use client';

import type { ReactNode } from 'react';
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

function TotemHeaderOrnament({ isTsukuyomi }: { isTsukuyomi: boolean }) {
  const accentColor = isTsukuyomi ? '#DC2626' : '#52525B';
  const subtleColor = isTsukuyomi ? 'rgba(239, 68, 68, 0.35)' : 'rgba(161, 161, 170, 0.22)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mb-3 flex items-center justify-between gap-2 px-1"
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
          stroke={subtleColor}
          strokeWidth="1"
        />
        <rect
          x="4"
          y="4"
          width="4"
          height="4"
          transform="rotate(45 6 6)"
          stroke={accentColor}
          strokeWidth="1"
        />
      </svg>

      {/* Center etched scroll bar */}
      <div className="flex flex-1 items-center gap-1.5">
        <span
          className={cn(
            'h-px flex-1',
            isTsukuyomi
              ? 'bg-gradient-to-r from-[#7F1D1D]/40 via-[#DC2626]/70 to-[#7F1D1D]/40'
              : 'bg-gradient-to-r from-[#27272A]/40 via-[#52525B]/60 to-[#27272A]/40',
          )}
        />
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
            stroke={accentColor}
            strokeWidth="1.1"
            fill={isTsukuyomi ? 'rgba(127, 29, 29, 0.35)' : 'rgba(9, 9, 11, 0.8)'}
          />
          <circle
            cx="7"
            cy="7"
            r="1.6"
            fill={isTsukuyomi ? '#EF4444' : '#71717A'}
          />
        </svg>
        <span
          className={cn(
            'h-px flex-1',
            isTsukuyomi
              ? 'bg-gradient-to-r from-[#7F1D1D]/40 via-[#DC2626]/70 to-[#7F1D1D]/40'
              : 'bg-gradient-to-r from-[#27272A]/40 via-[#52525B]/60 to-[#27272A]/40',
          )}
        />
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
          stroke={subtleColor}
          strokeWidth="1"
        />
        <rect
          x="24"
          y="4"
          width="4"
          height="4"
          transform="rotate(45 26 6)"
          stroke={accentColor}
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export function KanbanColumn({
  status,
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
  const prefersReducedMotion = useReducedMotion();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  });

  const isTsukuyomiCol = status === 'in_tsukuyomi';

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${title}`}
      className={cn(
        'obsidian-surface relative flex min-h-[440px] flex-col overflow-hidden rounded-2xl p-4 transition-colors duration-200',
        isTsukuyomiCol
          ? 'border-[#7F1D1D]/70 border-t-[#EF4444]/35 shadow-[0_24px_56px_rgba(0,0,0,0.95),0_0_28px_rgba(127,29,29,0.28)]'
          : 'border-[#27272A] border-t-white/[0.09] shadow-[0_22px_50px_rgba(0,0,0,0.92)]',
        isOver &&
          'border-[#DC2626]/80 border-t-[#EF4444]/55 bg-[#121215] shadow-[0_0_34px_rgba(220,38,38,0.32),0_22px_50px_rgba(0,0,0,0.95)]',
      )}
    >
      {/* 2.5D Obsidian Totem Vertical Rims & Etched Side Seals */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        {/* Top obsidian scroll cap sheen */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-14',
            isTsukuyomiCol
              ? 'bg-gradient-to-b from-[#7F1D1D]/20 via-transparent to-transparent'
              : 'bg-gradient-to-b from-white/[0.03] via-transparent to-transparent',
          )}
        />

        {/* Left & Right vertical engraved totem grooves */}
        <div
          className={cn(
            'absolute inset-y-8 left-1.5 w-px bg-gradient-to-b from-transparent to-transparent',
            isTsukuyomiCol ? 'via-[#DC2626]/35' : 'via-[#3F3F46]/45',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-8 right-1.5 w-px bg-gradient-to-b from-transparent to-transparent',
            isTsukuyomiCol ? 'via-[#DC2626]/35' : 'via-[#3F3F46]/45',
          )}
        />

        {/* Bottom totem seal occlusion */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
      </div>

      {/* Exclusive Pulsing Crimson Aura for Central Tsukuyomi Column */}
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
                : { opacity: [0.35, 0.92, 0.35] }
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
        <TotemHeaderOrnament isTsukuyomi={isTsukuyomiCol} />
      </div>

      {/* Column Header */}
      <header className="relative z-10 mb-4 flex items-start justify-between gap-3 border-b border-[#27272A]/80 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
              isTsukuyomiCol
                ? 'border-[#DC2626]/65 bg-[#450A0A]/45 text-[#EF4444] shadow-[0_0_14px_rgba(220,38,38,0.25)]'
                : 'border-[#27272A] bg-[#09090B] text-[#A1A1AA]',
            )}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold tracking-wide text-[#FAFAFA]">
                {title}
              </h3>
              <span
                className={cn(
                  'relative inline-flex min-w-[1.75rem] items-center justify-center overflow-hidden rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
                  isTsukuyomiCol
                    ? 'border-[#7F1D1D]/80 bg-[#09090B] text-[#FCA5A5]'
                    : 'border-[#27272A] bg-[#09090B] text-[#FAFAFA]',
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
            <p className="mt-0.5 text-xs text-[#A1A1AA]">{subtitle}</p>
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
          className="rounded-lg border border-[#27272A] bg-[#09090B] p-1.5 text-[#A1A1AA] transition-colors hover:border-[#DC2626]/60 hover:text-[#FAFAFA]"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </header>

      {/* Mission Cards Stack */}
      <SortableContext
        items={missions.map((mission) => mission.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="relative z-10 flex flex-1 flex-col gap-3">
          {missions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#27272A] bg-[#09090B]/55 px-4 py-10 text-center">
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
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#121215] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#DC2626]/60"
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
}
