export type MissionRank = 'D' | 'C' | 'B' | 'A' | 'S';

export type MissionStatus = 'todo' | 'in_tsukuyomi' | 'completed';

export type EyeStage =
  | 'normal'
  | 'tomoe_1'
  | 'tomoe_2'
  | 'tomoe_3'
  | 'mangekyou'
  | 'ems'
  | 'rinnegan';

export type MangekyouVariant =
  | 'itachi'
  | 'sasuke'
  | 'shisui'
  | 'obito'
  | 'madara';

export type ActiveTab = 'temple' | 'kanban' | 'shrine' | 'scroll';

export type TimerMode = 'focus' | 'short_break' | 'long_break';

export type TimerStatus = 'idle' | 'running' | 'paused';

export type VisualBlurLevel = 0 | 1 | 2 | 3;

export type IzanagiTriggerContext = 'abandon_cycle' | 'streak_rescue';

export type SusanooStageOverride = 'auto' | 1 | 2 | 3;

export interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  durationSeconds: number;
  remainingSeconds: number;
  targetEndTime: number | null;
  activeMissionId: string | null;
  susanooEnabled: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rank: MissionRank;
  status: MissionStatus;
  estimatedMinutes: number;
  completedMinutes: number;
  isAmaterasu: boolean;
  amaterasuDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateMissionInput {
  title: string;
  description?: string;
  rank: MissionRank;
  estimatedMinutes?: number;
  isAmaterasu?: boolean;
  status?: MissionStatus;
}

export interface FocusSessionLog {
  id: string;
  missionId: string | null;
  missionTitle: string;
  rank: MissionRank;
  durationMinutes: number;
  chakraEarned: number;
  wasCompleted: boolean;
  usedSusanoo: boolean;
  isAmaterasu: boolean;
  timestamp: string;
  date: string;
}

export interface IzanagiState {
  leftEyeBlind: boolean;
  rightEyeBlind: boolean;
  restorationProgressMinutes: number;
  totalTimesUsed: number;
}

export interface CustomEyeConfig {
  enabled: boolean;
  imageDataUrl: string | null;
  scale: number;
  glowIntensity: number;
}

export interface AudioSettings {
  muted: boolean;
  sfxVolume: number;
  rainVolume: number;
  windVolume: number;
  binauralVolume: number;
}

export interface AmaterasuPenalty {
  missionId: string;
  missionTitle: string;
  chakraLost: number;
  failedDate: string;
}

export interface PendingIzanagiRescue {
  previousStreak: number;
  missedDate: string;
}

export interface RankDefinition {
  rank: MissionRank;
  label: string;
  title: string;
  suggestedMinutes: number;
  multiplier: number;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
}

export interface EyeStageDefinition {
  stage: EyeStage;
  order: number;
  name: string;
  subtitle: string;
  requiredChakra: number;
  estimatedHours: number;
  alternativeStreakRequirement?: number;
  lore: string;
}

export interface MangekyouVariantInfo {
  variant: MangekyouVariant;
  wielder: string;
  jutsuName: string;
  description: string;
}

export interface HeatmapDayCell {
  date: string;
  minutes: number;
  chakra: number;
  sessions: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface RankDistributionEntry {
  rank: MissionRank;
  completedMissions: number;
  completedSessions: number;
  totalMinutes: number;
}

export interface ScrollStatsSummary {
  totalFocusMinutes: number;
  totalChakraEarned: number;
  completedSessions: number;
  abandonedSessions: number;
  accuracyPercent: number;
  amaterasuCompletedCount: number;
  susanooCompletedCount: number;
  rankDistribution: RankDistributionEntry[];
}

export interface TsukuyomiState {
  hasHydrated: boolean;
  activeTab: ActiveTab;
  chakra: number;
  currentEyeStage: EyeStage;
  equippedEyeStage: EyeStage;
  mangekyouVariant: MangekyouVariant;
  isBetaFullAccess: boolean;
  susanooStageOverride: SusanooStageOverride;
  streak: number;
  longestStreak: number;
  lastFocusDate: string | null;
  lastDailyCheckDate: string | null;
  visualBlurLevel: VisualBlurLevel;
  isTsukuyomiMode: boolean;
  izanagi: IzanagiState;
  missions: Mission[];
  sessionLogs: FocusSessionLog[];
  customEye: CustomEyeConfig;
  audio: AudioSettings;
  timer: TimerState;
  pendingAwakening: EyeStage | null;
  pendingAmaterasuPenalty: AmaterasuPenalty | null;
  pendingIzanagiRescue: PendingIzanagiRescue | null;
  izanagiFlashNonce: number;
  tsukuyomiCastNonce: number;
  ocularSpinBurstNonce: number;
}

export interface TsukuyomiActions {
  setHasHydrated: (hydrated: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  toggleTsukuyomiMode: (force?: boolean) => void;

  setTimerMode: (mode: TimerMode, customDurationSeconds?: number) => void;
  setTimerDuration: (minutes: number) => void;
  setSusanooEnabled: (enabled: boolean) => void;
  setSusanooStageOverride: (override: SusanooStageOverride) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  syncTimerTick: (nowMs?: number) => void;
  completeActiveCycle: () => void;
  abandonActiveCycle: (options?: { useIzanagi?: boolean }) => void;

  addMission: (input: CreateMissionInput) => Mission;
  updateMission: (
    id: string,
    patch: Partial<Omit<Mission, 'id' | 'createdAt'>>,
  ) => void;
  deleteMission: (id: string) => void;
  moveMission: (
    id: string,
    targetStatus: MissionStatus,
    targetIndex?: number,
  ) => void;
  reorderMissionsInColumn: (
    status: MissionStatus,
    activeId: string,
    overId: string,
  ) => void;
  toggleMissionAmaterasu: (id: string) => { ok: boolean; reason?: string };
  dragMissionToTsukuyomi: (id: string) => void;
  setActiveMission: (id: string | null) => void;

  runDailyChecks: (today?: string) => void;
  dismissAmaterasuPenalty: () => void;
  resolveStreakRescueWithIzanagi: () => boolean;
  declineStreakRescue: () => void;
  invokeIzanagi: (context: IzanagiTriggerContext) => boolean;

  equipEyeStage: (stage: EyeStage) => void;
  setMangekyouVariant: (variant: MangekyouVariant) => void;
  setBetaFullAccess: (enabled: boolean) => void;
  triggerOcularSpinBurst: () => void;
  triggerTsukuyomiCastCutscene: () => void;
  dismissPendingAwakening: () => void;
  updateCustomEye: (patch: Partial<CustomEyeConfig>) => void;

  updateAudioSettings: (patch: Partial<AudioSettings>) => void;

  devAddChakra: (amount: number) => void;
  devUnlockAllEyes: () => void;
  devTriggerAwakening: (stage: EyeStage) => void;
  devToggleEyeBlindness: (eye: 'left' | 'right') => void;
  devSimulateDayTurnWithAmaterasu: () => void;
  devResetToSeed: () => void;
}

export type TsukuyomiStore = TsukuyomiState & TsukuyomiActions;
