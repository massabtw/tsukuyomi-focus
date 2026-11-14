'use client';

import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { MissionCard } from '@/components/kanban/MissionCard';
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
        'relative flex min-h-[420px] flex-col rounded-2xl border border-t border-[#27272A] border-t-white/[0.07] bg-[#121215]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors duration-200',
        isTsukuyomiCol && 'border-t-[#DC2626]/25',
        isOver &&
          'border-[#DC2626]/70 border-t-[#EF4444]/40 bg-[#121215] shadow-[0_0_28px_rgba(127,29,29,0.35),0_20px_50px_rgba(0,0,0,0.9)]',
      )}
    >
      {/* Column Header */}
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-[#27272A]/80 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
              isTsukuyomiCol
                ? 'border-[#7F1D1D]/70 bg-[#450A0A]/40 text-[#EF4444]'
                : 'border-[#27272A] bg-[#09090B] text-[#A1A1AA]',
            )}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-[#FAFAFA]">
                {title}
              </h3>
              <span className="rounded-md border border-[#27272A] bg-[#09090B] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-[#FAFAFA]">
                {missions.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#A1A1AA]">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddClick(status)}
          title={`Adicionar missão em ${title}`}
          aria-label={`Adicionar nova missão em ${title}`}
          className="rounded-lg border border-[#27272A] bg-[#09090B] p-1.5 text-[#A1A1AA] transition-colors hover:border-[#DC2626]/60 hover:text-[#FAFAFA]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Mission Cards Stack */}
      <SortableContext
        items={missions.map((mission) => mission.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-3">
          {missions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#27272A] bg-[#09090B]/55 px-4 py-10 text-center">
              <p className="max-w-[22ch] text-xs leading-relaxed text-[#A1A1AA]">
                {emptyText}
              </p>
              <button
                type="button"
                onClick={() => onAddClick(status)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#121215] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#DC2626]/60"
              >
                <Plus className="h-3.5 w-3.5 text-[#DC2626]" />
                Selar Missão
              </button>
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
    </section>
  );
}
