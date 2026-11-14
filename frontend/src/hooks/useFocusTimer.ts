'use client';

import { useEffect } from 'react';
import { formatTimerClock } from '@/lib/date';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { TsukuyomiStore } from '@/types/tsukuyomi';

const BASE_DOCUMENT_TITLE = 'Tsukuyomi Focus';

function syncDocumentTitle(state: TsukuyomiStore): void {
  const { status, mode, remainingSeconds, activeMissionId } = state.timer;

  if (status === 'idle') {
    document.title = BASE_DOCUMENT_TITLE;
    return;
  }

  const formattedTime = formatTimerClock(remainingSeconds);

  if (status === 'paused') {
    document.title = `(${formattedTime}) Pausado — ${BASE_DOCUMENT_TITLE}`;
    return;
  }

  if (mode === 'focus') {
    const activeMission = activeMissionId
      ? state.missions.find((mission) => mission.id === activeMissionId)
      : undefined;
    const targetSuffix = activeMission
      ? `Missão Rank ${activeMission.rank}`
      : 'Treino Livre';
    document.title = `(${formattedTime}) Tsukuyomi Ativo — ${targetSuffix}`;
  } else {
    document.title = `(${formattedTime}) Repouso Ocular — ${BASE_DOCUMENT_TITLE}`;
  }
}

/**
 * Anti-throttling timer loop driven by targetEndTime + visibilitychange/focus listeners,
 * updating document.title imperatively via store subscription to avoid root re-renders.
 */
export function useFocusTimer(): void {
  const status = useTsukuyomiStore((state) => state.timer.status);
  const syncTimerTick = useTsukuyomiStore((state) => state.syncTimerTick);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }

    const handleSync = () => {
      syncTimerTick(Date.now());
    };

    handleSync();
    const intervalId = window.setInterval(() => {
      syncTimerTick(Date.now());
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleSync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleSync);
    };
  }, [status, syncTimerTick]);

  useEffect(() => {
    syncDocumentTitle(useTsukuyomiStore.getState());

    const unsubscribe = useTsukuyomiStore.subscribe((state, prevState) => {
      if (
        state.timer.remainingSeconds !== prevState.timer.remainingSeconds ||
        state.timer.status !== prevState.timer.status ||
        state.timer.mode !== prevState.timer.mode ||
        state.timer.activeMissionId !== prevState.timer.activeMissionId ||
        state.missions !== prevState.missions
      ) {
        syncDocumentTitle(state);
      }
    });

    return () => {
      unsubscribe();
      document.title = BASE_DOCUMENT_TITLE;
    };
  }, []);
}
