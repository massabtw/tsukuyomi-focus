'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { EYE_STAGE_MAP } from '@/constants/evolution';
import {
  AMATERASU_PENALTY_CHAKRA,
  RANK_DEFINITIONS,
} from '@/constants/ranks';
import { createInitialSeedState } from '@/constants/seed';
import { audioEngine } from '@/lib/audioEngine';
import {
  addDays,
  diffDaysLocal,
  formatLocalDate,
  getYesterdayLocalDate,
} from '@/lib/date';
import {
  applyIzanagiRestoration,
  blindNextHealthyEye,
  calculateSessionChakra,
  canInvokeIzanagi,
  computeStreakOnCompletion,
  getHighestUnlockedEyeStage,
  isEyeStageUnlocked,
} from '@/lib/gamification';
import type {
  ActiveTab,
  AudioSettings,
  CreateMissionInput,
  CustomEyeConfig,
  EyeStage,
  FocusSessionLog,
  IzanagiTriggerContext,
  MangekyouVariant,
  Mission,
  MissionStatus,
  TimerMode,
  TsukuyomiState,
  TsukuyomiStore,
  VisualBlurLevel,
} from '@/types/tsukuyomi';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultDurationSecondsForMode(
  mode: TimerMode,
  activeMission: Mission | undefined,
): number {
  if (mode === 'short_break') return 5 * 60;
  if (mode === 'long_break') return 15 * 60;
  if (activeMission) {
    return Math.max(1, activeMission.estimatedMinutes) * 60;
  }
  return 25 * 60;
}

const PERSIST_STORAGE_KEY = 'tsukuyomi-focus-storage';
const PERSIST_VERSION = 1;

