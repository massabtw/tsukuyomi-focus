'use client';

import { useEffect } from 'react';
import { useHasHydrated, useTsukuyomiStore } from '@/store/useTsukuyomiStore';

const DAILY_CHECK_INTERVAL_MS = 60_000;

/**
 * Runs day-turn Amaterasu penalty (-300 Chakra) and streak-break detection
 * strictly after Zustand persist hydration completes.
 */
export function useDailyChecks(): void {
  const hasHydrated = useHasHydrated();
  const runDailyChecks = useTsukuyomiStore((state) => state.runDailyChecks);
  const syncFromBackend = useTsukuyomiStore((state) => state.syncFromBackend);

  useEffect(() => {
    if (!hasHydrated) return;

    void syncFromBackend();

    const executeCheck = () => {
      runDailyChecks();
    };

    executeCheck();

    const intervalId = window.setInterval(
      executeCheck,
      DAILY_CHECK_INTERVAL_MS,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', executeCheck);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', executeCheck);
    };
  }, [hasHydrated, runDailyChecks, syncFromBackend]);
}
