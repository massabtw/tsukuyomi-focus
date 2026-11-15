import type {
  EyeStage,
  MangekyouVariant,
  MissionRank,
  MissionStatus,
} from '@/types/tsukuyomi';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5132'
).replace(/\/+$/, '');

const GUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(value: string | null | undefined): value is string {
  return Boolean(value && GUID_REGEX.test(value));
}

export interface ApiIzanagiDto {
  leftEyeBlind: boolean;
  rightEyeBlind: boolean;
  restorationRequiredMinutes: number;
  restorationProgressMinutes: number;
  lastUsedDate: string | null;
  totalTimesUsed: number;
}

export interface ApiProfileDto {
  id: string;
  username: string;
  totalChakra: number;
  totalFocusMinutes: number;
  currentEyeStage: EyeStage;
  equippedEyeStage: EyeStage;
  mangekyouVariant: MangekyouVariant;
  customEyeImageUrl: string | null;
  visualBlurLevel: number;
  currentStreak: number;
  bestStreak: number;
  lastFocusDate: string | null;
  updatedAt: string;
}

export interface ApiMissionDto {
  id: string;
  title: string;
  description: string | null;
  rank: MissionRank;
  status: MissionStatus;
  estimatedMinutes: number;
  completedMinutes: number;
  completedCycles: number;
  isAmaterasu: boolean;
  amaterasuDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiFocusSessionLogDto {
  id: string;
  missionId: string | null;
  missionTitle: string | null;
  rank: MissionRank | null;
  durationMinutes: number;
  chakraEarned: number;
  wasSusanooActive: boolean;
  wasCompleted: boolean;
  date: string;
  timestamp: string;
}

export interface ApiAppStateResponseDto {
  profile: ApiProfileDto;
  izanagi: ApiIzanagiDto;
  missions: ApiMissionDto[];
  recentLogs: ApiFocusSessionLogDto[];
  amaterasuPenaltyApplied: boolean;
  amaterasuPenaltyChakra: number;
  expiredAmaterasuMissions: string[];
}

export interface ApiDailyCheckResponseDto {
  amaterasuPenaltyApplied: boolean;
  amaterasuPenaltyChakra: number;
  expiredAmaterasuMissions: string[];
  profile: ApiProfileDto;
}

export interface ApiEyeCustomizationPayload {
  equippedEyeStage?: EyeStage;
  mangekyouVariant?: MangekyouVariant;
  customEyeImageUrl?: string | null;
  clearCustomEyeImage?: boolean;
}

export interface ApiDevSimulatePayload {
  addChakra?: number;
  unlockAllEyes?: boolean;
  resetBlindness?: boolean;
  simulateLeftEyeBlind?: boolean;
  simulateRightEyeBlind?: boolean;
  setVisualBlurLevel?: number;
  setCurrentStreak?: number;
}

export type SharinganOutputFormat =
  | 'anime_svg'
  | 'photo_lens'
  | 'svg'
  | 'raster';

export interface ApiGenerateSharinganPayload {
  prompt?: string;
  baseEyeImageBase64?: string | null;
  styleVariant: MangekyouVariant | 'custom';
  outputFormat: SharinganOutputFormat;
  autoEquip: boolean;
}

export interface ApiLeftEyePassiveDto {
  type:
    | 'CHAKRA_MULTIPLIER'
    | 'AMATERASU_MASTERY'
    | 'IZANAGI_REGEN'
    | 'TIME_DILATION'
    | 'VISUAL_IMMUNITY';
  name: string;
  description: string;
  bonusValue: number;
}

export interface ApiRightEyeActiveJutsuDto {
  type:
    | 'KAMUI_SKIP'
    | 'TSUKUYOMI_OVERDRIVE'
    | 'KOTOAMATSUKAMI_COMPLETE'
    | 'SHINRA_TENSEI_PURGE';
  name: string;
  description: string;
  cooldownCycles: number;
}

export interface ApiVisualThemeSignatureDto {
  primaryGlowColor: string;
  secondaryColor: string;
  audioPitchRate: number;
}

export interface ApiOcularPowersDto {
  rarity: 'Rank A' | 'Rank S' | 'Rank SS - Divino';
  leftEyePassive: ApiLeftEyePassiveDto;
  rightEyeActiveJutsu: ApiRightEyeActiveJutsuDto;
  visualThemeSignature: ApiVisualThemeSignatureDto;
}

export interface ApiGenerateSharinganResponseDto {
  doujutsuName: string;
  loreDescription: string;
  detectedMood: string;
  eyeCenterX: number;
  eyeCenterY: number;
  irisRadiusRatio: number;
  bladeCount: number;
  patternType: string;
  centerShape?: string;
  bladeStyle?: string;
  outerRingStyle?: string;
  primaryCrimsonHex: string;
  secondaryDarkHex: string;
  hasAmaterasuFlames: boolean;
  rotationOffset: number;
  rawSvgCode: string;
  svgDataUri: string;
  rasterImageUrl: string;
  primaryGlowColor: string;
  ocularPowers?: ApiOcularPowersDto;
  equippedImageUrl: string;
  autoEquipped: boolean;
  profile: ApiProfileDto | null;
}

export interface ApiCreateMissionPayload {
  title: string;
  description?: string;
  rank: MissionRank;
  estimatedMinutes?: number;
  isAmaterasu: boolean;
}

export interface ApiUpdateMissionPayload {
  title: string;
  description?: string;
  rank: MissionRank;
  estimatedMinutes?: number;
}

export interface ApiCompleteSessionPayload {
  missionId?: string | null;
  durationMinutes: number;
  wasSusanooActive: boolean;
  markMissionCompleted: boolean;
}

export interface ApiCompleteSessionResponseDto {
  session: ApiFocusSessionLogDto;
  profile: ApiProfileDto;
  izanagi: ApiIzanagiDto;
  updatedMission: ApiMissionDto | null;
  chakraEarned: number;
  unlockedNewEyeStage: boolean;
  newEyeStage: EyeStage | null;
  eyeRestored: boolean;
}

export interface ApiAbandonSessionPayload {
  missionId?: string | null;
  durationMinutesElapsed: number;
  wasSusanooActive: boolean;
  useIzanagiToPreventPenalty: boolean;
}

export interface ApiAbandonSessionResponseDto {
  session: ApiFocusSessionLogDto;
  profile: ApiProfileDto;
  izanagi: ApiIzanagiDto;
  izanagiInvoked: boolean;
  chakraPenaltyApplied: number;
}

export interface ApiScrollStatsResponseDto {
  kpis: {
    totalFocusHours: number;
    totalFocusMinutes: number;
    totalChakra: number;
    currentEyeStage: EyeStage;
    currentStreak: number;
    bestStreak: number;
    completionAccuracyPercentage: number;
    totalIzanagiUsed: number;
    amaterasuMissionsCompleted: number;
  };
  heatmap: Array<{
    date: string;
    minutes: number;
    chakra: number;
    sessions: number;
    intensityLevel: number;
  }>;
  rankDistribution: Array<{
    rank: MissionRank;
    completedMissions: number;
  }>;
  recentLogs: ApiFocusSessionLogDto[];
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errBody = (parsed ?? {}) as ApiErrorPayload;
    throw new Error(
      errBody.error ??
        `Erro HTTP ${response.status} ao comunicar com o backend.`,
    );
  }

