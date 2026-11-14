'use client';

import { useMemo, useRef } from 'react';
import {
  Clock,
  Crosshair,
  Eye,
  Flame,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { EYE_STAGE_MAP } from '@/constants/evolution';
import { cn } from '@/lib/cn';
import { computeScrollStats } from '@/lib/gamification';
import { useOcularProfile, useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import { RankDistributionChart } from '@/components/scroll/RankDistributionChart';
import { SessionLogList } from '@/components/scroll/SessionLogList';
import { UchihaHeatmap } from '@/components/scroll/UchihaHeatmap';

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;

function formatHoursAndMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}h ${minutes}m`;
}

export function ScrollStatsView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { chakra, currentEyeStage, streak, longestStreak, izanagi } =
    useOcularProfile();
  const missions = useTsukuyomiStore((s) => s.missions);
  const sessionLogs = useTsukuyomiStore((s) => s.sessionLogs);

  const stats = useMemo(
    () => computeScrollStats(missions, sessionLogs),
    [missions, sessionLogs],
  );

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const bgParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '18%'],
  );
  const fgParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ['0%', '0%'] : ['0%', '-6%'],
  );

  const currentEyeDef = EYE_STAGE_MAP[currentEyeStage];
  const activeEyesCount =
    (izanagi.leftEyeBlind ? 0 : 1) + (izanagi.rightEyeBlind ? 0 : 1);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* Camera-descent background archive geometry */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgParallaxY, ...WILL_CHANGE_TRANSFORM }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden opacity-25"
      >
        <div className="h-[420px] w-[420px] rounded-full border border-red-900/30 bg-[radial-gradient(circle,rgba(127,29,29,0.12)_0%,transparent_70%)]" />
      </motion.div>

      {/* Scroll Header with gentle foreground parallax */}
      <motion.header
        style={{ y: fgParallaxY, ...WILL_CHANGE_TRANSFORM }}
        className="space-y-1.5"
      >
        <p className="font-mono text-[11px] tracking-[0.26em] text-red-500 uppercase">
          Arquivo do Clã Uchiha
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100 sm:text-3xl">
          Pergaminho de Estatísticas
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Registro de imersão no Tsukuyomi, densidade de foco nos últimos 365
          dias, domínio por Rank e histórico de invocações.
        </p>
      </motion.header>

      {/* Top KPI Grid */}
      <section
        aria-label="Indicadores principais de desempenho"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {/* 1. Total Focus Time (Xh Ym) */}
        <article className="obsidian-surface rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tempo Total no Tsukuyomi</span>
            <Clock className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {formatHoursAndMinutes(stats.totalFocusMinutes)}
          </p>
          <p className="mt-1.5 font-mono text-xs text-zinc-500 tabular-nums">
            {stats.completedSessions} ciclos concluídos ·{' '}
            {stats.susanooCompletedCount} com Susano&apos;o
          </p>
        </article>

        {/* 2. Total Chakra & Current Eye Stage */}
        <article className="obsidian-surface rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Chakra Total &amp; Estágio Ocular</span>
            <Sparkles className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-red-400 tabular-nums sm:text-3xl">
            {chakra.toLocaleString('pt-BR')}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-300">
            <Eye className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
            <span>{currentEyeDef.name}</span>
          </p>
        </article>

        {/* 3. Current / Longest Streak */}
        <article className="obsidian-surface rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Ofensiva Diária (Streak)</span>
            <Flame
              className={cn(
                'h-4 w-4',
                streak > 0 ? 'text-red-500' : 'text-zinc-600',
              )}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {streak} {streak === 1 ? 'dia' : 'dias'}
          </p>
          <p className="mt-1.5 font-mono text-xs text-zinc-500 tabular-nums">
            Recorde histórico: {longestStreak}{' '}
            {longestStreak === 1 ? 'dia' : 'dias'}
          </p>
        </article>

        {/* 4. Uchiha Accuracy % */}
        <article className="obsidian-surface rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Precisão Uchiha</span>
            <Crosshair className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {stats.accuracyPercent}%
          </p>
          <p className="mt-1.5 font-mono text-xs text-zinc-500 tabular-nums">
            {stats.completedSessions} íntegros · {stats.abandonedSessions}{' '}
            abandonados
          </p>
        </article>

        {/* 5. Izanagi Invocations */}
        <article className="obsidian-surface rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Invocações do Izanagi</span>
            <RefreshCw className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {izanagi.totalTimesUsed}
          </p>
          <p className="mt-1.5 font-mono text-xs text-zinc-500 tabular-nums">
            {activeEyesCount}/2 olhos ativos para reescrever a realidade
          </p>
        </article>

        {/* 6. Amaterasu Completed (strict #000000 / #DC2626 palette) */}
        <article className="amaterasu-frame rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Missões Amaterasu Concluídas</span>
            <Flame className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">
            {stats.amaterasuCompletedCount}
          </p>
          <p className="mt-1.5 text-xs text-red-400/90">
            Chamas negras seladas com bônus 2.0x
          </p>
        </article>
      </section>

      {/* 365-Day Crimson Heatmap */}
      <UchihaHeatmap />

      {/* Rank Distribution */}
      <RankDistributionChart />

      {/* Chronological Filterable Session Log */}
      <SessionLogList />
    </div>
  );
}
