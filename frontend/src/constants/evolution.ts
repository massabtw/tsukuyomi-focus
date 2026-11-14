import type {
  EyeStage,
  EyeStageDefinition,
  MangekyouVariant,
  MangekyouVariantInfo,
} from '@/types/tsukuyomi';

export const EYE_STAGES: readonly EyeStageDefinition[] = [
  {
    stage: 'normal',
    order: 0,
    name: 'Olho Comum',
    subtitle: 'Despertar Latente',
    requiredChakra: 0,
    estimatedHours: 0,
    lore: 'A mente antes da primeira ilusão. Acumule Chakra para romper o selo inicial.',
  },
  {
    stage: 'tomoe_1',
    order: 1,
    name: 'Sharingan — 1 Tomoe',
    subtitle: 'Percepção Nascente',
    requiredChakra: 1200,
    estimatedHours: 2,
    lore: 'O primeiro redemoinho carmesim se abre, filtrando distrações superficiais.',
  },
  {
    stage: 'tomoe_2',
    order: 2,
    name: 'Sharingan — 2 Tomoes',
    subtitle: 'Leitura de Fluxo',
    requiredChakra: 4800,
    estimatedHours: 8,
    lore: 'Os movimentos da tarefa tornam-se previsíveis antes mesmo do primeiro erro.',
  },
  {
    stage: 'tomoe_3',
    order: 3,
    name: 'Sharingan — 3 Tomoes',
    subtitle: 'Domínio Ocular Pleno',
    requiredChakra: 12000,
    estimatedHours: 20,
    lore: 'A forma madura do Sharingan. Clareza absoluta sob pressão prolongada.',
  },
  {
    stage: 'mangekyou',
    order: 4,
    name: 'Mangekyou Sharingan',
    subtitle: 'O Olho Caleidoscópico',
    requiredChakra: 24000,
    estimatedHours: 40,
    alternativeStreakRequirement: 7,
    lore: 'Despertado por 24.000 Chakra ou pela devoção implacável de 7 dias seguidos.',
  },
  {
    stage: 'ems',
    order: 5,
    name: 'Mangekyou Eterno',
    subtitle: 'Luz Imortal',
    requiredChakra: 72000,
    estimatedHours: 120,
    lore: 'As lâminas se fundem em um selo eterno que jamais perde o brilho.',
  },
  {
    stage: 'rinnegan',
    order: 6,
    name: 'Rinnegan',
    subtitle: 'Olho da Reencarnação',
    requiredChakra: 180000,
    estimatedHours: 300,
    lore: 'O ápice absoluto registrado na Tábua de Pedra do Santuário Naka.',
  },
];

export const EYE_STAGE_MAP: Record<EyeStage, EyeStageDefinition> =
  EYE_STAGES.reduce(
    (acc, def) => {
      acc[def.stage] = def;
      return acc;
    },
    {} as Record<EyeStage, EyeStageDefinition>,
  );

export const MANGEKYOU_VARIANTS: readonly MangekyouVariantInfo[] = [
  {
    variant: 'itachi',
    wielder: 'Itachi Uchiha',
    jutsuName: 'Tsukuyomi & Amaterasu',
    description: 'Três lâminas curvas convergindo em um vértice implacável.',
  },
  {
    variant: 'sasuke',
    wielder: 'Sasuke Uchiha',
    jutsuName: 'Kagutsuchi & Chamas Negras',
    description: 'Hexagrama atômico invertido de simetria cortante.',
  },
  {
    variant: 'shisui',
    wielder: 'Shisui Uchiha',
    jutsuName: 'Kotoamatsukami',
    description: 'Catavento de quatro pontas da ilusão suprema imperceptível.',
  },
  {
    variant: 'obito',
    wielder: 'Obito Uchiha',
    jutsuName: 'Kamui',
    description: 'Espiral dimensional de três ganchos rasgando o espaço-tempo.',
  },
  {
    variant: 'madara',
    wielder: 'Madara Uchiha',
    jutsuName: 'Susanoo Perfeito & Limbo',
    description: 'Três esferas conectadas por anéis contínuos de poder ancestral.',
  },
];

export const MANGEKYOU_VARIANT_MAP: Record<
  MangekyouVariant,
  MangekyouVariantInfo
> = MANGEKYOU_VARIANTS.reduce(
  (acc, info) => {
    acc[info.variant] = info;
    return acc;
  },
  {} as Record<MangekyouVariant, MangekyouVariantInfo>,
);
