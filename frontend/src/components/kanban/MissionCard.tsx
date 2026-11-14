'use client';

import type { MouseEvent, PointerEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Clock, Eye, Flame, GripVertical, Sparkles, Trash2 } from 'lucide-react';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { useAwwwardsParallax } from '@/hooks/useAwwwardsParallax';
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

function AmaterasuFlameEmblem() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative flex h-5 w-5 items-center justify-center will-change-transform"
      style={{
        filter: 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.65))',
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
  const parallax = useAwwwardsParallax(0.75);
  const rankDef = RANK_DEFINITIONS[mission.rank];
  const isCompleted = mission.status === 'completed';

  const chakraPreview = calculateSessionChakra({
    durationMinutes: mission.estimatedMinutes,
    rank: mission.rank,
    isAmaterasu: mission.isAmaterasu,
    usedSusanoo: false,
  });

  // Disable 3D pointer tilt while dragging or inside DragOverlay to avoid conflicts with @dnd-kit CSS.Translate
  const disableTilt = isDragging || isOverlay;

  return (
    <div style={{ perspective: '1200px' }}>
      <motion.div
        style={{
          rotateX: disableTilt ? 0 : parallax.rotateX,
          rotateY: disableTilt ? 0 : parallax.rotateY,
          transformStyle: 'preserve-3d',
        }}
        {...(disableTilt ? {} : parallax.handlers)}
        className={cn(
          'group relative overflow-hidden rounded-xl border p-4 transition-colors duration-200 will-change-transform',
          mission.isAmaterasu
            ? 'animate-amaterasu-flicker border-[#DC2626]/70 bg-[#000000] shadow-[inset_0_0_26px_rgba(0,0,0,0.98),0_12px_32px_rgba(0,0,0,0.92)]'
            : 'border-[#27272A] border-t-white/[0.07] bg-[#121215]/95 shadow-[0_14px_34px_rgba(0,0,0,0.85)] hover:border-[#3F3F46]',
          isActiveInTemple &&
            !mission.isAmaterasu &&
            'border-[#DC2626]/55 border-t-[#EF4444]/30',
          isOverlay && 'ring-1 ring-[#DC2626]/65 shadow-[0_24px_56px_rgba(0,0,0,0.95)]',
        )}
      >
        {/* Amaterasu canonical black core + crimson ember rim */}
        {mission.isAmaterasu && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DC2626] to-transparent opacity-90"
            />
            <motion.div
              aria-hidden="true"
              style={disableTilt ? undefined : parallax.layerBg}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(127,29,29,0.28)_0%,rgba(0,0,0,0.96)_62%,#000000_100%)]"
            />
          </>
        )}

        {/* Card Content */}
        <div className="relative z-10 space-y-3">
          {/* Top Row: Rank Badge + Amaterasu + Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide tabular-nums"
                style={{
                  color: rankDef.badgeColor,
                  borderColor: rankDef.borderColor,
                  backgroundColor: 'rgba(9, 9, 11, 0.9)',
                  boxShadow: `0 0 12px ${rankDef.glowColor}`,
                }}
              >
                <span>{rankDef.rank}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {rankDef.multiplier.toFixed(1)}x
                </span>
              </span>

              {mission.isAmaterasu && (
                <motion.span
                  style={disableTilt ? undefined : parallax.layerFg}
                  className="inline-flex items-center gap-1 rounded-md border border-[#DC2626]/70 bg-[#000000] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#EF4444] uppercase"
                >
                  <AmaterasuFlameEmblem />
                  <span>Amaterasu 2.0x</span>
                </motion.span>
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
                <button
                  type="button"
                  onPointerDown={stopCardEvent}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAmaterasu(mission.id);
                  }}
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
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onPointerDown={stopCardEvent}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(mission.id);
                  }}
                  title="Remover missão"
                  aria-label={`Remover missão ${mission.title}`}
                  className="rounded-md border border-transparent p-1.5 text-[#52525B] transition-colors hover:border-[#27272A] hover:bg-[#09090B] hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
            <button
              type="button"
              onPointerDown={stopCardEvent}
              onClick={(e) => {
                e.stopPropagation();
                onDragToTsukuyomi(mission.id);
              }}
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
            </button>
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
