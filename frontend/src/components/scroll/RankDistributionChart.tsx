'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { formatDurationHuman } from '@/lib/date';
import { computeScrollStats } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;

export function RankDistributionChart() {
  const missions = useTsukuyomiStore((s) => s.missions);
  const sessionLogs = useTsukuyomiStore((s) => s.sessionLogs);
  const prefersReducedMotion = useReducedMotion();

  const { rankDistribution, maxMinutes } = useMemo(() => {
    const summary = computeScrollStats(missions, sessionLogs);
    let peak = 0;
    for (const entry of summary.rankDistribution) {
      if (entry.totalMinutes > peak) {
        peak = entry.totalMinutes;
      }
    }
    return {
      rankDistribution: summary.rankDistribution,
      maxMinutes: Math.max(1, peak),
    };
  }, [missions, sessionLogs]);

  return (
    <section
      aria-labelledby="rank-distribution-heading"
      className="obsidian-surface rounded-2xl p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-500" aria-hidden="true" />
            <h2
              id="rank-distribution-heading"
              className="text-sm font-semibold tracking-wide text-zinc-100 sm:text-base"
            >
              Distribuição por Rank Ninja
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Missões cumpridas, ciclos concluídos e tempo acumulado de D até S
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rankDistribution.map((entry, idx) => {
          const def = RANK_DEFINITIONS[entry.rank];
          const rawRatio = entry.totalMinutes / maxMinutes;
          const ratio =
            entry.totalMinutes > 0
              ? Math.max(0.06, Math.min(1, rawRatio))
              : entry.completedMissions > 0
                ? 0.06
                : 0;

          return (
            <div key={entry.rank} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      color: def.badgeColor,
                      borderColor: def.borderColor,
                      boxShadow: `0 0 10px ${def.glowColor}`,
                    }}
                    className="inline-flex h-6 w-7 items-center justify-center rounded-md border bg-[#09090B] font-mono text-xs font-bold tabular-nums"
                  >
                    {entry.rank}
                  </span>
                  <span className="font-medium text-zinc-200">{def.title}</span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    {def.multiplier.toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 tabular-nums">
                  <span>
                    <strong className="font-semibold text-zinc-200">
                      {entry.completedMissions}
                    </strong>{' '}
                    {entry.completedMissions === 1 ? 'missão' : 'missões'}
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span>
                    <strong className="font-semibold text-zinc-200">
                      {entry.completedSessions}
                    </strong>{' '}
                    {entry.completedSessions === 1 ? 'ciclo' : 'ciclos'}
                  </span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-red-400">
                    {formatDurationHuman(entry.totalMinutes)}
                  </span>
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full border border-zinc-800/80 bg-[#09090B]">
                <motion.div
                  initial={prefersReducedMotion ? { scaleX: ratio } : { scaleX: 0 }}
                  animate={{ scaleX: ratio }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          duration: 0.65,
                          delay: idx * 0.06,
                          ease: [0.16, 1, 0.3, 1],
                        }
                  }
                  style={{
                    transformOrigin: 'left',
                    backgroundColor: def.borderColor,
                    boxShadow:
                      ratio > 0 ? `0 0 12px ${def.glowColor}` : undefined,
                    ...WILL_CHANGE_TRANSFORM,
                  }}
                  className="h-full w-full rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
