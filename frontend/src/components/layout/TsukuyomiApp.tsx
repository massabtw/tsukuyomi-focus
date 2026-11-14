'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AwakeningModal } from '@/components/evolution/AwakeningModal';
import { NakaShrineView } from '@/components/evolution/NakaShrineView';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { GenjutsuBackdrop } from '@/components/layout/GenjutsuBackdrop';
import { NinjaHeader } from '@/components/layout/NinjaHeader';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { AmaterasuPenaltyBanner } from '@/components/modals/AmaterasuPenaltyBanner';
import { IzanagiModal } from '@/components/modals/IzanagiModal';
import { SusanooBreakModal } from '@/components/modals/SusanooBreakModal';
import { ScrollStatsView } from '@/components/scroll/ScrollStatsView';
import { TempleView } from '@/components/clock/TempleView';
import { useDailyChecks } from '@/hooks/useDailyChecks';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { cn } from '@/lib/cn';
import { getVisualBlurClass } from '@/lib/gamification';
import {
  useActiveTab,
  useHasHydrated,
  useIsTsukuyomiMode,
  useOcularProfile,
  useTimerCore,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { IzanagiTriggerContext, MangekyouVariant } from '@/types/tsukuyomi';

interface ChakraPalette {
  primary: string;
  glow: string;
  rgb: string;
}

type ChakraCssVars = CSSProperties &
  Record<
    '--chakra-primary' | '--chakra-color' | '--chakra-glow' | '--chakra-rgb',
    string
  >;

const UCHIHA_CHAKRA_PALETTES: Record<MangekyouVariant, ChakraPalette> = {
  itachi: {
    primary: '#DC2626',
    glow: 'rgba(220, 38, 38, 0.42)',
    rgb: '220, 38, 38',
  },
  sasuke: {
    primary: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.42)',
    rgb: '139, 92, 246',
  },
  shisui: {
    primary: '#10B981',
    glow: 'rgba(16, 185, 129, 0.42)',
    rgb: '16, 185, 129',
  },
  madara: {
    primary: '#2563EB',
    glow: 'rgba(37, 99, 235, 0.42)',
    rgb: '37, 99, 235',
  },
  obito: {
    primary: '#0EA5E9',
    glow: 'rgba(14, 165, 233, 0.42)',
    rgb: '14, 165, 233',
  },
};

const DOLLY_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const WILL_CHANGE_TAB = { willChange: 'transform, opacity, filter' } as const;

