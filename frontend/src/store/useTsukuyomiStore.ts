'use client';

import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { EYE_STAGE_MAP } from '@/constants/evolution';
import {
  AMATERASU_PENALTY_CHAKRA,
  RANK_DEFINITIONS,
} from '@/constants/ranks';
import { createInitialSeedState } from '@/constants/seed';
import {
  abandonBackendSession,
  completeBackendSession,
  createBackendMission,
  deleteBackendMission,
  fetchFullState,
  generateAiSharingan,
  isValidGuid,
  patchBackendMissionStatus,
  patchEyeCustomization,
  postDevSimulate,
  toggleBackendMissionAmaterasu,
  updateBackendMission,
  type ApiFocusSessionLogDto,
  type ApiGenerateSharinganResponseDto,
  type ApiIzanagiDto,
  type ApiMissionDto,
  type ApiProfileDto,
} from '@/lib/apiClient';
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
  ForgedEyeItem,
  GeneratedSharinganLore,
  GenerateSharinganInput,
  IzanagiTriggerContext,
  LeftEyePassive,
  MangekyouVariant,
  Mission,
  MissionStatus,
  OcularPowers,
  SusanooStageOverride,
  TimerMode,
  TsukuyomiState,
  TsukuyomiStore,
  VisualBlurLevel,
} from '@/types/tsukuyomi';

function getActivePassive(state: TsukuyomiState): LeftEyePassive | null {
  if (!state.customEye.enabled || !state.activeOcularPowers) {
    return null;
  }
  return state.activeOcularPowers.leftEyePassive;
}

function normalizeOcularPowersFromResponse(
  response: ApiGenerateSharinganResponseDto,
): OcularPowers {
  const powers = response.ocularPowers;
  const fallbackColor =
    powers?.visualThemeSignature?.primaryGlowColor ||
    response.primaryGlowColor ||
    response.primaryCrimsonHex ||
    '#DC2626';
  const fallbackSecondary =
    powers?.visualThemeSignature?.secondaryColor ||
    response.secondaryDarkHex ||
    '#450A0A';

  return {
    rarity: powers?.rarity ?? 'Rank S',
    leftEyePassive: {
      type: powers?.leftEyePassive?.type ?? 'CHAKRA_MULTIPLIER',
      name: powers?.leftEyePassive?.name ?? 'Sifão Carmesim de Chakra',
      description:
        powers?.leftEyePassive?.description ??
        'Amplifica o ganho total de Chakra ao concluir qualquer ciclo de foco.',
      bonusValue: powers?.leftEyePassive?.bonusValue ?? 1.25,
    },
    rightEyeActiveJutsu: {
      type: powers?.rightEyeActiveJutsu?.type ?? 'TSUKUYOMI_OVERDRIVE',
      name:
        powers?.rightEyeActiveJutsu?.name ?? 'Sobrecarga do Tsukuyomi Infinito',
      description:
        powers?.rightEyeActiveJutsu?.description ??
        'Dobra o ganho de Chakra e intensifica o selo ocular durante o ciclo.',
      cooldownCycles: powers?.rightEyeActiveJutsu?.cooldownCycles ?? 1,
    },
    visualThemeSignature: {
      primaryGlowColor: fallbackColor,
      secondaryColor: fallbackSecondary,
      audioPitchRate: powers?.visualThemeSignature?.audioPitchRate ?? 1.0,
    },
  };
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function runBackendSync(task: () => Promise<void>): void {
  void task().catch(() => {
    // Graceful offline fallback when backend API is unavailable
  });
}

function mapApiMission(dto: ApiMissionDto): Mission {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    rank: dto.rank,
    status: dto.status,
    estimatedMinutes: dto.estimatedMinutes,
    completedMinutes: dto.completedMinutes,
    isAmaterasu: dto.isAmaterasu,
    amaterasuDate: dto.amaterasuDate,
    createdAt: dto.createdAt,
    completedAt: dto.completedAt,
  };
}

function mapApiLog(dto: ApiFocusSessionLogDto): FocusSessionLog {
  return {
    id: dto.id,
    missionId: dto.missionId,
    missionTitle: dto.missionTitle ?? 'Treino Livre no Tsukuyomi',
    rank: dto.rank ?? 'D',
    durationMinutes: dto.durationMinutes,
    chakraEarned: dto.chakraEarned,
    wasCompleted: dto.wasCompleted,
    usedSusanoo: dto.wasSusanooActive,
    isAmaterasu: false,
    timestamp: dto.timestamp,
    date: dto.date,
  };
}

function clampVisualBlur(level: number): VisualBlurLevel {
  return Math.max(0, Math.min(3, Math.round(level))) as VisualBlurLevel;
}

