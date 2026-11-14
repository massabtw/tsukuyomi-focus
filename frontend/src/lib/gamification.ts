import { EYE_STAGE_MAP, EYE_STAGES } from '@/constants/evolution';
import {
  AMATERASU_MULTIPLIER,
  IZANAGI_RESTORATION_MINUTES,
  RANK_DEFINITIONS,
  RANK_ORDER,
  SUSANOO_MULTIPLIER,
} from '@/constants/ranks';
import {
  formatLocalDate,
  getLastNDays,
  getYesterdayLocalDate,
} from '@/lib/date';
import type {
  EyeStage,
  EyeStageDefinition,
  FocusSessionLog,
  HeatmapDayCell,
  IzanagiState,
  Mission,
  MissionRank,
  RankDistributionEntry,
  ScrollStatsSummary,
  VisualBlurLevel,
} from '@/types/tsukuyomi';

export interface ChakraCalculationInput {
  durationMinutes: number;
  rank: MissionRank;
  isAmaterasu: boolean;
  usedSusanoo: boolean;
}

export function calculateSessionChakra({
  durationMinutes,
  rank,
  isAmaterasu,
  usedSusanoo,
}: ChakraCalculationInput): number {
  if (durationMinutes <= 0) return 0;
  const rankMultiplier = RANK_DEFINITIONS[rank].multiplier;
  const amaterasuMultiplier = isAmaterasu ? AMATERASU_MULTIPLIER : 1.0;
  const susanooMultiplier = usedSusanoo ? SUSANOO_MULTIPLIER : 1.0;

  return Math.round(
    durationMinutes *
      10 *
      rankMultiplier *
      amaterasuMultiplier *
      susanooMultiplier,
  );
}

export function isEyeStageUnlocked(
  stage: EyeStage,
  chakra: number,
  longestStreak: number,
  isBetaFullAccess = true,
): boolean {
  if (isBetaFullAccess) {
    return true;
  }
  const def = EYE_STAGE_MAP[stage];
  if (chakra >= def.requiredChakra) {
    return true;
  }
  if (
    def.alternativeStreakRequirement !== undefined &&
    longestStreak >= def.alternativeStreakRequirement
  ) {
    return true;
  }
  return false;
}

export function getHighestUnlockedEyeStage(
  chakra: number,
  longestStreak: number,
  isBetaFullAccess = false,
): EyeStage {
  let highest: EyeStage = 'normal';
  for (const def of EYE_STAGES) {
    if (isEyeStageUnlocked(def.stage, chakra, longestStreak, isBetaFullAccess)) {
      highest = def.stage;
    }
  }
  return highest;
}

export interface NextEyeStageInfo {
  currentDefinition: EyeStageDefinition;
  nextDefinition: EyeStageDefinition | null;
  progressPercent: number;
  chakraRemaining: number;
  isMaxed: boolean;
}

export function getNextEyeStageInfo(
  currentStage: EyeStage,
  chakra: number,
  longestStreak: number,
  isBetaFullAccess = false,
): NextEyeStageInfo {
  const currentDefinition = EYE_STAGE_MAP[currentStage];
  const nextDefinition =
    EYE_STAGES.find((item) => item.order === currentDefinition.order + 1) ??
    null;

  if (!nextDefinition) {
    return {
      currentDefinition,
      nextDefinition: null,
      progressPercent: 100,
      chakraRemaining: 0,
      isMaxed: true,
    };
  }

  if (
    isEyeStageUnlocked(
      nextDefinition.stage,
      chakra,
      longestStreak,
      isBetaFullAccess,
    )
  ) {
    return {
      currentDefinition,
      nextDefinition,
      progressPercent: 100,
      chakraRemaining: 0,
      isMaxed: false,
    };
  }

  const baseChakra = currentDefinition.requiredChakra;
  const targetChakra = nextDefinition.requiredChakra;
  const span = Math.max(1, targetChakra - baseChakra);
  const gained = Math.max(0, chakra - baseChakra);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((gained / span) * 100)),
  );

  return {
    currentDefinition,
    nextDefinition,
    progressPercent,
    chakraRemaining: Math.max(0, targetChakra - chakra),
    isMaxed: false,
  };
}

export function getVisualAcuityPercent(
  visualBlurLevel: VisualBlurLevel,
): 100 | 85 | 70 | 50 {
  switch (visualBlurLevel) {
    case 0:
      return 100;
    case 1:
      return 85;
    case 2:
      return 70;
    case 3:
      return 50;
  }
}

export function getVisualBlurClass(visualBlurLevel: VisualBlurLevel): string {
  switch (visualBlurLevel) {
    case 0:
      return 'blur-[0px]';
    case 1:
      return 'blur-[1px]';
    case 2:
      return 'blur-[2px]';
    case 3:
      return 'blur-[3.5px]';
  }
}

export function computeStreakOnCompletion({
  streak,
  longestStreak,
  lastFocusDate,
  today = formatLocalDate(),
}: {
  streak: number;
  longestStreak: number;
  lastFocusDate: string | null;
  today?: string;
}): { streak: number; longestStreak: number; lastFocusDate: string } {
  const yesterday = getYesterdayLocalDate(today);
  let nextStreak = 1;

  if (lastFocusDate === today) {
    nextStreak = Math.max(1, streak);
  } else if (lastFocusDate === yesterday) {
    nextStreak = Math.max(0, streak) + 1;
  }

  return {
    streak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastFocusDate: today,
  };
}