function HydrationSkeleton() {
  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#09090B] text-[#FAFAFA]"
      aria-busy="true"
      aria-label="Carregando Tsukuyomi Focus"
    >
      <div className="normal-vignette pointer-events-none fixed inset-0" />
      <header className="sticky top-0 z-30 border-b border-[#27272A] bg-[#09090B]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full border border-red-900/40 bg-[#121215]" />
            <div className="h-4 w-36 animate-pulse rounded bg-[#18181B]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-24 animate-pulse rounded-full bg-[#18181B]" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-[#18181B]" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-[#27272A] bg-[#121215]/70">
          <div className="h-24 w-24 animate-pulse rounded-full border border-red-700/40 bg-red-950/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]" />
        </div>
        <div className="mt-8 h-9 w-36 animate-pulse rounded-lg bg-[#18181B]" />
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[#A1A1AA]">
          Despertando Genjutsu...
        </p>
      </main>
    </div>
  );
}

export function TsukuyomiApp() {
  useFocusTimer();
  useDailyChecks();

  const prefersReducedMotion = useReducedMotion();
  const hasHydrated = useHasHydrated();
  const activeTab = useActiveTab();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const { mangekyouVariant } = useOcularProfile();
  const { susanooEnabled, mode: timerMode } = useTimerCore();
  const visualBlurLevel = useTsukuyomiStore((state) => state.visualBlurLevel);
  const pendingIzanagiRescue = useTsukuyomiStore(
    (state) => state.pendingIzanagiRescue,
  );
  const declineStreakRescue = useTsukuyomiStore(
    (state) => state.declineStreakRescue,
  );

  const chakraPalette =
    UCHIHA_CHAKRA_PALETTES[mangekyouVariant] ?? UCHIHA_CHAKRA_PALETTES.itachi;
  const isSusanooFocusActive = susanooEnabled && timerMode === 'focus';
  const activeChakraGlow = isSusanooFocusActive
    ? `rgba(${chakraPalette.rgb}, 0.58)`
    : chakraPalette.glow;

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--chakra-primary', chakraPalette.primary);
    rootStyle.setProperty('--chakra-color', chakraPalette.primary);
    rootStyle.setProperty('--chakra-glow', activeChakraGlow);
    rootStyle.setProperty('--chakra-rgb', chakraPalette.rgb);
  }, [chakraPalette.primary, chakraPalette.rgb, activeChakraGlow]);

  const [susanooModalOpen, setSusanooModalOpen] = useState(false);
  const [izanagiAbandonOpen, setIzanagiAbandonOpen] = useState(false);

  const handleOpenSusanooBreak = useCallback(() => {
    setSusanooModalOpen(true);
  }, []);

  const handleCloseSusanooBreak = useCallback(() => {
    setSusanooModalOpen(false);
  }, []);

  const handleOpenIzanagiAbandon = useCallback(() => {
    setSusanooModalOpen(false);
    setIzanagiAbandonOpen(true);
  }, []);

  const handleCloseIzanagi = useCallback(() => {
    if (izanagiAbandonOpen) {
      setIzanagiAbandonOpen(false);
      return;
    }
    if (useTsukuyomiStore.getState().pendingIzanagiRescue !== null) {
      declineStreakRescue();
    }
  }, [izanagiAbandonOpen, declineStreakRescue]);

  if (!hasHydrated) {
    return <HydrationSkeleton />;
  }

  const isIzanagiModalOpen =
    izanagiAbandonOpen || pendingIzanagiRescue !== null;
  const izanagiContext: IzanagiTriggerContext = izanagiAbandonOpen
    ? 'abandon_cycle'
    : 'streak_rescue';

  const tabMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.97, filter: 'blur(6px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
        transition: { duration: 0.45, ease: DOLLY_EASE },
      };

  const chakraStyle: ChakraCssVars = {
    '--chakra-primary': chakraPalette.primary,
    '--chakra-color': chakraPalette.primary,
    '--chakra-glow': activeChakraGlow,
    '--chakra-rgb': chakraPalette.rgb,
  };

  return (
    <div
      data-tsukuyomi={isTsukuyomiMode ? 'true' : 'false'}
      style={chakraStyle}
      className={cn(
        'relative flex min-h-screen flex-col transition-colors duration-700',
        isTsukuyomiMode
          ? 'tsukuyomi-mode bg-[#000000] text-white'
          : 'bg-[#09090B] text-[#FAFAFA]',
      )}
    >
      <GenjutsuBackdrop />

      {/* Reactive peripheral screen-edge chakra glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[4] transition-all duration-700"
        style={{
          opacity: isSusanooFocusActive ? 0.95 : isTsukuyomiMode ? 0.72 : 0.48,
          background: `radial-gradient(circle at 50% 48%, transparent 56%, rgba(${chakraPalette.rgb}, ${isSusanooFocusActive ? 0.18 : 0.1}) 88%, rgba(${chakraPalette.rgb}, ${isSusanooFocusActive ? 0.28 : 0.16}) 100%)`,
          boxShadow: `inset 0 0 ${isSusanooFocusActive ? '130px' : '90px'} var(--chakra-glow), inset 0 0 ${isSusanooFocusActive ? '44px' : '24px'} rgba(${chakraPalette.rgb}, ${isSusanooFocusActive ? 0.26 : 0.14})`,
        }}
      />

      {visualBlurLevel > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 ${40 + visualBlurLevel * 32}px rgba(127, 29, 29, ${0.14 * visualBlurLevel})`,
          }}
        />
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-col">
        <NinjaHeader />

        <div
          className={cn(
            'transition-[filter] duration-300 hover:blur-none focus-within:blur-none',
            visualBlurLevel > 0 ? getVisualBlurClass(visualBlurLevel) : null,
          )}
        >
          <TabNavigation />
        </div>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
          <AmaterasuPenaltyBanner />

          <AnimatePresence mode="wait">
            {activeTab === 'temple' ? (
              <motion.div
                key="tab-temple"
                style={WILL_CHANGE_TAB}
                {...tabMotionProps}
                className="flex-1"
              >
                <TempleView
                  onOpenSusanooBreak={handleOpenSusanooBreak}
                  onOpenIzanagiAbandon={handleOpenIzanagiAbandon}
                />
              </motion.div>
            ) : null}

            {activeTab === 'kanban' ? (
              <motion.div
                key="tab-kanban"
                style={WILL_CHANGE_TAB}
                {...tabMotionProps}
                className="flex-1"
              >
                <KanbanBoard />
              </motion.div>
            ) : null}

            {activeTab === 'shrine' ? (
              <motion.div
                key="tab-shrine"
                style={WILL_CHANGE_TAB}
                {...tabMotionProps}
                className="flex-1"
              >
                <NakaShrineView />
              </motion.div>
            ) : null}

            {activeTab === 'scroll' ? (
              <motion.div
                key="tab-scroll"
                style={WILL_CHANGE_TAB}
                {...tabMotionProps}
                className="flex-1"
              >
                <ScrollStatsView />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <AwakeningModal />

      <SusanooBreakModal
        isOpen={susanooModalOpen}
        onClose={handleCloseSusanooBreak}
        onOpenIzanagi={handleOpenIzanagiAbandon}
      />

      <IzanagiModal
        isOpen={isIzanagiModalOpen}
        context={izanagiContext}
        onClose={handleCloseIzanagi}
      />
    </div>
  );
}