function mapApiProfilePatch(
  profile: ApiProfileDto,
  currentCustomEye: CustomEyeConfig,
  izanagi?: ApiIzanagiDto,
): Partial<TsukuyomiState> {
  const hasCustomImage = Boolean(profile.customEyeImageUrl);
  const patch: Partial<TsukuyomiState> = {
    chakra: profile.totalChakra,
    currentEyeStage: profile.currentEyeStage,
    equippedEyeStage: profile.equippedEyeStage,
    mangekyouVariant: profile.mangekyouVariant,
    visualBlurLevel: clampVisualBlur(profile.visualBlurLevel),
    streak: profile.currentStreak,
    longestStreak: profile.bestStreak,
    lastFocusDate: profile.lastFocusDate,
    customEye: {
      ...currentCustomEye,
      imageDataUrl: profile.customEyeImageUrl,
      enabled: hasCustomImage ? true : currentCustomEye.enabled && hasCustomImage,
    },
  };

  if (izanagi) {
    patch.izanagi = {
      leftEyeBlind: izanagi.leftEyeBlind,
      rightEyeBlind: izanagi.rightEyeBlind,
      restorationProgressMinutes: izanagi.restorationProgressMinutes,
      totalTimesUsed: izanagi.totalTimesUsed,
    };
  }

  return patch;
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
const PERSIST_VERSION = 3;

function createDeduplicatedStorage(): StateStorage {
  let lastPersistedValue: string | null = null;
  return {
    getItem: (name: string) => {
      if (typeof window === 'undefined') return null;
      const value = window.localStorage.getItem(name);
      lastPersistedValue = value;
      return value;
    },
    setItem: (name: string, value: string) => {
      if (typeof window === 'undefined') return;
      if (value === lastPersistedValue) return;
      lastPersistedValue = value;
      window.localStorage.setItem(name, value);
    },
    removeItem: (name: string) => {
      if (typeof window === 'undefined') return;
      lastPersistedValue = null;
      window.localStorage.removeItem(name);
    },
  };
}

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
        const state = get();
        const nextMode =
          typeof force === 'boolean' ? force : !state.isTsukuyomiMode;

        if (nextMode && !state.isTsukuyomiMode) {
          void audioEngine.play('tsukuyomi-cast');
          set({
            isTsukuyomiMode: true,
            tsukuyomiCastNonce: state.tsukuyomiCastNonce + 1,
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
          });
          return;
        }

        if (!nextMode && state.isTsukuyomiMode) {
          audioEngine.playClick();
        }
        set({ isTsukuyomiMode: nextMode });
      },

      setTimerMode: (mode: TimerMode, customDurationSeconds?: number) => {
        const state = get();
        if (state.timer.status !== 'idle') {
          return;
        }
        const activeMission = state.missions.find(
          (m) => m.id === state.timer.activeMissionId,
        );
        const durationSeconds =
          customDurationSeconds ??
          getDefaultDurationSecondsForMode(mode, activeMission);
        audioEngine.playClick();
        set({
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
          timer: {
            ...state.timer,
            mode,
            durationSeconds,
            remainingSeconds: durationSeconds,
            targetEndTime: null,
            susanooEnabled: mode === 'focus' ? state.timer.susanooEnabled : false,
          },
        });
      },

      setTimerDuration: (minutes: number) => {
        const state = get();
        if (state.timer.status !== 'idle') {
          return;
        }
        const safeSeconds = Math.max(60, Math.round(minutes * 60));
        audioEngine.playClick();
        set({
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
          timer: {
            ...state.timer,
            durationSeconds: safeSeconds,
            remainingSeconds: safeSeconds,
            targetEndTime: null,
          },
        });
      },

      setSusanooEnabled: (enabled: boolean) => {
        const state = get();
        if (state.timer.status !== 'idle' || state.timer.mode !== 'focus') {
          return;
        }
        const enabling = enabled && !state.timer.susanooEnabled;
        if (enabling) {
          void audioEngine.play('susanoo-summon');
        } else if (!enabled && state.timer.susanooEnabled) {
          audioEngine.playClick();
        }
        set({
          ocularSpinBurstNonce: enabling
            ? state.ocularSpinBurstNonce + 1
            : state.ocularSpinBurstNonce,
          timer: {
            ...state.timer,
            susanooEnabled: enabled,
          },
        });
      },

      setSusanooStageOverride: (override: SusanooStageOverride) => {
        void audioEngine.play('susanoo-summon');
        set((state) => ({
          susanooStageOverride: override,
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        }));
      },

      startTimer: () => {
        const state = get();
        if (state.timer.status === 'running') return;

        const remaining =
          state.timer.remainingSeconds > 0
            ? state.timer.remainingSeconds
            : state.timer.durationSeconds;
        const targetEndTime = Date.now() + remaining * 1000;
        const isFreshFocusStart =
          state.timer.status === 'idle' && state.timer.mode === 'focus';

        void audioEngine.unlock();
        if (isFreshFocusStart) {
          void audioEngine.play('tsukuyomi-cast');
        } else {
          audioEngine.playClick();
        }

        set({
          tsukuyomiCastNonce: isFreshFocusStart
            ? state.tsukuyomiCastNonce + 1
            : state.tsukuyomiCastNonce,
          ocularSpinBurstNonce: isFreshFocusStart
            ? state.ocularSpinBurstNonce + 1
            : state.ocularSpinBurstNonce,
          tsukuyomiOverdriveActive: isFreshFocusStart
            ? false
            : state.tsukuyomiOverdriveActive,
          activeJutsuUsedInCurrentCycle: isFreshFocusStart
            ? false
            : state.activeJutsuUsedInCurrentCycle,
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
        void audioEngine.play('mission-complete');

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
        const baseDurationMinutes = Math.max(
          1,
          Math.round(state.timer.durationSeconds / 60),
        );
        const activePassive = getActivePassive(state);
        const timeDilationFactor =
          activePassive?.type === 'TIME_DILATION'
            ? Math.max(1.05, activePassive.bonusValue || 1.28)
            : 1.0;
        const durationMinutes = Math.round(
          baseDurationMinutes * timeDilationFactor,
        );

        const activeMission = state.missions.find(
          (m) => m.id === state.timer.activeMissionId,
        );
        const rank = activeMission?.rank ?? 'D';
        const isAmaterasu = activeMission?.isAmaterasu ?? false;
        const usedSusanoo = state.timer.susanooEnabled;

        let chakraEarned = calculateSessionChakra({
          durationMinutes,
          rank,
          isAmaterasu,
          usedSusanoo,
        });

        if (activePassive?.type === 'CHAKRA_MULTIPLIER') {
          const multiplier = Math.max(1.05, activePassive.bonusValue || 1.25);
          chakraEarned = Math.round(chakraEarned * multiplier);
        }

        if (activePassive?.type === 'AMATERASU_MASTERY' && isAmaterasu) {
          // Amaterasu Mastery doubles the Black-Flame bonus intensity
          chakraEarned = Math.round(chakraEarned * 1.45);
        }

        if (state.tsukuyomiOverdriveActive) {
          chakraEarned *= 2;
        }

        const nextChakra = state.chakra + chakraEarned;
        const streakUpdate = computeStreakOnCompletion({
          streak: state.streak,
          longestStreak: state.longestStreak,
          lastFocusDate: state.lastFocusDate,
          today,
        });

        const nextVisualBlurLevel = (
          activePassive?.type === 'VISUAL_IMMUNITY'
            ? 0
            : Math.max(0, state.visualBlurLevel - 1)
        ) as VisualBlurLevel;

        const restorationTargetMinutes =
          activePassive?.type === 'IZANAGI_REGEN'
            ? Math.max(45, Math.round(activePassive.bonusValue || 90))
            : 180;

        const nextIzanagi = applyIzanagiRestoration(
          state.izanagi,
          durationMinutes,
          restorationTargetMinutes,
        );

        const nextCooldownCyclesRemaining = state.activeJutsuUsedInCurrentCycle
          ? Math.max(
              0,
              (state.activeOcularPowers?.rightEyeActiveJutsu.cooldownCycles ??
                1) - 1,
            )
          : Math.max(0, state.activeJutsuCooldownCyclesRemaining - 1);

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
          state.isBetaFullAccess,
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
          tsukuyomiOverdriveActive: false,
          activeJutsuUsedInCurrentCycle: false,
          activeJutsuCooldownCyclesRemaining: nextCooldownCyclesRemaining,
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

        runBackendSync(async () => {
          const response = await completeBackendSession({
            missionId: isValidGuid(activeMission?.id) ? activeMission.id : null,
            durationMinutes,
            wasSusanooActive: usedSusanoo,
            markMissionCompleted: false,
          });
          const syncedLog = mapApiLog(response.session);
          const syncedMission = response.updatedMission
            ? mapApiMission(response.updatedMission)
            : null;

          set((curr) => ({
            backendConnected: true,
            ...mapApiProfilePatch(response.profile, curr.customEye, response.izanagi),
            missions: syncedMission
              ? curr.missions.map((m) => (m.id === syncedMission.id ? syncedMission : m))
              : curr.missions,
            sessionLogs: [
              syncedLog,
              ...curr.sessionLogs.filter((l) => l.id !== newLog.id && l.id !== syncedLog.id),
            ],
            pendingAwakening: response.unlockedNewEyeStage && response.newEyeStage
              ? response.newEyeStage
              : curr.pendingAwakening,
          }));
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

        const activeMissionForIzanagi = state.missions.find(
          (m) => m.id === state.timer.activeMissionId,
        );
        const elapsedForIzanagi = Math.max(
          0,
          Math.floor(
            (state.timer.durationSeconds - state.timer.remainingSeconds) / 60,
          ),
        );

        if (options?.useIzanagi && canInvokeIzanagi(state.izanagi)) {
          const nextIzanagi = blindNextHealthyEye(state.izanagi);
          if (nextIzanagi) {
            void audioEngine.play('izanagi-rewind');
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

            runBackendSync(async () => {
              const response = await abandonBackendSession({
                missionId: isValidGuid(activeMissionForIzanagi?.id)
                  ? activeMissionForIzanagi.id
                  : null,
                durationMinutesElapsed: elapsedForIzanagi,
                wasSusanooActive: state.timer.susanooEnabled,
                useIzanagiToPreventPenalty: true,
              });
              set((curr) => ({
                backendConnected: true,
                ...mapApiProfilePatch(response.profile, curr.customEye, response.izanagi),
              }));
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

        const activePassiveOnAbandon = getActivePassive(state);
        const nextBlur = (
          activePassiveOnAbandon?.type === 'VISUAL_IMMUNITY'
            ? 0
            : activePassiveOnAbandon?.type === 'IZANAGI_REGEN' &&
                state.timer.susanooEnabled
              ? state.visualBlurLevel
              : Math.min(3, state.visualBlurLevel + 1)
        ) as VisualBlurLevel;

        set({
          visualBlurLevel: nextBlur,
          tsukuyomiOverdriveActive: false,
          activeJutsuUsedInCurrentCycle: false,
          sessionLogs: [abandonedLog, ...state.sessionLogs],
          timer: {
            ...state.timer,
            status: 'idle',
            remainingSeconds: state.timer.durationSeconds,
            targetEndTime: null,
            susanooEnabled: false,
          },
        });

        runBackendSync(async () => {
          const response = await abandonBackendSession({
            missionId: isValidGuid(activeMission?.id) ? activeMission.id : null,
            durationMinutesElapsed: elapsedMinutes,
            wasSusanooActive: state.timer.susanooEnabled,
            useIzanagiToPreventPenalty: false,
          });
          const syncedLog = mapApiLog(response.session);
          set((curr) => ({
            backendConnected: true,
            ...mapApiProfilePatch(response.profile, curr.customEye, response.izanagi),
            sessionLogs: [
              syncedLog,
              ...curr.sessionLogs.filter((l) => l.id !== abandonedLog.id && l.id !== syncedLog.id),
            ],
          }));
        });
      },

      addMission: (input: CreateMissionInput): Mission => {
        const today = formatLocalDate();
        const state = get();
        const activePassive = getActivePassive(state);
        const maxAmaterasuPerDay =
          activePassive?.type === 'AMATERASU_MASTERY'
            ? Math.max(2, Math.round(activePassive.bonusValue || 2))
            : 1;
        const activeAmaterasuTodayCount = state.missions.filter(
          (m) =>
            m.status !== 'completed' &&
            m.isAmaterasu &&
            m.amaterasuDate === today,
        ).length;
        const allowAmaterasu =
          Boolean(input.isAmaterasu) &&
          activeAmaterasuTodayCount < maxAmaterasuPerDay;

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

        runBackendSync(async () => {
          const created = await createBackendMission({
            title: mission.title,
            description: mission.description,
            rank: mission.rank,
            estimatedMinutes: mission.estimatedMinutes,
            isAmaterasu: mission.isAmaterasu,
          });
          const finalDto =
            mission.status !== 'todo'
              ? await patchBackendMissionStatus(created.id, mission.status)
              : created;
          const syncedMission = mapApiMission(finalDto);

          set((curr) => ({
            backendConnected: true,
            missions: curr.missions.map((m) =>
              m.id === mission.id ? syncedMission : m,
            ),
            timer:
              curr.timer.activeMissionId === mission.id
                ? { ...curr.timer, activeMissionId: syncedMission.id }
                : curr.timer,
          }));
        });

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

        if (isValidGuid(id)) {
          const updated = get().missions.find((m) => m.id === id);
          if (updated) {
            runBackendSync(async () => {
              const dto = await updateBackendMission(id, {
                title: updated.title,
                description: updated.description,
                rank: updated.rank,
                estimatedMinutes: updated.estimatedMinutes,
              });
              const synced = mapApiMission(dto);
              set((curr) => ({
                backendConnected: true,
                missions: curr.missions.map((m) => (m.id === id ? synced : m)),
              }));
            });
          }
        }
      },

      deleteMission: (id: string) => {
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== id),
          timer:
            state.timer.activeMissionId === id
              ? { ...state.timer, activeMissionId: null }
              : state.timer,
        }));

        if (isValidGuid(id)) {
          runBackendSync(async () => {
            await deleteBackendMission(id);
            set({ backendConnected: true });
          });
        }
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

        if (isValidGuid(id)) {
          runBackendSync(async () => {
            await patchBackendMissionStatus(id, targetStatus);
            set({ backendConnected: true });
          });
        }
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
          audioEngine.playClick();
          set({
            missions: state.missions.map((m) =>
              m.id === id ? { ...m, isAmaterasu: false, amaterasuDate: null } : m,
            ),
          });
          if (isValidGuid(id)) {
            runBackendSync(async () => {
              await toggleBackendMissionAmaterasu(id, false);
              set({ backendConnected: true });
            });
          }
          return { ok: true };
        }

        const today = formatLocalDate();
        const activePassive = getActivePassive(state);
        const maxAmaterasuPerDay =
          activePassive?.type === 'AMATERASU_MASTERY'
            ? Math.max(2, Math.round(activePassive.bonusValue || 2))
            : 1;
        const existingTodayCount = state.missions.filter(
          (m) =>
            m.id !== id &&
            m.status !== 'completed' &&
            m.isAmaterasu &&
            m.amaterasuDate === today,
        ).length;

        if (existingTodayCount >= maxAmaterasuPerDay) {
          return {
            ok: false,
            reason:
              maxAmaterasuPerDay > 1
                ? `Limite diário (${maxAmaterasuPerDay} missões com Amaterasu) atingido hoje.`
                : 'Já existe uma missão marcada com o Amaterasu hoje. Conclua-a ou apague suas chamas primeiro.',
          };
        }

        void audioEngine.play('amaterasu-ignite');
        set({
          missions: state.missions.map((m) =>
            m.id === id ? { ...m, isAmaterasu: true, amaterasuDate: today } : m,
          ),
        });
        if (isValidGuid(id)) {
          runBackendSync(async () => {
            await toggleBackendMissionAmaterasu(id, true);
            set({ backendConnected: true });
          });
        }
        return { ok: true };
      },

      dragMissionToTsukuyomi: (id: string) => {
        const current = get();
        const targetMission = current.missions.find((m) => m.id === id);
        if (!targetMission) return;

        void audioEngine.play('sharingan-activate');
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
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
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

        if (isValidGuid(id)) {
          runBackendSync(async () => {
            await patchBackendMissionStatus(id, 'in_tsukuyomi');
            set({ backendConnected: true });
          });
        }
      },

      setActiveMission: (id: string | null) => {
        if (id) {
          void audioEngine.play('sharingan-activate');
        } else {
          audioEngine.playClick();
        }
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
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
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

        void audioEngine.play('izanagi-rewind');
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
        if (
          !isEyeStageUnlocked(
            stage,
            state.chakra,
            state.longestStreak,
            state.isBetaFullAccess,
          )
        ) {
          return;
        }
        audioEngine.setCustomPitchRate(1.0);
        void audioEngine.play('mangekyou-awaken');
        set({
          equippedEyeStage: stage,
          customEye: {
            ...state.customEye,
            enabled: false,
            imageDataUrl: null,
          },
          equippedForgedEyeId: null,
          activeOcularPowers: null,
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        });

        runBackendSync(async () => {
          await patchEyeCustomization({
            equippedEyeStage: stage,
            customEyeImageUrl: null,
            clearCustomEyeImage: true,
          });
          set({ backendConnected: true });
        });
      },

      setMangekyouVariant: (variant: MangekyouVariant) => {
        const state = get();
        if (
          !state.isBetaFullAccess &&
          !isEyeStageUnlocked(
            'mangekyou',
            state.chakra,
            state.longestStreak,
            false,
          )
        ) {
          return;
        }
        const nextStage: EyeStage =
          state.equippedEyeStage === 'ems' ? 'ems' : 'mangekyou';
        audioEngine.setCustomPitchRate(1.0);
        void audioEngine.play('mangekyou-awaken');
        set({
          equippedEyeStage: nextStage,
          mangekyouVariant: variant,
          customEye: {
            ...state.customEye,
            enabled: false,
            imageDataUrl: null,
          },
          equippedForgedEyeId: null,
          activeOcularPowers: null,
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        });

        runBackendSync(async () => {
          await patchEyeCustomization({
            equippedEyeStage: nextStage,
            mangekyouVariant: variant,
            customEyeImageUrl: null,
            clearCustomEyeImage: true,
          });
          set({ backendConnected: true });
        });
      },

      setBetaFullAccess: (enabled: boolean) => {
        audioEngine.playClick();
        set({ isBetaFullAccess: enabled });
      },

      triggerOcularSpinBurst: () => {
        set((state) => ({
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        }));
      },

      triggerTsukuyomiCastCutscene: () => {
        void audioEngine.play('tsukuyomi-cast');
        set((state) => ({
          tsukuyomiCastNonce: state.tsukuyomiCastNonce + 1,
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        }));
      },

      dismissPendingAwakening: () => {
        set({ pendingAwakening: null });
      },

      updateCustomEye: (patch: Partial<CustomEyeConfig>) => {
        set((state) => {
          const nextCustomEye = {
            ...state.customEye,
            ...patch,
          };
          if (nextCustomEye.enabled && state.activeOcularPowers) {
            audioEngine.setCustomPitchRate(
              state.activeOcularPowers.visualThemeSignature.audioPitchRate,
            );
          } else {
            audioEngine.setCustomPitchRate(1.0);
          }

          const shouldUpdateForgedComposite =
            Boolean(state.equippedForgedEyeId) &&
            typeof patch.imageDataUrl === 'string' &&
            !patch.imageDataUrl.startsWith('data:image/svg+xml');
          const visualChanged =
            patch.imageDataUrl !== undefined || patch.enabled !== undefined;

          return {
            customEye: nextCustomEye,
            ocularSpinBurstNonce: visualChanged
              ? state.ocularSpinBurstNonce + 1
              : state.ocularSpinBurstNonce,
            forgedEyesInventory: shouldUpdateForgedComposite
              ? state.forgedEyesInventory.map((item) =>
                  item.id === state.equippedForgedEyeId
                    ? { ...item, compositeDataUrl: patch.imageDataUrl ?? null }
                    : item,
                )
              : state.forgedEyesInventory,
          };
        });

        if (patch.imageDataUrl !== undefined || patch.enabled !== undefined) {
          const nextCustomEye = get().customEye;
          const shouldClear =
            patch.imageDataUrl === null || patch.enabled === false;
          runBackendSync(async () => {
            await patchEyeCustomization({
              customEyeImageUrl: shouldClear ? null : nextCustomEye.imageDataUrl,
              clearCustomEyeImage: shouldClear,
            });
            set({ backendConnected: true });
          });
        }
      },

      syncFromBackend: async () => {
        try {
          const remote = await fetchFullState();
          const remoteMissions = remote.missions.map(mapApiMission);
          const remoteLogs = remote.recentLogs.map(mapApiLog);

          set((state) => {
            const currentActiveExists =
              state.timer.activeMissionId !== null &&
              remoteMissions.some((m) => m.id === state.timer.activeMissionId);

            const nextActiveMission = currentActiveExists
              ? (remoteMissions.find((m) => m.id === state.timer.activeMissionId) ?? null)
              : (remoteMissions.find((m) => m.status === 'in_tsukuyomi') ?? null);

            const shouldResetIdleDuration =
              state.timer.status === 'idle' &&
              state.timer.mode === 'focus' &&
              !currentActiveExists &&
              nextActiveMission !== null;

            const nextDurationSeconds =
              shouldResetIdleDuration && nextActiveMission
                ? Math.max(1, nextActiveMission.estimatedMinutes) * 60
                : state.timer.durationSeconds;

            const nextPenalty =
              remote.amaterasuPenaltyApplied && remote.amaterasuPenaltyChakra > 0
                ? {
                    missionId: 'amaterasu-daily-check',
                    missionTitle:
                      remote.expiredAmaterasuMissions[0] ??
                      'Missão Amaterasu expirada',
                    chakraLost: remote.amaterasuPenaltyChakra,
                    failedDate: formatLocalDate(),
                  }
                : state.pendingAmaterasuPenalty;

            return {
              backendConnected: true,
              ...mapApiProfilePatch(remote.profile, state.customEye, remote.izanagi),
              missions: remoteMissions,
              sessionLogs: remoteLogs,
              pendingAmaterasuPenalty: nextPenalty,
              timer: {
                ...state.timer,
                activeMissionId: nextActiveMission?.id ?? null,
                durationSeconds: nextDurationSeconds,
                remainingSeconds: shouldResetIdleDuration
                  ? nextDurationSeconds
                  : state.timer.remainingSeconds,
              },
            };
          });
        } catch {
          set({ backendConnected: false });
        }
      },

      generateCustomSharinganWithAi: async (
        input: GenerateSharinganInput,
      ): Promise<GeneratedSharinganLore> => {
        set({ isGeneratingSharingan: true });
        try {
          const state = get();
          const styleVariant = input.styleVariant ?? state.mangekyouVariant;
          const outputFormat = input.outputFormat ?? 'anime_svg';
          const autoEquip = input.autoEquip ?? true;

          const response = await generateAiSharingan({
            prompt: input.prompt?.trim() || undefined,
            baseEyeImageBase64: input.baseEyeImageBase64 ?? null,
            styleVariant,
            outputFormat,
            autoEquip,
          });

          const ocularPowers = normalizeOcularPowersFromResponse(response);

          const lore: GeneratedSharinganLore = {
            doujutsuName: response.doujutsuName,
            loreDescription: response.loreDescription,
            detectedMood: response.detectedMood ?? '',
            eyeCenterX: response.eyeCenterX ?? 0.5,
            eyeCenterY: response.eyeCenterY ?? 0.5,
            irisRadiusRatio: response.irisRadiusRatio ?? 0.22,
            bladeCount: response.bladeCount ?? 3,
            patternType: response.patternType ?? 'itachi_shuriken',
            centerShape: response.centerShape ?? 'circle',
            bladeStyle: response.bladeStyle ?? 'curved_shuriken',
            outerRingStyle: response.outerRingStyle ?? 'tomoe_ring',
            primaryCrimsonHex:
              response.primaryCrimsonHex ??
              ocularPowers.visualThemeSignature.primaryGlowColor,
            secondaryDarkHex:
              response.secondaryDarkHex ??
              ocularPowers.visualThemeSignature.secondaryColor,
            hasAmaterasuFlames: Boolean(response.hasAmaterasuFlames),
            rotationOffset: response.rotationOffset ?? 0,
            rawSvgCode: response.rawSvgCode,
            svgDataUri: response.svgDataUri,
            rasterImageUrl: response.rasterImageUrl,
            primaryGlowColor: ocularPowers.visualThemeSignature.primaryGlowColor,
            equippedImageUrl: response.equippedImageUrl,
            outputFormat,
            ocularPowers,
          };

          const forgedItem: ForgedEyeItem = {
            id: generateId('eye'),
            doujutsuName: lore.doujutsuName,
            loreDescription: lore.loreDescription,
            detectedMood: lore.detectedMood,
            svgDataUri: lore.svgDataUri,
            compositeDataUrl:
              outputFormat === 'photo_lens' ? lore.equippedImageUrl : null,
            primaryCrimsonHex: lore.primaryCrimsonHex,
            secondaryDarkHex: lore.secondaryDarkHex,
            patternType: lore.patternType,
            centerShape: lore.centerShape,
            bladeStyle: lore.bladeStyle,
            bladeCount: lore.bladeCount,
            outerRingStyle: lore.outerRingStyle,
            hasAmaterasuFlames: lore.hasAmaterasuFlames,
            ocularPowers,
            createdAt: new Date().toISOString(),
          };

          const shouldActivatePowers = autoEquip || outputFormat === 'photo_lens';
          audioEngine.setCustomPitchRate(
            shouldActivatePowers
              ? ocularPowers.visualThemeSignature.audioPitchRate
              : 1.0,
          );
          void audioEngine.play('mangekyou-awaken');

          set((curr) => {
            const nextCustomEye: CustomEyeConfig = autoEquip
              ? {
                  ...curr.customEye,
                  enabled: true,
                  imageDataUrl: response.equippedImageUrl,
                }
              : curr.customEye;

            const profilePatch = response.profile
              ? mapApiProfilePatch(response.profile, nextCustomEye)
              : {};

            return {
              ...profilePatch,
              backendConnected: true,
              lastGeneratedSharingan: lore,
              customEye: nextCustomEye,
              forgedEyesInventory: [forgedItem, ...curr.forgedEyesInventory].slice(
                0,
                24,
              ),
              equippedForgedEyeId: shouldActivatePowers
                ? forgedItem.id
                : curr.equippedForgedEyeId,
              activeOcularPowers: shouldActivatePowers
                ? ocularPowers
                : curr.activeOcularPowers,
              activeJutsuCooldownCyclesRemaining: shouldActivatePowers
                ? 0
                : curr.activeJutsuCooldownCyclesRemaining,
              ocularSpinBurstNonce: curr.ocularSpinBurstNonce + 1,
            };
          });

          return lore;
        } finally {
          set({ isGeneratingSharingan: false });
        }
      },

      addForgedEyeToInventory: (item: ForgedEyeItem, autoEquip = false) => {
        set((state) => {
          const deduped = state.forgedEyesInventory.filter(
            (existing) => existing.id !== item.id,
          );
          const nextInventory = [item, ...deduped].slice(0, 24);
          if (autoEquip) {
            audioEngine.setCustomPitchRate(
              item.ocularPowers.visualThemeSignature.audioPitchRate,
            );
          }
          return {
            forgedEyesInventory: nextInventory,
            equippedForgedEyeId: autoEquip
              ? item.id
              : state.equippedForgedEyeId,
            activeOcularPowers: autoEquip
              ? item.ocularPowers
              : state.activeOcularPowers,
            customEye: autoEquip
              ? {
                  ...state.customEye,
                  enabled: true,
                  imageDataUrl: item.compositeDataUrl ?? item.svgDataUri,
                }
              : state.customEye,
          };
        });
      },

      equipForgedEye: (id: string) => {
        const state = get();
        const found = state.forgedEyesInventory.find((item) => item.id === id);
        if (!found) return;

        audioEngine.setCustomPitchRate(
          found.ocularPowers.visualThemeSignature.audioPitchRate,
        );
        void audioEngine.play('mangekyou-awaken');

        const nextImage = found.compositeDataUrl ?? found.svgDataUri;
        set({
          equippedForgedEyeId: found.id,
          activeOcularPowers: found.ocularPowers,
          tsukuyomiOverdriveActive: false,
          activeJutsuCooldownCyclesRemaining: 0,
          customEye: {
            ...state.customEye,
            enabled: true,
            imageDataUrl: nextImage,
          },
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        });

        runBackendSync(async () => {
          await patchEyeCustomization({
            customEyeImageUrl: nextImage,
            clearCustomEyeImage: false,
          });
          set({ backendConnected: true });
        });
      },

      deleteForgedEye: (id: string) => {
        const state = get();
        const isDeletingEquipped = state.equippedForgedEyeId === id;
        const remaining = state.forgedEyesInventory.filter(
          (item) => item.id !== id,
        );

        audioEngine.playClick();
        if (isDeletingEquipped) {
          audioEngine.setCustomPitchRate(1.0);
        }

        set({
          forgedEyesInventory: remaining,
          equippedForgedEyeId: isDeletingEquipped
            ? null
            : state.equippedForgedEyeId,
          activeOcularPowers: isDeletingEquipped
            ? null
            : state.activeOcularPowers,
          customEye: isDeletingEquipped
            ? { ...state.customEye, enabled: false, imageDataUrl: null }
            : state.customEye,
          ocularSpinBurstNonce: isDeletingEquipped
            ? state.ocularSpinBurstNonce + 1
            : state.ocularSpinBurstNonce,
        });

        if (isDeletingEquipped) {
          runBackendSync(async () => {
            await patchEyeCustomization({
              customEyeImageUrl: null,
              clearCustomEyeImage: true,
            });
            set({ backendConnected: true });
          });
        }
      },

      invokeRightEyeJutsu: () => {
        const state = get();
        if (!state.customEye.enabled || !state.activeOcularPowers) {
          return {
            ok: false,
            message: 'Equipe um Mangekyou Forjado para invocar o Jutsu do Olho Direito.',
          };
        }

        if (state.activeJutsuUsedInCurrentCycle) {
          return {
            ok: false,
            message: 'O Olho Direito já foi invocado neste ciclo de foco.',
          };
        }

        if (state.activeJutsuCooldownCyclesRemaining > 0) {
          return {
            ok: false,
            message: `Jutsu em recarga (${state.activeJutsuCooldownCyclesRemaining} ciclo restante).`,
          };
        }

        const jutsu = state.activeOcularPowers.rightEyeActiveJutsu;

        if (jutsu.type === 'KAMUI_SKIP') {
          if (state.timer.mode !== 'focus' || state.timer.status === 'idle') {
            return {
              ok: false,
              message: 'Inicie um ciclo de Foco para teleportar o tempo com o Kamui.',
            };
          }

          void audioEngine.play('tsukuyomi-cast');
          const remaining = state.timer.remainingSeconds;
          if (remaining <= 300) {
            set({
              activeJutsuUsedInCurrentCycle: true,
              activeJutsuCooldownCyclesRemaining: Math.max(
                0,
                jutsu.cooldownCycles - 1,
              ),
              ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
            });
            get().completeActiveCycle();
            return {
              ok: true,
              message: `${jutsu.name}: Vórtice Kamui concluiu os minutos finais com 100% de Chakra!`,
            };
          }

          const nextRemaining = Math.max(1, remaining - 300);
          const nextTargetEnd =
            state.timer.status === 'running' && state.timer.targetEndTime !== null
              ? state.timer.targetEndTime - 300 * 1000
              : null;

          set({
            activeJutsuUsedInCurrentCycle: true,
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
            tsukuyomiCastNonce: state.tsukuyomiCastNonce + 1,
            timer: {
              ...state.timer,
              remainingSeconds: nextRemaining,
              targetEndTime: nextTargetEnd,
            },
          });

          return {
            ok: true,
            message: `${jutsu.name}: -5 minutos distorcidos no espaço-tempo!`,
          };
        }

        if (jutsu.type === 'TSUKUYOMI_OVERDRIVE') {
          if (state.timer.mode !== 'focus' || state.timer.status === 'idle') {
            return {
              ok: false,
              message: 'Inicie o cronômetro em Foco para ativar a Sobrecarga 2x Chakra.',
            };
          }

          void audioEngine.play('susanoo-summon');
          set({
            tsukuyomiOverdriveActive: true,
            activeJutsuUsedInCurrentCycle: true,
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
            tsukuyomiCastNonce: state.tsukuyomiCastNonce + 1,
          });
          return {
            ok: true,
            message: `${jutsu.name}: Overdrive 2x Chakra ativado até o fim deste ciclo!`,
          };
        }

        if (jutsu.type === 'KOTOAMATSUKAMI_COMPLETE') {
          void audioEngine.play('mangekyou-awaken');
          const activeMission = state.missions.find(
            (m) => m.id === state.timer.activeMissionId,
          );
          const nextBlur = Math.max(
            0,
            state.visualBlurLevel - 1,
          ) as VisualBlurLevel;

          const nextMissions = activeMission
            ? state.missions.map((m) => {
                if (m.id !== activeMission.id) return m;
                const nextCompleted = m.completedMinutes + 25;
                const finished = nextCompleted >= m.estimatedMinutes;
                return {
                  ...m,
                  completedMinutes: nextCompleted,
                  status: finished ? ('completed' as const) : m.status,
                  completedAt: finished
                    ? m.completedAt ?? new Date().toISOString()
                    : m.completedAt,
                };
              })
            : state.missions;

          set({
            missions: nextMissions,
            chakra: state.chakra + 250,
            visualBlurLevel: nextBlur,
            activeJutsuUsedInCurrentCycle: true,
            activeJutsuCooldownCyclesRemaining: Math.max(
              0,
              jutsu.cooldownCycles - 1,
            ),
            ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
          });

          return {
            ok: true,
            message: activeMission
              ? `${jutsu.name}: +25m impressos em "${activeMission.title}", +250 Chakra e acuidade restaurada!`
              : `${jutsu.name}: +250 Chakra absorvidos e +1 nível de Acuidade Visual restaurado!`,
          };
        }

        // SHINRA_TENSEI_PURGE
        void audioEngine.play('rinnegan-awaken');
        set({
          visualBlurLevel: 0,
          chakra: state.chakra + 200,
          activeJutsuUsedInCurrentCycle: true,
          activeJutsuCooldownCyclesRemaining: Math.max(
            0,
            jutsu.cooldownCycles - 1,
          ),
          ocularSpinBurstNonce: state.ocularSpinBurstNonce + 1,
        });
        return {
          ok: true,
          message: `${jutsu.name}: Desgaste Visual purgado (100% Acuidade) e +200 Chakra canalizados!`,
        };
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
            state.isBetaFullAccess,
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

        runBackendSync(async () => {
          const remote = await postDevSimulate({ addChakra: amount });
          set((curr) => ({
            backendConnected: true,
            ...mapApiProfilePatch(remote.profile, curr.customEye, remote.izanagi),
          }));
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

        runBackendSync(async () => {
          const remote = await postDevSimulate({ unlockAllEyes: true });
          set((curr) => ({
            backendConnected: true,
            ...mapApiProfilePatch(remote.profile, curr.customEye, remote.izanagi),
          }));
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

        const nextIzanagi = get().izanagi;
        runBackendSync(async () => {
          const remote = await postDevSimulate(
            eye === 'left'
              ? { simulateLeftEyeBlind: nextIzanagi.leftEyeBlind }
              : { simulateRightEyeBlind: nextIzanagi.rightEyeBlind },
          );
          set((curr) => ({
            backendConnected: true,
            ...mapApiProfilePatch(remote.profile, curr.customEye, remote.izanagi),
          }));
        });
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
      storage: createJSONStorage(() => createDeduplicatedStorage()),
      partialize: (
        state,
      ): Omit<
        TsukuyomiState,
        | 'hasHydrated'
        | 'izanagiFlashNonce'
        | 'tsukuyomiCastNonce'
        | 'ocularSpinBurstNonce'
        | 'backendConnected'
        | 'isGeneratingSharingan'
        | 'tsukuyomiOverdriveActive'
        | 'activeJutsuUsedInCurrentCycle'
      > => ({
        activeTab: state.activeTab,
        chakra: state.chakra,
        currentEyeStage: state.currentEyeStage,
        equippedEyeStage: state.equippedEyeStage,
        mangekyouVariant: state.mangekyouVariant,
        isBetaFullAccess: state.isBetaFullAccess,
        susanooStageOverride: state.susanooStageOverride,
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
        timer: {
          ...state.timer,
          remainingSeconds:
            state.timer.status === 'running'
              ? state.timer.durationSeconds
              : state.timer.remainingSeconds,
        },
        pendingAwakening: state.pendingAwakening,
        pendingAmaterasuPenalty: state.pendingAmaterasuPenalty,
        pendingIzanagiRescue: state.pendingIzanagiRescue,
        lastGeneratedSharingan: state.lastGeneratedSharingan,
        forgedEyesInventory: state.forgedEyesInventory,
        equippedForgedEyeId: state.equippedForgedEyeId,
        activeOcularPowers: state.activeOcularPowers,
        activeJutsuCooldownCyclesRemaining:
          state.activeJutsuCooldownCyclesRemaining,
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
            isBetaFullAccess: true,
            susanooStageOverride: 'auto' as const,
            currentEyeStage: 'rinnegan' as const,
            lastGeneratedSharingan: incoming.lastGeneratedSharingan ?? null,
            forgedEyesInventory: incoming.forgedEyesInventory ?? [],
            equippedForgedEyeId: incoming.equippedForgedEyeId ?? null,
            activeOcularPowers: incoming.activeOcularPowers ?? null,
            activeJutsuCooldownCyclesRemaining:
              incoming.activeJutsuCooldownCyclesRemaining ?? 0,
            izanagi: { ...base.izanagi, ...(incoming.izanagi ?? {}) },
            customEye: { ...base.customEye, ...(incoming.customEye ?? {}) },
            audio: { ...base.audio, ...(incoming.audio ?? {}) },
            timer: { ...base.timer, ...(incoming.timer ?? {}) },
          };
        }
        return {
          ...base,
          ...incoming,
          lastGeneratedSharingan: incoming.lastGeneratedSharingan ?? null,
          forgedEyesInventory: incoming.forgedEyesInventory ?? [],
          equippedForgedEyeId: incoming.equippedForgedEyeId ?? null,
          activeOcularPowers: incoming.activeOcularPowers ?? null,
          activeJutsuCooldownCyclesRemaining:
            incoming.activeJutsuCooldownCyclesRemaining ?? 0,
        };
      },
      onRehydrateStorage: () => (rehydratedState) => {
        if (!rehydratedState) return;
        rehydratedState.setHasHydrated(true);
        audioEngine.syncSettings(rehydratedState.audio);
        if (
          rehydratedState.customEye.enabled &&
          rehydratedState.activeOcularPowers
        ) {
          audioEngine.setCustomPitchRate(
            rehydratedState.activeOcularPowers.visualThemeSignature
              .audioPitchRate,
          );
        }

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

export const useSusanooStageOverride = () =>
  useTsukuyomiStore((state) => state.susanooStageOverride);

export const useIsBetaFullAccess = () =>
  useTsukuyomiStore((state) => state.isBetaFullAccess);

export const useTsukuyomiCastNonce = () =>
  useTsukuyomiStore((state) => state.tsukuyomiCastNonce);

export const useOcularSpinBurstNonce = () =>
  useTsukuyomiStore((state) => state.ocularSpinBurstNonce);

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
      susanooStageOverride: state.susanooStageOverride,
      isBetaFullAccess: state.isBetaFullAccess,
    })),
  );

export const useAudioSettings = () =>
  useTsukuyomiStore((state) => state.audio);

export const useForgedEyesInventory = () =>
  useTsukuyomiStore((state) => state.forgedEyesInventory);

export const useEquippedForgedEyeId = () =>
  useTsukuyomiStore((state) => state.equippedForgedEyeId);

export const useActiveOcularPowers = () =>
  useTsukuyomiStore((state) => state.activeOcularPowers);

export const useOcularJutsuState = () =>
  useTsukuyomiStore(
    useShallow((state) => ({
      tsukuyomiOverdriveActive: state.tsukuyomiOverdriveActive,
      activeJutsuCooldownCyclesRemaining:
        state.activeJutsuCooldownCyclesRemaining,
      activeJutsuUsedInCurrentCycle: state.activeJutsuUsedInCurrentCycle,
    })),
  );
