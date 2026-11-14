'use client';

import type { KeyboardEvent } from 'react';
import { Columns3, Disc, Eye, ScrollText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const prefersReducedMotion = useReducedMotion();

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
          'grid grid-cols-4 gap-1 rounded-2xl p-1.5 backdrop-blur-md transition-colors duration-500',
          isTsukuyomiMode
            ? 'border border-red-950/70 border-t-red-500/20 bg-black/80 shadow-[0_14px_36px_rgba(0,0,0,0.95)]'
            : 'border border-zinc-800 border-t-white/[0.07] bg-[#121215]/88 shadow-[0_16px_40px_rgba(0,0,0,0.85)]',
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
                  className={cn(
                    'absolute inset-0 rounded-xl border',
                    isTsukuyomiMode
                      ? 'border-red-500/60 bg-gradient-to-b from-red-950/70 to-black shadow-[0_0_20px_rgba(239,68,68,0.28)]'
                      : 'border-red-600/50 bg-gradient-to-b from-[#450A0A]/80 to-[#18181B]/95 shadow-[0_0_16px_rgba(220,38,38,0.22)]',
                  )}
                />
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
