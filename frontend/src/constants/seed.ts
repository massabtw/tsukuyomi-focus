import { RANK_DEFINITIONS } from '@/constants/ranks';
import { addDays, formatLocalDate } from '@/lib/date';
import {
  calculateSessionChakra,
  getHighestUnlockedEyeStage,
} from '@/lib/gamification';
import type {
  FocusSessionLog,
  Mission,
  TsukuyomiState,
} from '@/types/tsukuyomi';

export function createInitialSeedState(
  referenceDate: string = formatLocalDate(),
): TsukuyomiState {
  const today = referenceDate;
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);
  const fourDaysAgo = addDays(today, -4);
  const sixDaysAgo = addDays(today, -6);

  const missions: Mission[] = [
    {
      id: 'seed-mission-s-amaterasu',
      title: 'Refatorar Motor de Genjutsu (Arquitetura Core)',
      description:
        'Executar bloco profundo sem distrações para fechar a entrega crítica de hoje sob o selo do Amaterasu.',
      rank: 'S',
      status: 'todo',
      estimatedMinutes: 90,
      completedMinutes: 0,
      isAmaterasu: true,
      amaterasuDate: today,
      createdAt: `${today}T08:00:00.000Z`,
      completedAt: null,
    },
    {
      id: 'seed-mission-a-tsukuyomi',
      title: 'Auditoria de Performance & Estado Global',
      description:
        'Eliminar re-renders desnecessários e blindar persistência da store no Tsukuyomi.',
      rank: 'A',
      status: 'in_tsukuyomi',
      estimatedMinutes: 75,
      completedMinutes: 50,
      isAmaterasu: false,
      amaterasuDate: null,
      createdAt: `${yesterday}T10:30:00.000Z`,
      completedAt: null,
    },
    {
      id: 'seed-mission-b-kanban',
      title: 'Documentar Protocolos do Santuário Naka',
      description:
        'Estruturar contratos e critérios de revisão para os próximos ciclos da equipe.',
      rank: 'B',
      status: 'todo',
      estimatedMinutes: 50,
      completedMinutes: 0,
      isAmaterasu: false,
      amaterasuDate: null,
      createdAt: `${twoDaysAgo}T14:00:00.000Z`,
      completedAt: null,
    },
    {
      id: 'seed-mission-d-completed',
      title: 'Calibrar Ambiente Sonoro de Amegakure',
      description:
        'Ajustar níveis de chuva, vento noturno e frequência binaural antes do treino.',
      rank: 'D',
      status: 'completed',
      estimatedMinutes: 25,
      completedMinutes: 25,
      isAmaterasu: false,
      amaterasuDate: null,
      createdAt: `${threeDaysAgo}T09:15:00.000Z`,
      completedAt: `${threeDaysAgo}T09:45:00.000Z`,
    },
  ];

  const sessionLogs: FocusSessionLog[] = [
    {
      id: 'seed-log-1',
      missionId: 'seed-mission-a-tsukuyomi',
      missionTitle: 'Auditoria de Performance & Estado Global',
      rank: 'A',
      durationMinutes: 50,
      chakraEarned: calculateSessionChakra({
        durationMinutes: 50,
        rank: 'A',
        isAmaterasu: false,
        usedSusanoo: true,
      }),
      wasCompleted: true,
      usedSusanoo: true,
      isAmaterasu: false,
      timestamp: `${yesterday}T19:20:00.000Z`,
      date: yesterday,
    },
    {
      id: 'seed-log-2',
      missionId: 'seed-mission-b-kanban',
      missionTitle: 'Documentar Protocolos do Santuário Naka',
      rank: 'B',
      durationMinutes: 50,
      chakraEarned: calculateSessionChakra({
        durationMinutes: 50,
        rank: 'B',
        isAmaterasu: false,
        usedSusanoo: false,
      }),
      wasCompleted: true,
      usedSusanoo: false,
      isAmaterasu: false,
      timestamp: `${twoDaysAgo}T16:40:00.000Z`,
      date: twoDaysAgo,
    },
    {
      id: 'seed-log-3',
      missionId: 'seed-mission-d-completed',
      missionTitle: 'Calibrar Ambiente Sonoro de Amegakure',
      rank: 'D',
      durationMinutes: 25,
      chakraEarned: calculateSessionChakra({
        durationMinutes: 25,
        rank: 'D',
        isAmaterasu: false,
        usedSusanoo: false,
      }),
      wasCompleted: true,
      usedSusanoo: false,
      isAmaterasu: false,
      timestamp: `${threeDaysAgo}T09:45:00.000Z`,
      date: threeDaysAgo,
    },
    {
      id: 'seed-log-4',
      missionId: null,
      missionTitle: 'Treino de Resistência Mental — Ciclo C',
      rank: 'C',
      durationMinutes: 35,
      chakraEarned: calculateSessionChakra({
        durationMinutes: 35,
        rank: 'C',
        isAmaterasu: false,
        usedSusanoo: true,
      }),
      wasCompleted: true,
      usedSusanoo: true,
      isAmaterasu: false,
      timestamp: `${fourDaysAgo}T21:10:00.000Z`,
      date: fourDaysAgo,
    },
    {
      id: 'seed-log-5',
      missionId: null,
      missionTitle: 'Incursão Interrompida na Fronteira',
      rank: 'B',
      durationMinutes: 18,
      chakraEarned: 0,
      wasCompleted: false,
      usedSusanoo: false,
      isAmaterasu: false,
      timestamp: `${sixDaysAgo}T15:05:00.000Z`,
      date: sixDaysAgo,
    },
  ];

  const totalSeedChakra = sessionLogs.reduce(
    (sum, log) => sum + log.chakraEarned,
    0,
  );
  const longestStreak = 4;
  const highestEye = getHighestUnlockedEyeStage(totalSeedChakra, longestStreak);
  const activeMission = missions.find((m) => m.status === 'in_tsukuyomi') ?? null;
  const initialDurationSeconds =
    (activeMission
      ? activeMission.estimatedMinutes
      : RANK_DEFINITIONS.A.suggestedMinutes) * 60;

  return {
    hasHydrated: false,
    activeTab: 'temple',
    chakra: totalSeedChakra,
    currentEyeStage: highestEye,
    equippedEyeStage: highestEye,
    mangekyouVariant: 'itachi',
    streak: 4,
    longestStreak,
    lastFocusDate: yesterday,
    lastDailyCheckDate: today,
    visualBlurLevel: 0,
    isTsukuyomiMode: false,
    izanagi: {
      leftEyeBlind: false,
      rightEyeBlind: false,
      restorationProgressMinutes: 0,
      totalTimesUsed: 0,
    },
    missions,
    sessionLogs,
    customEye: {
      enabled: false,
      imageDataUrl: null,
      scale: 1,
      glowIntensity: 0.75,
    },
    audio: {
      muted: false,
      sfxVolume: 0.7,
      rainVolume: 0,
      windVolume: 0,
      binauralVolume: 0,
    },
    timer: {
      status: 'idle',
      mode: 'focus',
      durationSeconds: initialDurationSeconds,
      remainingSeconds: initialDurationSeconds,
      targetEndTime: null,
      activeMissionId: activeMission?.id ?? null,
      susanooEnabled: false,
    },
    pendingAwakening: null,
    pendingAmaterasuPenalty: null,
    pendingIzanagiRescue: null,
    izanagiFlashNonce: 0,
  };
}
