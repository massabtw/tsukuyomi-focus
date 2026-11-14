'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  History,
  RotateCcw,
  Shield,
  XCircle,
} from 'lucide-react';
import { RANK_DEFINITIONS, RANK_ORDER } from '@/constants/ranks';
import { cn } from '@/lib/cn';
import { formatDisplayDatePtBr, formatDurationHuman } from '@/lib/date';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { MissionRank } from '@/types/tsukuyomi';

type RankFilter = 'ALL' | MissionRank;
type StatusFilter = 'ALL' | 'completed' | 'abandoned' | 'susanoo';

const STATUS_OPTIONS: ReadonlyArray<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'abandoned', label: 'Abandonadas' },
  { id: 'susanoo', label: "Com Susano'o" },
];

function formatTimeFromIso(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }
  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionLogList() {
  const sessionLogs = useTsukuyomiStore((s) => s.sessionLogs);
  const [rankFilter, setRankFilter] = useState<RankFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const filteredLogs = useMemo(() => {
    const sorted = [...sessionLogs].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );

    return sorted.filter((log) => {
      if (rankFilter !== 'ALL' && log.rank !== rankFilter) {
        return false;
      }
      if (statusFilter === 'completed' && !log.wasCompleted) {
        return false;
      }
      if (statusFilter === 'abandoned' && log.wasCompleted) {
        return false;
      }
      if (statusFilter === 'susanoo' && !log.usedSusanoo) {
        return false;
      }
      return true;
    });
  }, [sessionLogs, rankFilter, statusFilter]);

  const hasActiveFilters = rankFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <section
      aria-labelledby="session-log-heading"
      className="obsidian-surface rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-red-500" aria-hidden="true" />
            <h2
              id="session-log-heading"
              className="text-sm font-semibold tracking-wide text-zinc-100 sm:text-base"
            >
              Registro Cronológico de Sessões
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Exibindo{' '}
            <span className="font-mono text-zinc-200 tabular-nums">
              {filteredLogs.length}
            </span>{' '}
            de{' '}
            <span className="font-mono text-zinc-200 tabular-nums">
              {sessionLogs.length}
            </span>{' '}
            ciclos registrados
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Rank Filter */}
          <div
            role="group"
            aria-label="Filtrar sessões por Rank"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B]/90 p-1"
          >
            <button
              type="button"
              aria-pressed={rankFilter === 'ALL'}
              onClick={() => setRankFilter('ALL')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                rankFilter === 'ALL'
                  ? 'bg-red-950/70 text-red-300 ring-1 ring-red-600/50'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              ALL
            </button>
            {RANK_ORDER.map((rank) => {
              const isSelected = rankFilter === rank;
              return (
                <button
                  key={rank}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setRankFilter(rank)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                    isSelected
                      ? 'bg-red-950/70 text-red-300 ring-1 ring-red-600/50'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  {rank}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div
            role="group"
            aria-label="Filtrar sessões por Status"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B]/90 p-1"
          >
            {STATUS_OPTIONS.map((option) => {
              const isSelected = statusFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStatusFilter(option.id)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                    isSelected
                      ? 'bg-red-950/70 text-red-300 ring-1 ring-red-600/50'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session List */}
      {filteredLogs.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-[#09090B]/60 px-4 py-10 text-center">
          <p className="text-sm font-medium text-zinc-300">
            Nenhum ciclo encontrado para os filtros selecionados.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ajuste o Rank ou o Status para inspecionar outros registros do pergaminho.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setRankFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800/70">
          {filteredLogs.map((log) => {
            const rankDef = RANK_DEFINITIONS[log.rank];
            return (
              <li
                key={log.id}
                className="flex flex-col justify-between gap-3 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      style={{
                        color: rankDef.badgeColor,
                        borderColor: rankDef.borderColor,
                      }}
                      className="inline-flex h-5 w-6 shrink-0 items-center justify-center rounded border bg-[#09090B] font-mono text-[11px] font-bold tabular-nums"
                    >
                      {log.rank}
                    </span>

                    <span className="truncate text-sm font-medium text-zinc-100">
                      {log.missionTitle}
                    </span>

                    {/* Amaterasu Badge: strictly #000000 + #DC2626 (no orange/yellow) */}
                    {log.isAmaterasu ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#DC2626]/80 bg-[#000000] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#EF4444] shadow-[0_0_10px_rgba(220,38,38,0.45)]">
                        <Flame className="h-3 w-3 text-[#DC2626]" aria-hidden="true" />
                        AMATERASU
                      </span>
                    ) : null}

                    {/* Susano'o Badge */}
                    {log.usedSusanoo ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/45 bg-indigo-950/50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-300">
                        <Shield className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                        SUSANO&apos;O
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      {log.wasCompleted ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="h-3.5 w-3.5 text-red-500"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={
                          log.wasCompleted ? 'text-zinc-300' : 'text-red-400'
                        }
                      >
                        {log.wasCompleted ? 'Concluída' : 'Abandonada'}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-zinc-700">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatDisplayDatePtBr(log.date)} às{' '}
                      {formatTimeFromIso(log.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4 self-end font-mono text-xs tabular-nums sm:self-center">
                  <div className="text-right">
                    <span className="block text-[10px] text-zinc-500 uppercase">
                      Duração
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {formatDurationHuman(log.durationMinutes)}
                    </span>
                  </div>
                  <div className="min-w-[84px] text-right">
                    <span className="block text-[10px] text-zinc-500 uppercase">
                      Chakra
                    </span>
                    <span
                      className={cn(
                        'font-semibold',
                        log.wasCompleted && log.chakraEarned > 0
                          ? 'text-red-400'
                          : 'text-zinc-600',
                      )}
                    >
                      {log.wasCompleted && log.chakraEarned > 0
                        ? `+${log.chakraEarned.toLocaleString('pt-BR')}`
                        : '0'}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