  return parsed as T;
}

export function fetchFullState(): Promise<ApiAppStateResponseDto> {
  return requestJson<ApiAppStateResponseDto>('/api/state', {
    method: 'GET',
  });
}

export function runBackendDailyCheck(): Promise<ApiDailyCheckResponseDto> {
  return requestJson<ApiDailyCheckResponseDto>('/api/profile/daily-check', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function patchEyeCustomization(
  payload: ApiEyeCustomizationPayload,
): Promise<ApiProfileDto> {
  return requestJson<ApiProfileDto>('/api/profile/eye-customization', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function postDevSimulate(
  payload: ApiDevSimulatePayload,
): Promise<ApiAppStateResponseDto> {
  return requestJson<ApiAppStateResponseDto>('/api/profile/dev-simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function generateAiSharingan(
  payload: ApiGenerateSharinganPayload,
): Promise<ApiGenerateSharinganResponseDto> {
  return requestJson<ApiGenerateSharinganResponseDto>(
    '/api/profile/generate-sharingan',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function createBackendMission(
  payload: ApiCreateMissionPayload,
): Promise<ApiMissionDto> {
  return requestJson<ApiMissionDto>('/api/missions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBackendMission(
  id: string,
  payload: ApiUpdateMissionPayload,
): Promise<ApiMissionDto> {
  return requestJson<ApiMissionDto>(`/api/missions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function patchBackendMissionStatus(
  id: string,
  status: MissionStatus,
): Promise<ApiMissionDto> {
  return requestJson<ApiMissionDto>(
    `/api/missions/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export function toggleBackendMissionAmaterasu(
  id: string,
  isAmaterasu: boolean,
): Promise<ApiMissionDto> {
  return requestJson<ApiMissionDto>(
    `/api/missions/${encodeURIComponent(id)}/amaterasu`,
    {
      method: 'POST',
      body: JSON.stringify({ isAmaterasu }),
    },
  );
}

export function deleteBackendMission(id: string): Promise<void> {
  return requestJson<void>(`/api/missions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function completeBackendSession(
  payload: ApiCompleteSessionPayload,
): Promise<ApiCompleteSessionResponseDto> {
  return requestJson<ApiCompleteSessionResponseDto>('/api/sessions/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function abandonBackendSession(
  payload: ApiAbandonSessionPayload,
): Promise<ApiAbandonSessionResponseDto> {
  return requestJson<ApiAbandonSessionResponseDto>('/api/sessions/abandon', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchScrollStats(params?: {
  rank?: MissionRank;
  completed?: boolean;
}): Promise<ApiScrollStatsResponseDto> {
  const query = new URLSearchParams();
  if (params?.rank) {
    query.set('rank', params.rank);
  }
  if (typeof params?.completed === 'boolean') {
    query.set('completed', String(params.completed));
  }
  const qs = query.toString();
  return requestJson<ApiScrollStatsResponseDto>(
    `/api/stats/scroll${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
    },
  );
}