export function canInvokeIzanagi(izanagi: IzanagiState): boolean {
  return !izanagi.leftEyeBlind || !izanagi.rightEyeBlind;
}

export function blindNextHealthyEye(izanagi: IzanagiState): IzanagiState | null {
  if (!canInvokeIzanagi(izanagi)) {
    return null;
  }
  const blindRightNext = !izanagi.rightEyeBlind;
  return {
    leftEyeBlind: blindRightNext ? izanagi.leftEyeBlind : true,
    rightEyeBlind: blindRightNext ? true : izanagi.rightEyeBlind,
    restorationProgressMinutes: izanagi.restorationProgressMinutes,
    totalTimesUsed: izanagi.totalTimesUsed + 1,
  };
}

export function applyIzanagiRestoration(
  izanagi: IzanagiState,
  durationMinutes: number,
): IzanagiState {
  if (durationMinutes <= 0) {
    return izanagi;
  }
  if (!izanagi.leftEyeBlind && !izanagi.rightEyeBlind) {
    if (izanagi.restorationProgressMinutes === 0) {
      return izanagi;
    }
    return {
      ...izanagi,
      restorationProgressMinutes: 0,
    };
  }

  let rightEyeBlind = izanagi.rightEyeBlind;
  let leftEyeBlind = izanagi.leftEyeBlind;
  let progress = izanagi.restorationProgressMinutes + durationMinutes;

  while (
    progress >= IZANAGI_RESTORATION_MINUTES &&
    (rightEyeBlind || leftEyeBlind)
  ) {
    progress -= IZANAGI_RESTORATION_MINUTES;
    if (rightEyeBlind) {
      rightEyeBlind = false;
    } else if (leftEyeBlind) {
      leftEyeBlind = false;
    }
  }

  if (!rightEyeBlind && !leftEyeBlind) {
    progress = 0;
  }

  return {
    ...izanagi,
    rightEyeBlind,
    leftEyeBlind,
    restorationProgressMinutes: progress,
  };
}

export function sortMissionsAmaterasuFirst(missions: Mission[]): Mission[] {
  const amaterasu: Mission[] = [];
  const regular: Mission[] = [];
  for (const mission of missions) {
    if (mission.isAmaterasu) {
      amaterasu.push(mission);
    } else {
      regular.push(mission);
    }
  }
  return [...amaterasu, ...regular];
}

export function getHeatmapIntensityLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

export function buildUchihaHeatmapDays(
  sessionLogs: FocusSessionLog[],
  days = 365,
  endDateStr: string = formatLocalDate(),
): HeatmapDayCell[] {
  const dayMap = new Map<
    string,
    { minutes: number; chakra: number; sessions: number }
  >();

  for (const log of sessionLogs) {
    if (!log.wasCompleted) continue;
    const prev = dayMap.get(log.date);
    if (prev) {
      prev.minutes += log.durationMinutes;
      prev.chakra += log.chakraEarned;
      prev.sessions += 1;
    } else {
      dayMap.set(log.date, {
        minutes: log.durationMinutes,
        chakra: log.chakraEarned,
        sessions: 1,
      });
    }
  }

  const dates = getLastNDays(days, endDateStr);
  return dates.map((date) => {
    const entry = dayMap.get(date);
    const minutes = entry?.minutes ?? 0;
    return {
      date,
      minutes,
      chakra: entry?.chakra ?? 0,
      sessions: entry?.sessions ?? 0,
      level: getHeatmapIntensityLevel(minutes),
    };
  });
}

export function computeScrollStats(
  missions: Mission[],
  sessionLogs: FocusSessionLog[],
): ScrollStatsSummary {
  const rankMap = new Map<MissionRank, RankDistributionEntry>();
  for (const rank of RANK_ORDER) {
    rankMap.set(rank, {
      rank,
      completedMissions: 0,
      completedSessions: 0,
      totalMinutes: 0,
    });
  }

  let amaterasuCompletedCount = 0;
  for (const mission of missions) {
    if (mission.status === 'completed') {
      const rankStats = rankMap.get(mission.rank);
      if (rankStats) {
        rankStats.completedMissions += 1;
      }
      if (mission.isAmaterasu) {
        amaterasuCompletedCount += 1;
      }
    }
  }

  let totalFocusMinutes = 0;
  let totalChakraEarned = 0;
  let completedSessions = 0;
  let abandonedSessions = 0;
  let susanooCompletedCount = 0;

  for (const log of sessionLogs) {
    if (log.wasCompleted) {
      completedSessions += 1;
      totalFocusMinutes += log.durationMinutes;
      totalChakraEarned += log.chakraEarned;
      if (log.usedSusanoo) {
        susanooCompletedCount += 1;
      }
      const rankStats = rankMap.get(log.rank);
      if (rankStats) {
        rankStats.completedSessions += 1;
        rankStats.totalMinutes += log.durationMinutes;
      }
    } else {
      abandonedSessions += 1;
    }
  }

  const totalSessions = completedSessions + abandonedSessions;
  const accuracyPercent =
    totalSessions === 0
      ? 100
      : Math.round((completedSessions / totalSessions) * 100);

  return {
    totalFocusMinutes,
    totalChakraEarned,
    completedSessions,
    abandonedSessions,
    accuracyPercent,
    amaterasuCompletedCount,
    susanooCompletedCount,
    rankDistribution: RANK_ORDER.map(
      (rank) => rankMap.get(rank) as RankDistributionEntry,
    ),
  };
}
