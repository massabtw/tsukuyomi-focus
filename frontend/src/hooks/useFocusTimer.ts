'use client';

import { useEffect } from 'react';
import { formatTimerClock } from '@/lib/date';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';

const BASE_DOCUMENT_TITLE = 'Tsukuyomi Focus';

/**
 * Anti-throttling timer loop driven by targetEndTime + visibilitychange/focus listeners,
 * keeping document.title synchronized in real time.
 */
export function useFocusTimer(): void {
  const status = useTsukuyomiStore((state) => state.timer.status);
  const mode = useTsukuyomiStore((state) => state.timer.mode);
  const remainingSeconds = useTsukuyomiStore(
    (state) => state.timer.remainingSeconds,
  );
  const activeMissionId = useTsukuyomiStore(
    (state) => state.timer.activeMissionId,
  );
  const activeMissionLabel = useTsukuyomiStore((state) => {
    if (!state.timer.activeMissionId) return null;
    const mission = state.missions.find(
      (m) => m.id === state.timer.activeMissionId,
    );
    return mission ? `Missão Rank ${mission.rank}` : null;
  });
  const syncTimerTick = useTsukuyomiStore((state) => state.syncTimerTick);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }

    const handleSync = () => {
      syncTimerTick(Date.now());
    };

    handleSync();
    const intervalId = window.setInterval(handleSync, 250);

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
      const targetSuffix = activeMissionLabel ?? 'Treino Livre';
      document.title = `(${formattedTime}) Tsukuyomi Ativo — ${targetSuffix}`;
    } else {
      document.title = `(${formattedTime}) Repouso Ocular — ${BASE_DOCUMENT_TITLE}`;
    }
  }, [status, mode, remainingSeconds, activeMissionId, activeMissionLabel]);

  useEffect(() => {
    return () => {
      document.title = BASE_DOCUMENT_TITLE;
    };
  }, []);
}
