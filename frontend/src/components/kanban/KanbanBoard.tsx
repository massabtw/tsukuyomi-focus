'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  CheckCircle2,
  Eye,
  Flame,
  Plus,
  ScrollText,
  X,
} from 'lucide-react';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { MissionCard } from '@/components/kanban/MissionCard';
import { NewMissionModal } from '@/components/kanban/NewMissionModal';
import { RANK_DEFINITIONS, RANK_ORDER } from '@/constants/ranks';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { formatLocalDate } from '@/lib/date';
import { sortMissionsAmaterasuFirst } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { Mission, MissionStatus } from '@/types/tsukuyomi';

const COLUMN_CONFIG: ReadonlyArray<{
  status: MissionStatus;
  code: string;
  title: string;
  subtitle: string;
  emptyText: string;
}> = [
  {
    status: 'todo',
    code: '01 // PERGAMINHO',
    title: 'Pergaminho de Missões',
    subtitle: 'Operações aguardando execução no altar',
    emptyText: 'Nenhuma missão aguardando no pergaminho.',
  },
  {
    status: 'in_tsukuyomi',
    code: '02 // GENJUTSU',
    title: 'Dentro do Tsukuyomi',
    subtitle: 'Em foco contínuo sob domínio temporal',
    emptyText: 'Arraste uma missão para cá ou trague-a para o Tsukuyomi.',
  },
  {
    status: 'completed',
    code: '03 // SELO CUMPRIDO',
    title: 'Missões Cumpridas',
    subtitle: 'Contratos encerrados e Chakra absorvido',
    emptyText: 'Conclua ciclos no Templo ou mova missões encerradas.',
  },
];

const CTA_SPRING = {
  type: 'spring',
  stiffness: 340,
  damping: 24,
} as const;

const OBSIDIAN_SURFACE =
  'bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] border border-white/[0.06] hover:border-red-500/30 transition-colors';

function isMissionStatus(value: string): value is MissionStatus {
  return (
    value === 'todo' || value === 'in_tsukuyomi' || value === 'completed'
  );
}