export const useTsukuyomiStore = create<TsukuyomiStore>()(
  persist(
    (set, get) => ({
      ...createInitialSeedState(),

      setHasHydrated: (hydrated: boolean) => {
        set({ hasHydrated: hydrated });
      },

      setActiveTab: (tab: ActiveTab) => {
        set({ activeTab: tab });
      },

      toggleTsukuyomiMode: (force?: boolean) => {
        set((state) => ({
          isTsukuyomiMode:
            typeof force === 'boolean' ? force : !state.isTsukuyomiMode,
        }));
      },

      setTimerMode: (mode: TimerMode, customDurationSeconds?: number) => {
        set((state) => {
          if (state.timer.status !== 'idle') {
            return state;
          }
          const activeMission = state.missions.find(
            (m) => m.id === state.timer.activeMissionId,
          );
          const durationSeconds =
            customDurationSeconds ??
            getDefaultDurationSecondsForMode(mode, activeMission);
          return {
            timer: {
              ...state.timer,
              mode,
              durationSeconds,
              remainingSeconds: durationSeconds,
              targetEndTime: null,
              susanooEnabled: mode === 'focus' ? state.timer.susanooEnabled : false,
            },
          };
        });
      },

      setTimerDuration: (minutes: number) => {
        const safeSeconds = Math.max(60, Math.round(minutes * 60));
        set((state) => {
          if (state.timer.status !== 'idle') {
            return state;
          }
          return {
            timer: {
              ...state.timer,
              durationSeconds: safeSeconds,
              remainingSeconds: safeSeconds,
              targetEndTime: null,
            },
          };
        });
      },

      setSusanooEnabled: (enabled: boolean) => {
        set((state) => {
          if (state.timer.status !== 'idle' || state.timer.mode !== 'focus') {
            return state;
          }
          return {
            timer: {
              ...state.timer,
              susanooEnabled: enabled,
            },
          };
        });
      },

      startTimer: () => {
        const state = get();
        if (state.timer.status === 'running') return;

        const remaining =
          state.timer.remainingSeconds > 0
            ? state.timer.remainingSeconds
            : state.timer.durationSeconds;
        const targetEndTime = Date.now() + remaining * 1000;

        void audioEngine.unlock();
        if (state.timer.status === 'idle' && state.timer.mode === 'focus') {
          void audioEngine.playSharinganActivate();
        }

        set({
          timer: {
            ...state.timer,
            status: 'running',
            remainingSeconds: remaining,
            targetEndTime,
          },
        });
      },

      pauseTimer: () => {
        const state = get();
        if (state.timer.status !== 'running') return;
        if (state.timer.susanooEnabled && state.timer.mode === 'focus') {
          return;
        }

        const now = Date.now();
        const remainingSeconds = state.timer.targetEndTime
          ? Math.max(1, Math.ceil((state.timer.targetEndTime - now) / 1000))
          : state.timer.remainingSeconds;

        set({
          timer: {
            ...state.timer,
            status: 'paused',
            remainingSeconds,
            targetEndTime: null,
          },
        });
      },

      resetTimer: () => {
        set((state) => ({
          timer: {
            ...state.timer,
            status: 'idle',
            remainingSeconds: state.timer.durationSeconds,
            targetEndTime: null,
            susanooEnabled: false,
          },
        }));
      },

      syncTimerTick: (nowMs: number = Date.now()) => {
        const state = get();
        if (
          state.timer.status !== 'running' ||
          state.timer.targetEndTime === null
        ) {
          return;
        }

        const remaining = Math.max(
          0,
          Math.ceil((state.timer.targetEndTime - nowMs) / 1000),
        );

        if (remaining <= 0) {
          get().completeActiveCycle();
          return;
        }

        if (remaining !== state.timer.remainingSeconds) {
          set({
            timer: {
              ...state.timer,
              remainingSeconds: remaining,
            },
          });
        }
      },

      completeActiveCycle: () => {
        const state = get();
        void audioEngine.playTsukuyomiComplete();

        if (state.timer.mode !== 'focus') {
          const activeMission = state.missions.find(
            (m) => m.id === state.timer.activeMissionId,
          );
          const nextFocusSeconds = getDefaultDurationSecondsForMode(
            'focus',
            activeMission,
          );
          set({
            timer: {
              ...state.timer,
              status: 'idle',
              mode: 'focus',
              durationSeconds: nextFocusSeconds,
              remainingSeconds: nextFocusSeconds,
              targetEndTime: null,
              susanooEnabled: false,
            },
          });
          return;
        }

        const today = formatLocalDate();
        const durationMinutes = Math.max(
          1,
          Math.round(state.timer.durationSeconds / 60),
        );
        const activeMission = state.missions.find(
          (m) => m.id === state.timer.activeMissionId,
        );
        const rank = activeMission?.rank ?? 'D';
        const isAmaterasu = activeMission?.isAmaterasu ?? false;
        const usedSusanoo = state.timer.susanooEnabled;

        const chakraEarned = calculateSessionChakra({
          durationMinutes,
          rank,
          isAmaterasu,
          usedSusanoo,
        });

        const nextChakra = state.chakra + chakraEarned;
        const streakUpdate = computeStreakOnCompletion({
          streak: state.streak,
          longestStreak: state.longestStreak,
          lastFocusDate: state.lastFocusDate,
          today,
        });

        const nextVisualBlurLevel = Math.max(
          0,
          state.visualBlurLevel - 1,
        ) as VisualBlurLevel;

        const nextIzanagi = applyIzanagiRestoration(
          state.izanagi,
          durationMinutes,
        );

        const newLog: FocusSessionLog = {
          id: generateId('log'),
          missionId: activeMission?.id ?? null,
          missionTitle: activeMission?.title ?? 'Treino Livre no Tsukuyomi',
          rank,
          durationMinutes,
          chakraEarned,
          wasCompleted: true,
          usedSusanoo,
          isAmaterasu,
          timestamp: new Date().toISOString(),
          date: today,
        };

        const nextMissions = activeMission
          ? state.missions.map((m) =>
              m.id === activeMission.id
                ? { ...m, completedMinutes: m.completedMinutes + durationMinutes }
                : m,
            )
          : state.missions;

        const highestUnlocked = getHighestUnlockedEyeStage(
          nextChakra,
          streakUpdate.longestStreak,
        );
        const didUnlockNewEye =
          EYE_STAGE_MAP[highestUnlocked].order >
          EYE_STAGE_MAP[state.currentEyeStage].order;

        set({
          chakra: nextChakra,
          streak: streakUpdate.streak,
          longestStreak: streakUpdate.longestStreak,
          lastFocusDate: streakUpdate.lastFocusDate,
          visualBlurLevel: nextVisualBlurLevel,
          izanagi: nextIzanagi,
          missions: nextMissions,
          sessionLogs: [newLog, ...state.sessionLogs],
          currentEyeStage: didUnlockNewEye
            ? highestUnlocked
            : state.currentEyeStage,
          equippedEyeStage: didUnlockNewEye
            ? highestUnlocked
            : state.equippedEyeStage,
          pendingAwakening: didUnlockNewEye
            ? highestUnlocked
            : state.pendingAwakening,
          timer: {
            ...state.timer,
            status: 'idle',
            durationSeconds: state.timer.durationSeconds,
            remainingSeconds: state.timer.durationSeconds,
            targetEndTime: null,
            susanooEnabled: false,
          },
        });
      },

      abandonActiveCycle: (options?: { useIzanagi?: boolean }) => {
        const state = get();
        if (state.timer.status === 'idle') return;

        if (state.timer.mode !== 'focus') {
          set({
            timer: {
              ...state.timer,
              status: 'idle',
              remainingSeconds: state.timer.durationSeconds,
              targetEndTime: null,
              susanooEnabled: false,
            },
          });
          return;
        }

        if (options?.useIzanagi && canInvokeIzanagi(state.izanagi)) {
          const nextIzanagi = blindNextHealthyEye(state.izanagi);
          if (nextIzanagi) {
            set({
              izanagi: nextIzanagi,
              izanagiFlashNonce: state.izanagiFlashNonce + 1,
              timer: {
                ...state.timer,
                status: 'idle',
                remainingSeconds: state.timer.durationSeconds,
                targetEndTime: null,
                susanooEnabled: false,
              },
            });
            return;
          }
        }

        const today = formatLocalDate();
        const elapsedMinutes = Math.max(
          1,
          Math.floor(
            (state.timer.durationSeconds - state.timer.remainingSeconds) / 60,
          ),
        );
        const activeMission = state.missions.find(
          (m) => m.id === state.timer.activeMissionId,
        );

        const abandonedLog: FocusSessionLog = {
          id: generateId('log'),
          missionId: activeMission?.id ?? null,
          missionTitle: activeMission?.title ?? 'Treino Livre no Tsukuyomi',
          rank: activeMission?.rank ?? 'D',
          durationMinutes: elapsedMinutes,
          chakraEarned: 0,
          wasCompleted: false,
          usedSusanoo: state.timer.susanooEnabled,
          isAmaterasu: activeMission?.isAmaterasu ?? false,
          timestamp: new Date().toISOString(),
          date: today,
        };

        const nextBlur = Math.min(3, state.visualBlurLevel + 1) as VisualBlurLevel;

        set({
          visualBlurLevel: nextBlur,
          sessionLogs: [abandonedLog, ...state.sessionLogs],
          timer: {
            ...state.timer,
            status: 'idle',
            remainingSeconds: state.timer.durationSeconds,
            targetEndTime: null,
            susanooEnabled: false,
          },
        });
      },

      addMission: (input: CreateMissionInput): Mission => {
        const today = formatLocalDate();
        const state = get();
        const hasActiveAmaterasuToday = state.missions.some(
          (m) =>
            m.status !== 'completed' &&
            m.isAmaterasu &&
            m.amaterasuDate === today,
        );
        const allowAmaterasu = Boolean(input.isAmaterasu) && !hasActiveAmaterasuToday;

        const mission: Mission = {
          id: generateId('mission'),
          title: input.title.trim(),
          description: (input.description ?? '').trim(),
          rank: input.rank,
          status: input.status ?? 'todo',
          estimatedMinutes:
            input.estimatedMinutes ??
            RANK_DEFINITIONS[input.rank].suggestedMinutes,
          completedMinutes: 0,
          isAmaterasu: allowAmaterasu,
          amaterasuDate: allowAmaterasu ? today : null,
          createdAt: new Date().toISOString(),
          completedAt: input.status === 'completed' ? new Date().toISOString() : null,
        };

        set((curr) => ({
          missions: [mission, ...curr.missions],
        }));

        return mission;
      },

      updateMission: (
        id: string,
        patch: Partial<Omit<Mission, 'id' | 'createdAt'>>,
      ) => {
        set((state) => ({
          missions: state.missions.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        }));
      },

      deleteMission: (id: string) => {
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== id),
          timer:
            state.timer.activeMissionId === id
              ? { ...state.timer, activeMissionId: null }
              : state.timer,
        }));
      },

      moveMission: (
        id: string,
        targetStatus: MissionStatus,
        targetIndex?: number,
      ) => {
        set((state) => {
          const moving = state.missions.find((m) => m.id === id);
          if (!moving) return state;

          const updatedMission: Mission = {
            ...moving,
            status: targetStatus,
            completedAt:
              targetStatus === 'completed'
                ? moving.completedAt ?? new Date().toISOString()
                : null,
          };

          const remaining = state.missions.filter((m) => m.id !== id);
          if (typeof targetIndex === 'number' && targetIndex >= 0) {
            const targetBucket = remaining.filter(
              (m) => m.status === targetStatus,
            );
            const otherBuckets = remaining.filter(
              (m) => m.status !== targetStatus,
            );
            const clampedIdx = Math.min(targetIndex, targetBucket.length);
            targetBucket.splice(clampedIdx, 0, updatedMission);
            return { missions: [...targetBucket, ...otherBuckets] };
          }

          return { missions: [updatedMission, ...remaining] };
        });
      },

      reorderMissionsInColumn: (
        status: MissionStatus,
        activeId: string,
        overId: string,
      ) => {
        if (activeId === overId) return;
        set((state) => {
          const columnItems = state.missions.filter((m) => m.status === status);
          const otherItems = state.missions.filter((m) => m.status !== status);
          const oldIndex = columnItems.findIndex((m) => m.id === activeId);
          const newIndex = columnItems.findIndex((m) => m.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const reordered = [...columnItems];
          const [moved] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, moved);

          return { missions: [...reordered, ...otherItems] };
        });
      },

      toggleMissionAmaterasu: (id: string) => {
        const state = get();
        const target = state.missions.find((m) => m.id === id);
        if (!target) {
          return { ok: false, reason: 'Missão não encontrada.' };
        }
        if (target.status === 'completed') {
          return {
            ok: false,
            reason: 'Missões já cumpridas não podem receber o Amaterasu.',
          };
        }

        if (target.isAmaterasu) {
          set({
            missions: state.missions.map((m) =>
              m.id === id ? { ...m, isAmaterasu: false, amaterasuDate: null } : m,
            ),
          });
          return { ok: true };
        }

        const today = formatLocalDate();
        const existingToday = state.missions.find(
          (m) =>
            m.id !== id &&
            m.status !== 'completed' &&
            m.isAmaterasu &&
            m.amaterasuDate === today,
        );

        if (existingToday) {
          return {
            ok: false,
            reason:
              'Já existe uma missão marcada com o Amaterasu hoje. Conclua-a ou apague suas chamas primeiro.',
          };
        }

        set({
          missions: state.missions.map((m) =>
            m.id === id ? { ...m, isAmaterasu: true, amaterasuDate: today } : m,
          ),
        });
        return { ok: true };
      },

      dragMissionToTsukuyomi: (id: string) => {
        set((state) => {
          const mission = state.missions.find((m) => m.id === id);
          if (!mission) return state;

          const nextMissions = state.missions.map((m) =>
            m.id === id
              ? { ...m, status: 'in_tsukuyomi' as const, completedAt: null }
              : m,
          );

          const isIdle = state.timer.status === 'idle';
          const nextDurationSeconds =
            Math.max(1, mission.estimatedMinutes) * 60;

          return {
            activeTab: 'temple',
            missions: nextMissions,
            timer: isIdle
              ? {
                  ...state.timer,
                  mode: 'focus',
                  activeMissionId: id,
                  durationSeconds: nextDurationSeconds,
                  remainingSeconds: nextDurationSeconds,
                  targetEndTime: null,
                }
              : {
                  ...state.timer,
                  activeMissionId: id,
                },
          };
        });
      },

      setActiveMission: (id: string | null) => {
        set((state) => {
          const mission = id
            ? state.missions.find((m) => m.id === id)
            : undefined;
          const isIdleFocus =
            state.timer.status === 'idle' && state.timer.mode === 'focus';
          const nextDuration = mission
            ? Math.max(1, mission.estimatedMinutes) * 60
            : state.timer.durationSeconds;

          return {
            timer: {
              ...state.timer,
              activeMissionId: id,
              durationSeconds: isIdleFocus
                ? nextDuration
                : state.timer.durationSeconds,
              remainingSeconds: isIdleFocus
                ? nextDuration
                : state.timer.remainingSeconds,
            },
          };
        });
      },

      runDailyChecks: (today: string = formatLocalDate()) => {
        const state = get();
        if (!state.hasHydrated) return;
        if (state.lastDailyCheckDate === today) return;

        let nextChakra = state.chakra;
        let nextPenalty = state.pendingAmaterasuPenalty;
        let missionsChanged = false;

        const nextMissions = state.missions.map((mission) => {
          if (
            mission.isAmaterasu &&
            mission.status !== 'completed' &&
            mission.amaterasuDate !== null &&
            mission.amaterasuDate < today
          ) {
            missionsChanged = true;
            const chakraLost = Math.min(nextChakra, AMATERASU_PENALTY_CHAKRA);
            nextChakra = Math.max(0, nextChakra - AMATERASU_PENALTY_CHAKRA);
            nextPenalty = {
              missionId: mission.id,
              missionTitle: mission.title,
              chakraLost,
              failedDate: mission.amaterasuDate,
            };
            return {
              ...mission,
              isAmaterasu: false,
              amaterasuDate: null,
            };
          }
          return mission;
        });

        let nextStreak = state.streak;
        let nextPendingIzanagiRescue = state.pendingIzanagiRescue;

        if (state.lastFocusDate !== null && state.streak > 0) {
          const daysElapsed = diffDaysLocal(state.lastFocusDate, today);
          if (daysElapsed > 1) {
            if (canInvokeIzanagi(state.izanagi)) {
              nextPendingIzanagiRescue = {
                previousStreak: state.streak,
                missedDate: addDays(today, -1),
              };
            } else {
              nextStreak = 0;
            }
          }
        }

        set({
          chakra: nextChakra,
          missions: missionsChanged ? nextMissions : state.missions,
          pendingAmaterasuPenalty: nextPenalty,
          streak: nextStreak,
          pendingIzanagiRescue: nextPendingIzanagiRescue,
          lastDailyCheckDate: today,
        });
      },

      dismissAmaterasuPenalty: () => {
        set({ pendingAmaterasuPenalty: null });
      },

      resolveStreakRescueWithIzanagi: () => {
        const state = get();
        if (!state.pendingIzanagiRescue) return false;
        const nextIzanagi = blindNextHealthyEye(state.izanagi);
        if (!nextIzanagi) {
          set({
            streak: 0,
            pendingIzanagiRescue: null,
          });
          return false;
        }

        set({
          izanagi: nextIzanagi,
          lastFocusDate: getYesterdayLocalDate(formatLocalDate()),
          pendingIzanagiRescue: null,
          izanagiFlashNonce: state.izanagiFlashNonce + 1,
        });
        return true;
      },

      declineStreakRescue: () => {
        set({
          streak: 0,
          pendingIzanagiRescue: null,
        });
      },

      invokeIzanagi: (context: IzanagiTriggerContext) => {
        if (context === 'streak_rescue') {
          return get().resolveStreakRescueWithIzanagi();
        }
        const state = get();
        if (!canInvokeIzanagi(state.izanagi)) return false;
        get().abandonActiveCycle({ useIzanagi: true });
        return true;
      },

      equipEyeStage: (stage: EyeStage) => {
        const state = get();
        if (!isEyeStageUnlocked(stage, state.chakra, state.longestStreak)) {
          return;
        }
        set({ equippedEyeStage: stage });
      },

      setMangekyouVariant: (variant: MangekyouVariant) => {
        set({ mangekyouVariant: variant });
      },

      dismissPendingAwakening: () => {
        set({ pendingAwakening: null });
      },

      updateCustomEye: (patch: Partial<CustomEyeConfig>) => {
        set((state) => ({
          customEye: {
            ...state.customEye,
            ...patch,
          },
        }));
      },

      updateAudioSettings: (patch: Partial<AudioSettings>) => {
        set((state) => {
          const nextAudio: AudioSettings = {
            ...state.audio,
            ...patch,
          };
          audioEngine.syncSettings(nextAudio);
          return { audio: nextAudio };
        });
      },

      devAddChakra: (amount: number) => {
        set((state) => {
          const nextChakra = Math.max(0, state.chakra + amount);
          const highestUnlocked = getHighestUnlockedEyeStage(
            nextChakra,
            state.longestStreak,
          );
          const didUnlockNewEye =
            EYE_STAGE_MAP[highestUnlocked].order >
            EYE_STAGE_MAP[state.currentEyeStage].order;

          return {
            chakra: nextChakra,
            currentEyeStage: didUnlockNewEye
              ? highestUnlocked
              : state.currentEyeStage,
            equippedEyeStage: didUnlockNewEye
              ? highestUnlocked
              : state.equippedEyeStage,
            pendingAwakening: didUnlockNewEye
              ? highestUnlocked
              : state.pendingAwakening,
          };
        });
      },

      devUnlockAllEyes: () => {
        set((state) => {
          const nextChakra = Math.max(state.chakra, 180000);
          return {
            chakra: nextChakra,
            currentEyeStage: 'rinnegan',
            equippedEyeStage: 'rinnegan',
            pendingAwakening: 'rinnegan',
          };
        });
      },

      devTriggerAwakening: (stage: EyeStage) => {
        const required = EYE_STAGE_MAP[stage].requiredChakra;
        set((state) => ({
          chakra: Math.max(state.chakra, required),
          currentEyeStage:
            EYE_STAGE_MAP[stage].order >
            EYE_STAGE_MAP[state.currentEyeStage].order
              ? stage
              : state.currentEyeStage,
          equippedEyeStage: stage,
          pendingAwakening: stage,
        }));
      },

      devToggleEyeBlindness: (eye: 'left' | 'right') => {
        set((state) => ({
          izanagi: {
            ...state.izanagi,
            leftEyeBlind:
              eye === 'left'
                ? !state.izanagi.leftEyeBlind
                : state.izanagi.leftEyeBlind,
            rightEyeBlind:
              eye === 'right'
                ? !state.izanagi.rightEyeBlind
                : state.izanagi.rightEyeBlind,
          },
          izanagiFlashNonce: state.izanagiFlashNonce + 1,
        }));
      },

      devSimulateDayTurnWithAmaterasu: () => {
        const today = formatLocalDate();
        const yesterday = addDays(today, -1);
        set((state) => {
          const hasAmaterasu = state.missions.some(
            (m) => m.status !== 'completed' && m.isAmaterasu,
          );
          const missions = hasAmaterasu
            ? state.missions.map((m) =>
                m.isAmaterasu && m.status !== 'completed'
                  ? { ...m, amaterasuDate: yesterday }
                  : m,
              )
            : state.missions.map((m, idx) =>
                idx === 0
                  ? {
                      ...m,
                      status: 'todo' as const,
                      isAmaterasu: true,
                      amaterasuDate: yesterday,
                    }
                  : m,
              );

          return {
            missions,
            lastDailyCheckDate: yesterday,
          };
        });
        get().runDailyChecks(today);
      },

      devResetToSeed: () => {
        const fresh = createInitialSeedState();
        set({
          ...fresh,
          hasHydrated: true,
        });
        audioEngine.syncSettings(fresh.audio);
      },
    }),
    {
      name: PERSIST_STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): Omit<TsukuyomiState, 'hasHydrated' | 'izanagiFlashNonce'> => ({
        activeTab: state.activeTab,
        chakra: state.chakra,
        currentEyeStage: state.currentEyeStage,
        equippedEyeStage: state.equippedEyeStage,
        mangekyouVariant: state.mangekyouVariant,
        streak: state.streak,
        longestStreak: state.longestStreak,
        lastFocusDate: state.lastFocusDate,
        lastDailyCheckDate: state.lastDailyCheckDate,
        visualBlurLevel: state.visualBlurLevel,
        isTsukuyomiMode: state.isTsukuyomiMode,
        izanagi: state.izanagi,
        missions: state.missions,
        sessionLogs: state.sessionLogs,
        customEye: state.customEye,
        audio: state.audio,
        timer: state.timer,
        pendingAwakening: state.pendingAwakening,
        pendingAmaterasuPenalty: state.pendingAmaterasuPenalty,
        pendingIzanagiRescue: state.pendingIzanagiRescue,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const base = createInitialSeedState();
        if (!persistedState || typeof persistedState !== 'object') {
          return base;
        }
        const incoming = persistedState as Partial<TsukuyomiState>;
        if (version === 0 || version === 1) {
          return {
            ...base,
            ...incoming,
            izanagi: { ...base.izanagi, ...(incoming.izanagi ?? {}) },
            customEye: { ...base.customEye, ...(incoming.customEye ?? {}) },
            audio: { ...base.audio, ...(incoming.audio ?? {}) },
            timer: { ...base.timer, ...(incoming.timer ?? {}) },
          };
        }
        return base;
      },
      onRehydrateStorage: () => (rehydratedState) => {
        if (!rehydratedState) return;
        rehydratedState.setHasHydrated(true);
        audioEngine.syncSettings(rehydratedState.audio);

        if (
          rehydratedState.timer.status === 'running' &&
          rehydratedState.timer.targetEndTime !== null
        ) {
          const now = Date.now();
          if (rehydratedState.timer.targetEndTime <= now) {
            rehydratedState.completeActiveCycle();
          } else {
            rehydratedState.syncTimerTick(now);
          }
        }
      },
    },
  ),
);

