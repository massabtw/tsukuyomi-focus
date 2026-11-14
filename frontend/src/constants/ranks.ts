import type { MissionRank, RankDefinition } from '@/types/tsukuyomi';

export const RANK_ORDER: readonly MissionRank[] = ['D', 'C', 'B', 'A', 'S'];

export const RANK_DEFINITIONS: Record<MissionRank, RankDefinition> = {
  D: {
    rank: 'D',
    label: 'Rank D',
    title: 'Tarefa Genin',
    suggestedMinutes: 25,
    multiplier: 1.0,
    badgeColor: '#A1A1AA',
    borderColor: '#52525B',
    glowColor: 'rgba(161, 161, 170, 0.2)',
    description: 'Ciclo rápido de entrada, revisão leve ou manutenção rotineira.',
  },
  C: {
    rank: 'C',
    label: 'Rank C',
    title: 'Escolta Chunin',
    suggestedMinutes: 35,
    multiplier: 1.2,
    badgeColor: '#D4D4D8',
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    description: 'Implementação estruturada com foco contínuo moderado.',
  },
  B: {
    rank: 'B',
    label: 'Rank B',
    title: 'Incursão Jounin',
    suggestedMinutes: 50,
    multiplier: 1.5,
    badgeColor: '#60A5FA',
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.28)',
    description: 'Bloco sólido de deep work para arquitetura ou depuração crítica.',
  },
  A: {
    rank: 'A',
    label: 'Rank A',
    title: 'Operação ANBU',
    suggestedMinutes: 75,
    multiplier: 2.0,
    badgeColor: '#FBBF24',
    borderColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.32)',
    description: 'Missão de alta complexidade exigindo imersão prolongada.',
  },
  S: {
    rank: 'S',
    label: 'Rank S',
    title: 'Proscrito Uchiha',
    suggestedMinutes: 90,
    multiplier: 3.0,
    badgeColor: '#EF4444',
    borderColor: '#DC2626',
    glowColor: 'rgba(220, 38, 38, 0.45)',
    description: 'Desafio máximo. Recompensa extrema para domínio absoluto.',
  },
};

export const AMATERASU_MULTIPLIER = 2.0;
export const SUSANOO_MULTIPLIER = 1.25;
export const AMATERASU_PENALTY_CHAKRA = 300;
export const IZANAGI_RESTORATION_MINUTES = 180;
export const SUSANOO_MIN_RECOMMENDED_MINUTES = 50;
export const SUSANOO_BREAK_PHRASE =
  'Eu aceito quebrar meu Susanoo e perder Chakra';

export const TIMER_PRESETS_MINUTES = {
  focus: [25, 50, 90] as const,
  shortBreak: [5, 10] as const,
  longBreak: [15] as const,
};
