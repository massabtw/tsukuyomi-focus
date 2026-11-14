'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import {
  formatDisplayDatePtBr,
  formatDurationHuman,
  parseLocalDate,
} from '@/lib/date';
import { buildUchihaHeatmapDays } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { HeatmapDayCell } from '@/types/tsukuyomi';

const OBSIDIAN_PANEL_CLASS =
  'bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] border border-white/[0.06] hover:border-red-500/30 transition-colors';

const LEVEL_STYLES: Record<HeatmapDayCell['level'], string> = {
  0: 'bg-[#18181B] border-zinc-800/80',
  1: 'bg-[#450A0A] border-red-950/90',
  2: 'bg-[#7F1D1D] border-red-900/90',
  3: 'bg-[#DC2626] border-red-500/80',
  4: 'bg-[#EF4444] border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.55)]',
};

const LEVEL_LABELS: ReadonlyArray<{
  level: HeatmapDayCell['level'];
  range: string;
}> = [
  { level: 0, range: '0m' },
  { level: 1, range: '1-29m' },
  { level: 2, range: '30-59m' },
  { level: 3, range: '60-119m' },
  { level: 4, range: '120+m' },
];

const PT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

const WEEKDAY_LABELS: ReadonlyArray<{ row: number; label: string }> = [
  { row: 1, label: 'Seg' },
  { row: 3, label: 'Qua' },
  { row: 5, label: 'Sex' },
];

interface WeekColumn {
  cells: Array<HeatmapDayCell | null>;
  monthLabel: string | null;
}