// Atomic selectors to prevent full-tree re-renders on every timer tick
export const useHasHydrated = () =>
  useTsukuyomiStore((state) => state.hasHydrated);

export const useActiveTab = () =>
  useTsukuyomiStore((state) => state.activeTab);

export const useIsTsukuyomiMode = () =>
  useTsukuyomiStore((state) => state.isTsukuyomiMode);

export const useTimerRemaining = () =>
  useTsukuyomiStore((state) => state.timer.remainingSeconds);

export const useTimerCore = () =>
  useTsukuyomiStore(
    useShallow((state) => ({
      status: state.timer.status,
      mode: state.timer.mode,
      durationSeconds: state.timer.durationSeconds,
      activeMissionId: state.timer.activeMissionId,
      susanooEnabled: state.timer.susanooEnabled,
    })),
  );

export const useOcularProfile = () =>
  useTsukuyomiStore(
    useShallow((state) => ({
      chakra: state.chakra,
      currentEyeStage: state.currentEyeStage,
      equippedEyeStage: state.equippedEyeStage,
      mangekyouVariant: state.mangekyouVariant,
      customEye: state.customEye,
      streak: state.streak,
      longestStreak: state.longestStreak,
      visualBlurLevel: state.visualBlurLevel,
      izanagi: state.izanagi,
    })),
  );

export const useAudioSettings = () =>
  useTsukuyomiStore((state) => state.audio);
