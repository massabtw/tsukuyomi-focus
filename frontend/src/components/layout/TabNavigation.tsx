'use client';

import { useId, type KeyboardEvent } from 'react';
import { Columns3, Disc, Eye, ScrollText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import {
  useActiveTab,
  useIsTsukuyomiMode,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { ActiveTab } from '@/types/tsukuyomi';

interface TabItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: typeof Disc;
}

const TABS: readonly TabItem[] = [
  { id: 'temple', label: 'Templo', shortLabel: 'Templo', icon: Disc },
  {
    id: 'kanban',
    label: 'Quadro de Missões',
    shortLabel: 'Missões',
    icon: Columns3,
  },
  {
    id: 'shrine',
    label: 'Santuário Naka',
    shortLabel: 'Santuário',
    icon: Eye,
  },
  {
    id: 'scroll',
    label: 'Pergaminho',
    shortLabel: 'Pergaminho',
    icon: ScrollText,
  },
];

export function TabNavigation() {
  const activeTab = useActiveTab();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const setActiveTab = useTsukuyomiStore((s) => s.setActiveTab);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const brushGradId = useId();

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = TABS[nextIndex];
      setActiveTab(nextTab.id);
      const button = document.getElementById(`tsukuyomi-tab-${nextTab.id}`);
      button?.focus();
    }
  }

  return (
    <nav
      aria-label="Navegação principal do Tsukuyomi Focus"
      className={cn(
        'relative z-30 mx-auto w-full max-w-4xl px-4 pt-4 transition-all duration-500 sm:px-6',
        isTsukuyomiMode
          ? 'scale-[0.96] opacity-40 hover:opacity-95 focus-within:opacity-95'
          : 'scale-100 opacity-100',
      )}
    >
      <div
        role="tablist"
        aria-label="Seções do Santuário"
        onKeyDown={handleKeyDown}
        className={cn(
          'grid grid-cols-4 gap-1 rounded-2xl p-1.5 backdrop-blur-xl transition-colors duration-500',
          isTsukuyomiMode
            ? 'border border-red-950/75 border-t-red-500/20 bg-gradient-to-b from-[#120709]/92 via-[#080304]/96 to-[#030102]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] hover:border-red-500/35'
            : 'border border-white/[0.06] bg-gradient-to-b from-[#141418]/90 via-[#0C0C0F]/95 to-[#070709]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_25px_50px_-12px_rgba(0,0,0,0.95)] hover:border-red-500/30',
        )}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tsukuyomi-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tsukuyomi-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onMouseEnter={() => audioEngine.playHover()}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:px-4 sm:py-2.5 sm:text-sm',
                isActive
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="tsukuyomi-active-tab-indicator"
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 380, damping: 32 }
                  }
                  style={{ willChange: 'transform' }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-visible rounded-xl"
                >
                  <motion.span
                    key={activeTab}
                    initial={{ scaleX: 1 }}
                    animate={
                      prefersReducedMotion
                        ? { scaleX: 1 }
                        : { scaleX: [1, 1.25, 1] }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.32,
                            times: [0, 0.45, 1],
                            ease: [0.16, 1, 0.3, 1],
                            type: 'tween',
                          }
                    }
                    style={{
                      transformOrigin: 'center',
                      willChange: 'transform',
                    }}
                    className={cn(
                      'relative block h-full w-full rounded-xl border',
                      isTsukuyomiMode
                        ? 'border-red-500/65 bg-gradient-to-b from-red-950/75 via-[#190507]/95 to-black shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_0_24px_rgba(239,68,68,0.32)]'
                        : 'border-red-500/45 bg-gradient-to-b from-[#450A0A]/85 via-[#1C0709]/95 to-[#0C0506]/98 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_20px_rgba(220,38,38,0.24)]',
                    )}
                  >
                    {/* Sumi-e Crimson-Blood Ink Brush Stroke with Tapered Edges */}
                    <svg
                      viewBox="0 0 200 44"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
                    >
                      <defs>
                        <linearGradient
                          id={brushGradId}
                          x1="0%"
                          y1="50%"
                          x2="100%"
                          y2="50%"
                        >
                          <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0" />
                          <stop offset="10%" stopColor="#991B1B" stopOpacity="0.65" />
                          <stop offset="32%" stopColor="#DC2626" stopOpacity="0.95" />
                          <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                          <stop offset="72%" stopColor="#DC2626" stopOpacity="0.95" />
                          <stop offset="91%" stopColor="#991B1B" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Main calligraphic ink slash silhouette */}
                      <path
                        d="M 4 23 C 28 15, 76 13, 134 15 C 166 16, 186 19, 197 22 C 178 27, 148 29, 92 29 C 50 29, 18 27, 4 23 Z"
                        fill={`url(#${brushGradId})`}
                        opacity="0.34"
                      />
                      {/* Tapered crimson-blood bottom brush edge */}
                      <path
                        d="M 6 39 C 42 36.2, 108 35.8, 168 37.2 C 182 37.6, 191 38.4, 196 39.2 C 180 40.8, 134 41.4, 72 41 C 36 40.8, 16 40.1, 6 39 Z"
                        fill={`url(#${brushGradId})`}
                      />
                      {/* Fine dry-brush bristle streak */}
                      <path
                        d="M 16 40.6 Q 100 38.5 184 40.4"
                        stroke="#FCA5A5"
                        strokeOpacity="0.45"
                        strokeWidth="0.9"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </motion.span>
                </motion.span>
              ) : null}

              <Icon
                className={cn(
                  'relative z-10 h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-red-400' : 'text-zinc-500',
                )}
                aria-hidden="true"
              />
              <span className="relative z-10 hidden truncate sm:inline">
                {tab.label}
              </span>
              <span className="relative z-10 truncate sm:hidden">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
