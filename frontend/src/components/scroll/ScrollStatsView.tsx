'use client';

import { useMemo, useRef } from 'react';
import Image from 'next/image';
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
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { computeScrollStats } from '@/lib/gamification';
import { useOcularProfile, useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import { RankDistributionChart } from '@/components/scroll/RankDistributionChart';
import { SessionLogList } from '@/components/scroll/SessionLogList';
import { UchihaHeatmap } from '@/components/scroll/UchihaHeatmap';

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;
const KPI_SPRING = {
  type: 'spring',
  stiffness: 330,
  damping: 24,
} as const;

const OBSIDIAN_CARD_CLASS =
  'bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] border border-white/[0.06] hover:border-red-500/30 transition-colors';

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

  const kpiHover = prefersReducedMotion ? undefined : { y: -3, scale: 1.01 };
  const kpiTap = prefersReducedMotion ? undefined : { scale: 0.98 };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8"
    >
      {/* Monumental Engraved Japanese Kanji Watermark: 記録 (Archive / Record) */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgParallaxY, ...WILL_CHANGE_TRANSFORM }}
        className="pointer-events-none select-none absolute inset-x-0 top-4 -z-10 flex justify-center overflow-hidden"
      >
        <span className="font-serif text-[12rem] font-black leading-none tracking-tight text-white opacity-[0.03] sm:text-[18rem] lg:text-[21rem]">
          記録
        </span>
      </motion.div>

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
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {/* 1. Total Focus Time (Xh Ym) */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className={cn(
            'will-change-transform rounded-2xl p-3.5 sm:p-5',
            OBSIDIAN_CARD_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400">
            <span className="truncate">Tempo Total no Tsukuyomi</span>
            <Clock className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {formatHoursAndMinutes(stats.totalFocusMinutes)}
          </p>
          <p className="mt-1.5 font-mono text-[11px] sm:text-xs text-zinc-500 tabular-nums">
            {stats.completedSessions} ciclos concluídos ·{' '}
            {stats.susanooCompletedCount} com Susano&apos;o
          </p>
        </motion.article>

        {/* 2. Total Chakra & Current Eye Stage */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className={cn(
            'will-change-transform rounded-2xl p-3.5 sm:p-5',
            OBSIDIAN_CARD_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400">
            <span className="truncate">Chakra Total &amp; Olho</span>
            <Sparkles className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-red-400 tabular-nums sm:text-3xl">
            {chakra.toLocaleString('pt-BR')}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-300">
            <Eye className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
            <span className="truncate">{currentEyeDef.name}</span>
          </p>
        </motion.article>

        {/* 3. Current / Longest Streak */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className={cn(
            'will-change-transform rounded-2xl p-3.5 sm:p-5',
            OBSIDIAN_CARD_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400">
            <span className="truncate">Ofensiva Diária</span>
            <Flame
              className={cn(
                'h-4 w-4 shrink-0',
                streak > 0 ? 'text-red-500' : 'text-zinc-600',
              )}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {streak} {streak === 1 ? 'dia' : 'dias'}
          </p>
          <p className="mt-1.5 font-mono text-[11px] sm:text-xs text-zinc-500 tabular-nums">
            Recorde: {longestStreak}{' '}
            {longestStreak === 1 ? 'dia' : 'dias'}
          </p>
        </motion.article>

        {/* 4. Uchiha Accuracy % */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className={cn(
            'will-change-transform rounded-2xl p-3.5 sm:p-5',
            OBSIDIAN_CARD_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400">
            <span className="truncate">Precisão Uchiha</span>
            <Crosshair className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {stats.accuracyPercent}%
          </p>
          <p className="mt-1.5 font-mono text-[11px] sm:text-xs text-zinc-500 tabular-nums">
            {stats.completedSessions} íntegros · {stats.abandonedSessions}{' '}
            abandonados
          </p>
        </motion.article>

        {/* 5. Izanagi Invocations */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className={cn(
            'will-change-transform rounded-2xl p-3.5 sm:p-5',
            OBSIDIAN_CARD_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-400">
            <span className="truncate">Invocações do Izanagi</span>
            <RefreshCw className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums sm:text-3xl">
            {izanagi.totalTimesUsed}
          </p>
          <p className="mt-1.5 font-mono text-[11px] sm:text-xs text-zinc-500 tabular-nums">
            {activeEyesCount}/2 olhos ativos
          </p>
        </motion.article>

        {/* 6. Amaterasu Completed (strict #000000 / #DC2626 palette + black flames VFX) */}
        <motion.article
          whileHover={kpiHover}
          whileTap={kpiTap}
          transition={KPI_SPRING}
          onMouseEnter={() => audioEngine.playHover()}
          className="amaterasu-frame will-change-transform relative overflow-hidden rounded-2xl border border-red-600/45 bg-gradient-to-b from-[#140709]/92 via-[#090406]/96 to-[#000000]/98 p-3.5 sm:p-5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] hover:border-red-500/60 transition-colors xl:col-span-5"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <Image
              src="/assets/vfx/amaterasu-black-flames.webp"
              alt=""
              fill
              unoptimized
              className="object-cover object-center opacity-35 mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-zinc-300">
              <span className="truncate">Missões Amaterasu</span>
              <Flame className="h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
            </div>
            <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-white tabular-nums sm:text-3xl">
              {stats.amaterasuCompletedCount}
            </p>
            <p className="mt-1.5 text-[11px] sm:text-xs text-red-400/90">
              Chamas negras seladas com bônus 2.0x
            </p>
          </div>
        </motion.article>
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