export function KanbanBoard() {
  const boardRef = useRef<HTMLElement>(null);
  const [ctaScope, animateCta] = useAnimate<HTMLButtonElement>();
  const prefersReducedMotion = Boolean(useReducedMotion());

  const missions = useTsukuyomiStore((state) => state.missions);
  const activeMissionId = useTsukuyomiStore(
    (state) => state.timer.activeMissionId,
  );
  const moveMission = useTsukuyomiStore((state) => state.moveMission);
  const reorderMissionsInColumn = useTsukuyomiStore(
    (state) => state.reorderMissionsInColumn,
  );
  const deleteMission = useTsukuyomiStore((state) => state.deleteMission);
  const toggleMissionAmaterasu = useTsukuyomiStore(
    (state) => state.toggleMissionAmaterasu,
  );
  const dragMissionToTsukuyomi = useTsukuyomiStore(
    (state) => state.dragMissionToTsukuyomi,
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeMobileColumn, setActiveMobileColumn] =
    useState<MissionStatus>('todo');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultStatus, setModalDefaultStatus] =
    useState<MissionStatus>('todo');
  const [amaterasuNotice, setAmaterasuNotice] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: boardRef,
    offset: ['start end', 'end start'],
  });

  const bgParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['-6%', '14%'],
  );
  const sealParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['8%', '-10%'],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const groupedMissions = useMemo(() => {
    const todo: Mission[] = [];
    const inTsukuyomi: Mission[] = [];
    const completed: Mission[] = [];

    for (const mission of missions) {
      if (mission.status === 'todo') {
        todo.push(mission);
      } else if (mission.status === 'in_tsukuyomi') {
        inTsukuyomi.push(mission);
      } else {
        completed.push(mission);
      }
    }

    return {
      todo: sortMissionsAmaterasuFirst(todo),
      in_tsukuyomi: sortMissionsAmaterasuFirst(inTsukuyomi),
      completed: sortMissionsAmaterasuFirst(completed),
    };
  }, [missions]);

  const activeDragMission = useMemo(
    () =>
      activeDragId
        ? missions.find((m) => m.id === activeDragId) ?? null
        : null,
    [activeDragId, missions],
  );

  const today = formatLocalDate();
  const activeAmaterasuMission = missions.find(
    (m) =>
      m.status !== 'completed' &&
      m.isAmaterasu &&
      m.amaterasuDate === today,
  );

  const openNewMissionModal = useCallback((status: MissionStatus = 'todo') => {
    setModalDefaultStatus(status);
    setModalOpen(true);
  }, []);

  const handleToggleAmaterasu = useCallback(
    (id: string) => {
      const result = toggleMissionAmaterasu(id);
      if (!result.ok && result.reason) {
        audioEngine.playClick();
        setAmaterasuNotice(result.reason);
      } else {
        setAmaterasuNotice(null);
      }
    },
    [toggleMissionAmaterasu],
  );

  function handleCtaPointerEnter() {
    audioEngine.playHover();
    if (prefersReducedMotion || !ctaScope.current) return;

    void animateCta(
      '[data-katana-beam]',
      { x: ['-20%', '120%'], opacity: [0, 1, 1, 0] },
      {
        type: 'tween',
        duration: 0.18,
        times: [0, 0.15, 0.85, 1],
        ease: [0.16, 1, 0.3, 1],
      },
    );
  }

  function resolveTargetStatus(overId: string): MissionStatus | null {
    if (isMissionStatus(overId)) {
      return overId;
    }
    const overMission = missions.find((m) => m.id === overId);
    return overMission ? overMission.status : null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const draggingMission = missions.find((m) => m.id === activeId);
    if (!draggingMission) return;

    const targetStatus = resolveTargetStatus(overId);
    if (!targetStatus || draggingMission.status === targetStatus) {
      return;
    }

    const targetColumnMissions = groupedMissions[targetStatus];
    const overIndex = isMissionStatus(overId)
      ? targetColumnMissions.length
      : targetColumnMissions.findIndex((m) => m.id === overId);

    moveMission(
      activeId,
      targetStatus,
      overIndex >= 0 ? overIndex : targetColumnMissions.length,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const draggingMission = missions.find((m) => m.id === activeId);
    if (!draggingMission) return;

    const targetStatus = resolveTargetStatus(overId);
    if (!targetStatus) return;

    if (draggingMission.status !== targetStatus) {
      audioEngine.playClick();
      moveMission(activeId, targetStatus);
      return;
    }

    if (activeId !== overId && !isMissionStatus(overId)) {
      audioEngine.playClick();
      reorderMissionsInColumn(targetStatus, activeId, overId);
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  function getColumnIcon(status: MissionStatus) {
    switch (status) {
      case 'todo':
        return <ScrollText className="h-4 w-4" />;
      case 'in_tsukuyomi':
        return <Eye className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  }

  return (
    <section
      ref={boardRef}
      aria-label="Quadro Kanban de Missões Ninja"
      className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 ${OBSIDIAN_SURFACE}`}
    >
      {/* Top Tactical Specular Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#DC2626]/40 to-transparent"
      />

      {/* Plano -2 / -1: Scroll Parallax Depth Accent & Monumental 任務 Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <motion.div
          style={{ y: bgParallaxY }}
          className="absolute -inset-x-8 -top-16 -bottom-16 will-change-transform"
        >
          <div className="naka-stone-texture absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(127,29,29,0.16)_0%,rgba(9,9,11,0.45)_55%,#070709_100%)]" />
        </motion.div>

        {/* Engraved Monumental Japanese Watermark Kanji: 任務 (Mission) */}
        <motion.div
          style={{ y: sealParallaxY }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden will-change-transform"
        >
          <span className="font-serif text-[12rem] font-bold tracking-[0.16em] text-white opacity-[0.03] select-none sm:text-[17rem] lg:text-[22rem]">
            任務
          </span>
        </motion.div>

        <motion.div
          style={{ y: sealParallaxY }}
          className="absolute top-6 right-6 opacity-[0.06] will-change-transform"
        >
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="120"
              cy="120"
              r="108"
              stroke="#DC2626"
              strokeWidth="1.2"
              strokeDasharray="6 8"
            />
            <circle
              cx="120"
              cy="120"
              r="74"
              stroke="#A1A1AA"
              strokeWidth="1"
            />
            <circle
              cx="120"
              cy="120"
              r="24"
              stroke="#DC2626"
              strokeWidth="1.2"
            />
          </svg>
        </motion.div>
      </div>

      {/* Plano 0: Header Bar & Rank Legend */}
      <div className="relative z-10 space-y-5">
        <header
          className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between ${OBSIDIAN_SURFACE}`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              <span className="font-mono text-[10px] tracking-[0.22em] text-zinc-400 uppercase">
                CHAKRA MISSION DISPATCH // 任務板
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-semibold tracking-wide text-[#FAFAFA] sm:text-2xl">
                Quadro de Missões Uchiha
              </h2>
              {activeAmaterasuMission ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DC2626]/65 bg-[#000000] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#EF4444] shadow-[0_0_12px_rgba(220,38,38,0.28)]">
                  <Flame className="h-3 w-3 text-[#DC2626]" />
                  Amaterasu Ativo Hoje
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#09090B]/90 px-2.5 py-0.5 font-mono text-[11px] text-[#A1A1AA]">
                  <Flame className="h-3 w-3 text-[#52525B]" />
                  Selo Amaterasu Disponível
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] sm:text-sm">
              Organize seus contratos por Rank Ninja, sele uma missão diária com
              as Chamas Negras ou trague-a diretamente para o Templo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Rank Multiplier Legend (D 1.0x .. S 3.0x) */}
            <div
              aria-label="Legenda de multiplicadores por Rank"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 px-2.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              <span className="mr-1 font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase">
                Ranks
              </span>
              {RANK_ORDER.map((rankKey) => {
                const def = RANK_DEFINITIONS[rankKey];
                return (
                  <span
                    key={rankKey}
                    title={`${def.label} — ${def.title} (${def.suggestedMinutes}m)`}
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                    style={{
                      color: def.badgeColor,
                      borderColor: `${def.borderColor}70`,
                      backgroundColor: 'rgba(12, 12, 16, 0.94)',
                      boxShadow: `0 0 10px ${def.glowColor}`,
                    }}
                  >
                    <span className="font-bold">{def.rank}</span>
                    <span className="text-[10px] text-[#A1A1AA]">
                      {def.multiplier.toFixed(1)}x
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Primary CTA with Katana Slash Sheen */}
            <motion.button
              ref={ctaScope}
              type="button"
              whileHover={
                prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }
              }
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={CTA_SPRING}
              onPointerEnter={handleCtaPointerEnter}
              onClick={() => {
                audioEngine.playClick();
                openNewMissionModal('todo');
              }}
              className="relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-[#EF4444]/70 bg-gradient-to-b from-[#EF4444] via-[#DC2626] to-[#991B1B] px-4 py-2.5 text-sm font-semibold text-[#FAFAFA] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_24px_rgba(220,38,38,0.4)] transition-colors hover:border-red-300/80"
            >
              {/* Katana Slash Sheen Beam (2px, 35deg, white core + red halo) */}
              <div
                aria-hidden="true"
                data-katana-beam=""
                style={{ opacity: 0, transform: 'translateX(-20%)' }}
                className="pointer-events-none absolute inset-0 z-20 will-change-transform"
              >
                <div
                  className="absolute -top-[45%] left-0 h-[190%] w-[2px] rotate-[35deg] bg-white"
                  style={{
                    boxShadow:
                      '0 0 8px 1px #FFFFFF, 0 0 16px 3px rgba(239, 68, 68, 0.95), 0 0 26px 5px rgba(220, 38, 38, 0.7)',
                  }}
                />
              </div>

              <span className="relative z-10 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Missão
              </span>
            </motion.button>
          </div>
        </header>

        {/* Inline Amaterasu Rule Feedback */}
        <AnimatePresence>
          {amaterasuNotice && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-[#DC2626]/65 bg-[#000000] px-4 py-2.5 text-xs text-[#FCA5A5] shadow-[inset_0_0_20px_rgba(0,0,0,0.95),0_0_18px_rgba(127,29,29,0.4)]"
            >
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 shrink-0 text-[#DC2626]" />
                <span>{amaterasuNotice}</span>
              </div>
              <button
                type="button"
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  setAmaterasuNotice(null);
                }}
                aria-label="Fechar aviso do Amaterasu"
                className="rounded p-1 text-[#A1A1AA] transition-colors hover:text-[#FAFAFA]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Column Selector (< lg) */}
        <div
          role="tablist"
          aria-label="Selecionar coluna de missões"
          className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0B0B0F]/95 p-1.5 lg:hidden"
        >
          {(
            [
              { status: 'todo', label: 'A Fazer' },
              { status: 'in_tsukuyomi', label: 'No Tsukuyomi' },
              { status: 'completed', label: 'Concluídas' },
            ] as const
          ).map((tab) => {
            const isActive = activeMobileColumn === tab.status;
            const count = groupedMissions[tab.status].length;
            return (
              <button
                key={tab.status}
                type="button"
                role="tab"
                aria-selected={isActive}
                onMouseEnter={() => audioEngine.playHover()}
                onClick={() => {
                  audioEngine.playClick();
                  setActiveMobileColumn(tab.status);
                }}
                className={cn(
                  'flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'border-[#DC2626]/65 bg-gradient-to-b from-red-950/75 via-[#190507]/95 to-black text-white shadow-[0_0_16px_rgba(220,38,38,0.28)]'
                    : 'border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                )}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums',
                    isActive
                      ? 'bg-red-500/25 text-red-200'
                      : 'bg-zinc-900 text-zinc-400',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3-Column 2.5D Obsidian Totem Drag & Drop Board */}
        <DndContext
          id="tsukuyomi-kanban-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            style={{ perspective: '1400px' }}
            className="grid grid-cols-1 gap-5 lg:grid-cols-3"
          >
            {COLUMN_CONFIG.map((column) => (
              <div
                key={column.status}
                className={cn(
                  column.status === activeMobileColumn
                    ? 'block'
                    : 'hidden lg:block',
                )}
              >
                <KanbanColumn
                  status={column.status}
                  code={column.code}
                  title={column.title}
                  subtitle={column.subtitle}
                  emptyText={column.emptyText}
                  icon={getColumnIcon(column.status)}
                  missions={groupedMissions[column.status]}
                  activeMissionId={activeMissionId}
                  onAddClick={openNewMissionModal}
                  onDragToTsukuyomi={dragMissionToTsukuyomi}
                  onToggleAmaterasu={handleToggleAmaterasu}
                  onDeleteMission={deleteMission}
                />
              </div>
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDragMission ? (
              <div className="w-full max-w-sm">
                <MissionCard
                  mission={activeDragMission}
                  isActiveInTemple={activeDragMission.id === activeMissionId}
                  isOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <NewMissionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStatus={modalDefaultStatus}
      />
    </section>
  );
}