export function UchihaHeatmap() {
  const sessionLogs = useTsukuyomiStore((s) => s.sessionLogs);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [hoveredCell, setHoveredCell] = useState<{
    cell: HeatmapDayCell;
    weekIndex: number;
    dayIndex: number;
  } | null>(null);

  const { weeks, totalActiveDays, totalMinutes365 } = useMemo(() => {
    const days = buildUchihaHeatmapDays(sessionLogs, 365);
    const firstWeekday =
      days.length > 0 ? parseLocalDate(days[0].date).getDay() : 0;

    const padded: Array<HeatmapDayCell | null> = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...days,
    ];

    const columns: WeekColumn[] = [];
    let lastMonth = -1;

    for (let i = 0; i < padded.length; i += 7) {
      const slice = padded.slice(i, i + 7);
      while (slice.length < 7) {
        slice.push(null);
      }

      const firstRealCell = slice.find((item) => item !== null) ?? null;
      let monthLabel: string | null = null;
      if (firstRealCell) {
        const month = parseLocalDate(firstRealCell.date).getMonth();
        if (month !== lastMonth) {
          monthLabel = PT_MONTHS[month];
          lastMonth = month;
        }
      }

      columns.push({ cells: slice, monthLabel });
    }

    let activeDays = 0;
    let totalMinutes = 0;
    for (const day of days) {
      if (day.minutes > 0) {
        activeDays += 1;
        totalMinutes += day.minutes;
      }
    }

    return {
      weeks: columns,
      totalActiveDays: activeDays,
      totalMinutes365: totalMinutes,
    };
  }, [sessionLogs]);

  return (
    <section
      aria-labelledby="uchiha-heatmap-heading"
      className={cn('relative rounded-2xl p-5 sm:p-6', OBSIDIAN_PANEL_CLASS)}
    >
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-red-500" aria-hidden="true" />
            <h2
              id="uchiha-heatmap-heading"
              className="text-sm font-semibold tracking-wide text-zinc-100 sm:text-base"
            >
              Mapa de Intensidade Uchiha (365 Dias)
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            <span className="font-mono text-zinc-200 tabular-nums">
              {totalActiveDays}
            </span>{' '}
            dias ativos ·{' '}
            <span className="font-mono text-zinc-200 tabular-nums">
              {formatDurationHuman(totalMinutes365)}
            </span>{' '}
            acumulados no último ano
          </p>
        </div>

        {/* Live Inspector Readout (zero layout shift on hover/focus) */}
        <div
          aria-live="polite"
          className={cn(
            'flex min-h-[36px] items-center rounded-xl px-3 py-1.5 text-xs',
            OBSIDIAN_PANEL_CLASS,
          )}
        >
          {hoveredCell ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="font-medium text-zinc-200">
                {formatDisplayDatePtBr(hoveredCell.cell.date)}
              </span>
              <span className="font-mono text-zinc-300 tabular-nums">
                {hoveredCell.cell.minutes}m focados
              </span>
              <span className="font-mono text-red-400 tabular-nums">
                +{hoveredCell.cell.chakra.toLocaleString('pt-BR')} Chakra
              </span>
            </div>
          ) : (
            <span className="text-zinc-500">
              Inspecione um dia para ver minutos e Chakra
            </span>
          )}
        </div>
      </div>

      {/* 52+ Weeks Grid */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          {/* Month Header Row */}
          <div className="flex items-center gap-1 pl-8">
            {weeks.map((week, weekIdx) => (
              <div
                key={`month-${weekIdx}`}
                className="w-3.5 shrink-0 text-[10px] font-medium text-zinc-500"
              >
                {week.monthLabel ?? ''}
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            {/* Weekday Labels */}
            <div className="grid w-6 shrink-0 grid-rows-7 gap-1 py-0.5 text-[10px] text-zinc-500">
              {Array.from({ length: 7 }, (_, rowIdx) => {
                const match = WEEKDAY_LABELS.find((w) => w.row === rowIdx);
                return (
                  <span
                    key={`wd-${rowIdx}`}
                    className="flex h-3.5 items-center justify-end pr-1"
                  >
                    {match ? match.label : ''}
                  </span>
                );
              })}
            </div>

            {/* Heatmap Columns */}
            <div
              className="flex gap-1"
              role="grid"
              aria-label="Calendário de foco dos últimos 365 dias"
            >
              {weeks.map((week, weekIdx) => (
                <div key={`week-${weekIdx}`} className="grid grid-rows-7 gap-1">
                  {week.cells.map((cell, dayIdx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${weekIdx}-${dayIdx}`}
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      );
                    }

                    const isSelected =
                      hoveredCell?.cell.date === cell.date;
                    const isNeighbor =
                      hoveredCell !== null &&
                      !(
                        hoveredCell.weekIndex === weekIdx &&
                        hoveredCell.dayIndex === dayIdx
                      ) &&
                      Math.abs(weekIdx - hoveredCell.weekIndex) <= 1 &&
                      Math.abs(dayIdx - hoveredCell.dayIndex) <= 1;

                    const tooltipHorizontalClass =
                      weekIdx < 7
                        ? 'left-0'
                        : weekIdx > weeks.length - 8
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2';
                    const tooltipVerticalClass =
                      dayIdx <= 1 ? 'top-full mt-2' : 'bottom-full mb-2';

                    return (
                      <div key={cell.date} className="relative">
                        <button
                          type="button"
                          onMouseEnter={() => {
                            audioEngine.playHover();
                            setHoveredCell({
                              cell,
                              weekIndex: weekIdx,
                              dayIndex: dayIdx,
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onFocus={() =>
                            setHoveredCell({
                              cell,
                              weekIndex: weekIdx,
                              dayIndex: dayIdx,
                            })
                          }
                          onBlur={() => setHoveredCell(null)}
                          aria-label={`${formatDisplayDatePtBr(cell.date)}: ${cell.minutes} minutos focados, ${cell.chakra} Chakra obtido`}
                          className={cn(
                            'relative block h-3.5 w-3.5 rounded-[3px] border transition-all duration-150 hover:z-20 hover:scale-125 focus-visible:z-20 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
                            LEVEL_STYLES[cell.level],
                            isNeighbor &&
                              'z-10 scale-110 border-red-400/75 ring-1 ring-red-500/45 shadow-[0_0_10px_rgba(239,68,68,0.55)]',
                            isNeighbor && cell.level === 0 && 'bg-[#2A0E12]',
                          )}
                        >
                          {cell.level === 4 && !prefersReducedMotion ? (
                            <motion.span
                              aria-hidden="true"
                              animate={{
                                opacity: [0.45, 1, 0.45],
                                scale: [0.96, 1.14, 0.96],
                              }}
                              transition={{
                                duration: 2.2,
                                delay: (weekIdx + dayIdx) * 0.06,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                type: 'tween',
                              }}
                              style={{ willChange: 'transform, opacity' }}
                              className="pointer-events-none absolute -inset-px rounded-[3px] bg-red-400/55 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
                            />
                          ) : null}
                        </button>

                        {isSelected ? (
                          <div
                            role="tooltip"
                            className={cn(
                              'pointer-events-none absolute z-30 w-44 rounded-lg px-2.5 py-2 text-[11px]',
                              OBSIDIAN_PANEL_CLASS,
                              tooltipHorizontalClass,
                              tooltipVerticalClass,
                            )}
                          >
                            <p className="font-medium text-zinc-100">
                              {formatDisplayDatePtBr(cell.date)}
                            </p>
                            <div className="mt-1 flex items-center justify-between text-zinc-400">
                              <span>Foco</span>
                              <span className="font-mono text-zinc-200 tabular-nums">
                                {cell.minutes} min
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400">
                              <span>Chakra</span>
                              <span className="font-mono text-red-400 tabular-nums">
                                +{cell.chakra.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
        <span>Escala de concentração diária</span>
        <div className="flex items-center gap-2">
          <span>Menos</span>
          <div className="flex items-center gap-1.5">
            {LEVEL_LABELS.map((item) => (
              <span
                key={item.level}
                title={item.range}
                aria-label={`Nível ${item.level}: ${item.range}`}
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-[3px] border',
                  LEVEL_STYLES[item.level],
                )}
              />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </div>
    </section>
  );
}
