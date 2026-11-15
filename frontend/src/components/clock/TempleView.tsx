'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Flame,
  ScrollText,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';
import { AmbientSoundMixer } from '@/components/audio/AmbientSoundMixer';
import { OcularClock } from '@/components/clock/OcularClock';
import { TimerControls } from '@/components/clock/TimerControls';
import { MANGEKYOU_VARIANT_MAP } from '@/constants/evolution';
import { RANK_DEFINITIONS } from '@/constants/ranks';
import { audioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/cn';
import { sortMissionsAmaterasuFirst } from '@/lib/gamification';
import {
  useIsTsukuyomiMode,
  useOcularProfile,
  useTimerCore,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type {
  EyeStage,
  MangekyouVariant,
  MissionRank,
  SusanooStageOverride,
} from '@/types/tsukuyomi';

export interface TempleViewProps {
  onOpenSusanooBreak: () => void;
  onOpenIzanagiAbandon: () => void;
}

const QUICK_EYE_OPTIONS: readonly { stage: EyeStage; label: string }[] = [
  { stage: 'normal', label: 'Comum' },
  { stage: 'tomoe_1', label: '1T' },
  { stage: 'tomoe_2', label: '2T' },
  { stage: 'tomoe_3', label: '3T' },
  { stage: 'mangekyou', label: 'Mangekyou' },
  { stage: 'ems', label: 'EMS' },
  { stage: 'rinnegan', label: 'Rinnegan' },
];

const QUICK_CHARACTER_OPTIONS: readonly {
  variant: MangekyouVariant;
  label: string;
}[] = [
  { variant: 'itachi', label: 'Itachi' },
  { variant: 'sasuke', label: 'Sasuke' },
  { variant: 'shisui', label: 'Shisui' },
  { variant: 'obito', label: 'Obito' },
  { variant: 'madara', label: 'Madara' },
];

const QUICK_SUSANOO_OPTIONS: readonly {
  phase: SusanooStageOverride;
  label: string;
}[] = [
  { phase: 'auto', label: 'Auto' },
  { phase: 1, label: 'Fase 1 (Costelas)' },
  { phase: 2, label: 'Fase 2 (Esqueleto)' },
  { phase: 3, label: 'Fase 3 (Tengu Perfeito)' },
];

const CHARACTER_CUTIN_MAP: Record<
  MangekyouVariant,
  { src: string; badgeLabel: string; badgeClass: string }
> = {
  itachi: {
    src: '/assets/vfx/cutin-itachi-eyes.webp',
    badgeLabel: 'Itachi',
    badgeClass: 'border-red-500/45 bg-red-950/75 text-red-200',
  },
  sasuke: {
    src: '/assets/vfx/cutin-sasuke-eyes.webp',
    badgeLabel: 'Sasuke',
    badgeClass: 'border-violet-500/45 bg-violet-950/75 text-violet-200',
  },
  madara: {
    src: '/assets/vfx/cutin-madara-eyes.webp',
    badgeLabel: 'Madara',
    badgeClass: 'border-blue-500/45 bg-blue-950/75 text-blue-200',
  },
  shisui: {
    src: '/assets/vfx/cutin-itachi-eyes.webp',
    badgeLabel: 'Shisui · Kotoamatsukami',
    badgeClass: 'border-emerald-500/45 bg-emerald-950/75 text-emerald-200',
  },
  obito: {
    src: '/assets/vfx/cutin-madara-eyes.webp',
    badgeLabel: 'Obito · Kamui',
    badgeClass: 'border-sky-400/45 bg-sky-950/75 text-sky-200',
  },
};

const PILL_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 26,
} as const;

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

interface MissionDropdownOption {
  id: string | null;
  title: string;
  rank: MissionRank;
  multiplier: number;
  estimatedMinutes: number;
  completedMinutes: number;
  isAmaterasu: boolean;
  statusLabel: string;
}

export function TempleView({
  onOpenSusanooBreak,
  onOpenIzanagiAbandon,
}: TempleViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );
  const [isLabHovered, setIsLabHovered] = useState(false);
  const [isLabPinned, setIsLabPinned] = useState(false);
  const [isMissionMenuOpen, setIsMissionMenuOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [cutInState, setCutInState] = useState<{
    variant: MangekyouVariant;
    nonce: number;
  } | null>(null);

  const missionMenuRef = useRef<HTMLDivElement>(null);
  const missionTriggerRef = useRef<HTMLButtonElement>(null);
  const labDrawerRef = useRef<HTMLDivElement>(null);
  const cutInTimerRef = useRef<number | null>(null);
  const cutInNonceRef = useRef(0);

  const isLabOpen = isLabHovered || isLabPinned;

  const { status, activeMissionId } = useTimerCore();
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const {
    equippedEyeStage,
    mangekyouVariant,
    susanooStageOverride,
    isBetaFullAccess,
    customEye,
  } = useOcularProfile();

  const missions = useTsukuyomiStore((state) => state.missions);
  const setActiveMission = useTsukuyomiStore((state) => state.setActiveMission);
  const setActiveTab = useTsukuyomiStore((state) => state.setActiveTab);
  const equipEyeStage = useTsukuyomiStore((state) => state.equipEyeStage);
  const setMangekyouVariant = useTsukuyomiStore(
    (state) => state.setMangekyouVariant,
  );
  const setBetaFullAccess = useTsukuyomiStore(
    (state) => state.setBetaFullAccess,
  );
  const setSusanooStageOverride = useTsukuyomiStore(
    (state) => state.setSusanooStageOverride,
  );
  const setSusanooEnabled = useTsukuyomiStore(
    (state) => state.setSusanooEnabled,
  );
  const updateCustomEye = useTsukuyomiStore((state) => state.updateCustomEye);

  const selectableMissions = useMemo(() => {
    const inTsukuyomi = sortMissionsAmaterasuFirst(
      missions.filter((m) => m.status === 'in_tsukuyomi'),
    );
    const todo = sortMissionsAmaterasuFirst(
      missions.filter((m) => m.status === 'todo'),
    );
    return [...inTsukuyomi, ...todo];
  }, [missions]);

  const missionOptions = useMemo<MissionDropdownOption[]>(() => {
    const freeTraining: MissionDropdownOption = {
      id: null,
      title: 'Treino Livre no Tsukuyomi',
      rank: 'D',
      multiplier: RANK_DEFINITIONS.D.multiplier,
      estimatedMinutes: 25,
      completedMinutes: 0,
      isAmaterasu: false,
      statusLabel: 'Livre',
    };
    const items: MissionDropdownOption[] = selectableMissions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      rank: mission.rank,
      multiplier: RANK_DEFINITIONS[mission.rank].multiplier,
      estimatedMinutes: mission.estimatedMinutes,
      completedMinutes: mission.completedMinutes,
      isAmaterasu: mission.isAmaterasu,
      statusLabel:
        mission.status === 'in_tsukuyomi' ? 'No Tsukuyomi' : 'Pergaminho',
    }));
    return [freeTraining, ...items];
  }, [selectableMissions]);

  const isLocked = status !== 'idle';
  const effectiveMenuOpen = isMissionMenuOpen && !isLocked;

  const selectedMissionOption = useMemo(
    () =>
      missionOptions.find((opt) => opt.id === activeMissionId) ??
      missionOptions[0],
    [missionOptions, activeMissionId],
  );

  useEffect(() => {
    if (!effectiveMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        missionMenuRef.current &&
        !missionMenuRef.current.contains(event.target as Node)
      ) {
        setIsMissionMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMissionMenuOpen(false);
        missionTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [effectiveMenuOpen]);

  useEffect(() => {
    if (!isLabOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        labDrawerRef.current &&
        !labDrawerRef.current.contains(event.target as Node)
      ) {
        setIsLabPinned(false);
        setIsLabHovered(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLabPinned(false);
        setIsLabHovered(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLabOpen]);

  useEffect(() => {
    return () => {
      if (cutInTimerRef.current !== null) {
        window.clearTimeout(cutInTimerRef.current);
      }
    };
  }, []);

  const openMissionMenu = () => {
    if (isLocked) return;
    const currentIdx = missionOptions.findIndex(
      (opt) => opt.id === activeMissionId,
    );
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
    setIsMissionMenuOpen(true);
  };

  const selectMissionOption = (optionId: string | null) => {
    setActiveMission(optionId);
    setIsMissionMenuOpen(false);
    missionTriggerRef.current?.focus();
  };

  const handleMissionDropdownKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (isLocked) return;

    if (!effectiveMenuOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        audioEngine.playClick();
        openMissionMenu();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          missionOptions.length === 0 ? 0 : (prev + 1) % missionOptions.length,
        );
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          missionOptions.length === 0
            ? 0
            : (prev - 1 + missionOptions.length) % missionOptions.length,
        );
        break;
      }
      case 'Home': {
        event.preventDefault();
        setHighlightedIndex(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        setHighlightedIndex(Math.max(0, missionOptions.length - 1));
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const chosen = missionOptions[highlightedIndex];
        if (chosen) {
          selectMissionOption(chosen.id);
        }
        break;
      }
      case 'Tab': {
        setIsMissionMenuOpen(false);
        break;
      }
      default:
        break;
    }
  };

  const handleSelectEyeStage = (stage: EyeStage) => {
    if (!isBetaFullAccess) {
      setBetaFullAccess(true);
    }
    if (customEye.enabled) {
      updateCustomEye({ enabled: false });
    }
    void audioEngine.playEyeSound(stage);
    equipEyeStage(stage);
  };

  const handleSelectCharacter = (variant: MangekyouVariant) => {
    if (!isBetaFullAccess) {
      setBetaFullAccess(true);
    }
    setMangekyouVariant(variant);

    if (cutInTimerRef.current !== null) {
      window.clearTimeout(cutInTimerRef.current);
    }
    cutInNonceRef.current += 1;
    setCutInState({ variant, nonce: cutInNonceRef.current });
    cutInTimerRef.current = window.setTimeout(() => {
      setCutInState(null);
      cutInTimerRef.current = null;
    }, 650);
  };

  const handleSelectSusanooPhase = (phase: SusanooStageOverride) => {
    audioEngine.playClick();
    setSusanooStageOverride(phase);
    if (phase !== 'auto' && status === 'idle') {
      setSusanooEnabled(true);
    }
  };

  const cutInAsset = cutInState
    ? CHARACTER_CUTIN_MAP[cutInState.variant]
    : null;
  const cutInInfo = cutInState
    ? MANGEKYOU_VARIANT_MAP[cutInState.variant]
    : null;

  const cutInOverlay = (
    <AnimatePresence>
      {cutInState && cutInAsset && cutInInfo && (
        <motion.div
          key={cutInState.nonce}
          aria-hidden="true"
          initial={
            prefersReducedMotion
              ? false
              : { opacity: 0, y: -14, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -8, scale: 0.98 }
          }
          transition={{
            duration: 0.14,
            ease: [0.16, 1, 0.3, 1],
            type: 'tween',
          }}
          className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center px-3 sm:top-16 sm:px-6"
        >
          <div className="relative h-32 w-full max-w-2xl overflow-hidden rounded-xl border border-red-500/45 bg-gradient-to-r from-black/95 via-[#130406]/95 to-black/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_0_55px_rgba(220,38,38,0.45)] backdrop-blur-xl sm:h-40">
            {/* Hairline top & bottom crimson laser edges */}
            <div className="absolute inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-red-400 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-30 h-px bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />

            {/* 2.5D Parallax Eye Image */}
            <motion.div
              initial={
                prefersReducedMotion
                  ? false
                  : { x: -18, scale: 1.1, opacity: 0.35 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      x: [-18, 0, 14],
                      scale: [1.1, 1.04, 1],
                      opacity: [0.35, 1, 0.94],
                    }
              }
              transition={{
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
                type: 'tween',
              }}
              className="relative h-full w-full"
            >
              <Image
                src={cutInAsset.src}
                alt={`Mangekyou Sharingan — ${cutInInfo.wielder}`}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                unoptimized
                priority
                className="object-cover object-center mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]"
              />
            </motion.div>

            {/* Incandescent Flash */}
            {!prefersReducedMotion && (
              <motion.div
                initial={{ opacity: 0.95 }}
                animate={{ opacity: [0.95, 0.28, 0] }}
                transition={{
                  duration: 0.45,
                  ease: 'easeOut',
                  type: 'tween',
                }}
                className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent via-red-200/65 to-transparent mix-blend-screen"
              />
            )}

            {/* Crimson Light Beam sweeping left-to-right across the eyes */}
            {!prefersReducedMotion && (
              <motion.div
                initial={{ left: '-25%', opacity: 0 }}
                animate={{
                  left: ['-25%', '120%'],
                  opacity: [0, 1, 0.85, 0],
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.16, 1, 0.3, 1],
                  type: 'tween',
                }}
                className="pointer-events-none absolute inset-y-0 z-20 w-28 -skew-x-[24deg] bg-gradient-to-r from-transparent via-red-400/70 to-transparent mix-blend-screen blur-[1px]"
              >
                <div className="mx-auto h-full w-1 bg-red-100/90 shadow-[0_0_20px_4px_rgba(239,68,68,0.85)]" />
              </motion.div>
            )}

            {/* Cut-In Wielder & Jutsu HUD Telemetry */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-4 py-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                  <span className="text-[10px] font-medium tracking-[0.22em] text-red-300 uppercase">
                    Mangekyou Awaken · {cutInInfo.wielder}
                  </span>
                </div>
                <span className="font-display text-xs font-semibold tracking-wider text-white sm:text-sm">
                  {cutInInfo.jutsuName}
                </span>
              </div>

              <span
                className={cn(
                  'rounded border px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase',
                  cutInAsset.badgeClass,
                )}
              >
                {cutInAsset.badgeLabel}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const labDrawerWidget = (
    <div
      ref={labDrawerRef}
      onMouseEnter={() => setIsLabHovered(true)}
      onMouseLeave={() => setIsLabHovered(false)}
      className="fixed bottom-5 right-5 z-40"
    >
      <AnimatePresence>
        {isLabOpen && (
          <motion.section
            id="beta-quick-switcher-panel"
            key="beta-quick-switcher-panel"
            aria-label="Lab Uchiha Beta"
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, y: 8, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 6, scale: 0.97 }
            }
            transition={{
              duration: 0.18,
              ease: [0.16, 1, 0.3, 1],
              type: 'tween',
            }}
            className="absolute bottom-[calc(100%+0.6rem)] right-0 w-[320px] rounded-2xl border border-white/10 bg-black/80 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:w-[380px]"
          >
            {/* Invisible hover bridge between floating button and drawer */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-3 h-3"
            />

            <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full transition-colors duration-700"
                  style={{
                    backgroundColor: 'var(--chakra-primary, #DC2626)',
                    boxShadow:
                      '0 0 8px var(--chakra-glow, rgba(220, 38, 38, 0.42))',
                  }}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-100 uppercase">
                  Lab Uchiha Beta
                </span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-zinc-300 uppercase">
                1-Clique Ao Vivo
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Olho Ativo */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
                  <Eye
                    className="h-3 w-3 transition-colors duration-700"
                    style={{ color: 'var(--chakra-primary, #DC2626)' }}
                    aria-hidden="true"
                  />
                  <span>Olho Ativo</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_EYE_OPTIONS.map((opt) => {
                    const active = equippedEyeStage === opt.stage;
                    return (
                      <motion.button
                        key={opt.stage}
                        type="button"
                        whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                        whileTap={
                          prefersReducedMotion ? undefined : { scale: 0.97 }
                        }
                        transition={PILL_SPRING}
                        onMouseEnter={() => audioEngine.playHover()}
                        onClick={() => handleSelectEyeStage(opt.stage)}
                        aria-pressed={active}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors duration-700 will-change-transform',
                          active
                            ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.1] text-white shadow-[0_0_12px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                            : 'border-white/10 bg-black/55 text-zinc-400 hover:border-white/25 hover:text-zinc-100',
                        )}
                      >
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Personagem Uchiha */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
                  <Sparkles
                    className="h-3 w-3 transition-colors duration-700"
                    style={{ color: 'var(--chakra-primary, #DC2626)' }}
                    aria-hidden="true"
                  />
                  <span>Personagem Uchiha</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_CHARACTER_OPTIONS.map((opt) => {
                    const active = mangekyouVariant === opt.variant;
                    return (
                      <motion.button
                        key={opt.variant}
                        type="button"
                        whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                        whileTap={
                          prefersReducedMotion ? undefined : { scale: 0.97 }
                        }
                        transition={PILL_SPRING}
                        onMouseEnter={() => audioEngine.playHover()}
                        onClick={() => handleSelectCharacter(opt.variant)}
                        aria-pressed={active}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors duration-700 will-change-transform',
                          active
                            ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.1] text-white shadow-[0_0_12px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                            : 'border-white/10 bg-black/55 text-zinc-400 hover:border-white/25 hover:text-zinc-100',
                        )}
                      >
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Fase do Susano'o */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-400 uppercase">
                  <Shield
                    className="h-3 w-3 transition-colors duration-700"
                    style={{ color: 'var(--chakra-primary, #DC2626)' }}
                    aria-hidden="true"
                  />
                  <span>Fase do Susano&apos;o</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_SUSANOO_OPTIONS.map((opt) => {
                    const active = susanooStageOverride === opt.phase;
                    return (
                      <motion.button
                        key={String(opt.phase)}
                        type="button"
                        whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                        whileTap={
                          prefersReducedMotion ? undefined : { scale: 0.97 }
                        }
                        transition={PILL_SPRING}
                        onMouseEnter={() => audioEngine.playHover()}
                        onClick={() => handleSelectSusanooPhase(opt.phase)}
                        aria-pressed={active}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors duration-700 will-change-transform',
                          active
                            ? 'border-[var(--chakra-primary,#DC2626)] bg-white/[0.1] text-white shadow-[0_0_12px_var(--chakra-glow,rgba(220,38,38,0.42))]'
                            : 'border-white/10 bg-black/55 text-zinc-400 hover:border-white/25 hover:text-zinc-100',
                        )}
                      >
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-expanded={isLabOpen}
        aria-controls="beta-quick-switcher-panel"
        onMouseEnter={() => audioEngine.playHover()}
        onClick={() => {
          audioEngine.playClick();
          if (isLabPinned) {
            setIsLabPinned(false);
            setIsLabHovered(false);
          } else {
            setIsLabPinned(true);
          }
        }}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/65 px-4 py-2 text-xs font-medium text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-colors duration-700 hover:border-white/25',
          isLabOpen &&
            'border-[var(--chakra-primary,#DC2626)]/60 shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_20px_var(--chakra-glow,rgba(220,38,38,0.32))]',
        )}
      >
        <Eye
          className="h-3.5 w-3.5 transition-colors duration-700"
          style={{ color: 'var(--chakra-primary, #DC2626)' }}
          aria-hidden="true"
        />
        <span className="whitespace-nowrap">Lab Uchiha Beta</span>
      </button>
    </div>
  );

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-5xl flex-col items-center justify-between px-2 py-2 sm:px-4 sm:py-4">
      {/* Monumental Japanese Watermark Kanji engraved behind the temple view */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      >
        <span className="pointer-events-none font-serif text-[13rem] leading-none font-bold tracking-[0.14em] text-zinc-100 opacity-[0.03] select-none sm:text-[18rem] md:text-[22rem]">
          月読
        </span>
      </div>

      {/* 650ms Manga Cut-In Overlay on Mangekyou Character Switch */}
      {isMounted ? createPortal(cutInOverlay, document.body) : null}

      {/* Top Center: Minimalist Floating Mission Pill ("O Alvo do Tsukuyomi") */}
      <section
        ref={missionMenuRef}
        onKeyDown={handleMissionDropdownKeyDown}
        aria-label="O Alvo do Tsukuyomi"
        className={cn(
          'relative z-30 flex w-full justify-center transition-opacity duration-500',
          isTsukuyomiMode && status === 'running' && 'opacity-75 hover:opacity-100',
        )}
      >
        <div
          className={cn(
            'inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-black/65 px-4 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-colors duration-700 sm:flex-nowrap',
            effectiveMenuOpen &&
              'border-[var(--chakra-primary,#DC2626)]/50 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_24px_var(--chakra-glow,rgba(220,38,38,0.28))]',
          )}
        >
          <label
            id="temple-mission-label"
            htmlFor="temple-mission-select"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] font-medium tracking-[0.18em] text-zinc-400 uppercase"
          >
            <Target
              className="h-3.5 w-3.5 transition-colors duration-700"
              style={{ color: 'var(--chakra-primary, #DC2626)' }}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">O Alvo do Tsukuyomi</span>
          </label>

          <span className="h-3.5 w-px shrink-0 bg-white/10" aria-hidden="true" />

          <button
            ref={missionTriggerRef}
            id="temple-mission-select"
            type="button"
            role="combobox"
            disabled={isLocked}
            aria-haspopup="listbox"
            aria-expanded={effectiveMenuOpen}
            aria-controls="temple-mission-listbox"
            aria-activedescendant={
              effectiveMenuOpen
                ? `temple-mission-option-${highlightedIndex}`
                : undefined
            }
            aria-label="Selecionar missão ativa para o ciclo de foco"
            onMouseEnter={() => {
              if (!isLocked) audioEngine.playHover();
            }}
            onClick={() => {
              if (isLocked) return;
              audioEngine.playClick();
              if (effectiveMenuOpen) {
                setIsMissionMenuOpen(false);
              } else {
                openMissionMenu();
              }
            }}
            className={cn(
              'flex min-w-0 items-center gap-2 rounded-full px-1.5 py-0.5 text-left text-xs transition-colors focus:outline-none',
              isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-white',
            )}
          >
            <span
              className="inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
              style={{
                borderColor:
                  RANK_DEFINITIONS[selectedMissionOption.rank].borderColor,
                color:
                  RANK_DEFINITIONS[selectedMissionOption.rank].badgeColor,
              }}
            >
              {selectedMissionOption.rank}
            </span>

            {selectedMissionOption.isAmaterasu && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-red-600/50 bg-red-950/60 px-1 py-0.5 text-[9px] font-semibold tracking-wider text-red-400 uppercase">
                <Flame className="h-2.5 w-2.5 text-red-500" aria-hidden="true" />
                <span className="hidden sm:inline">Amaterasu</span>
              </span>
            )}

            <span className="max-w-[140px] truncate font-medium text-zinc-100 sm:max-w-[230px]">
              {selectedMissionOption.title}
            </span>

            <span className="hidden shrink-0 font-mono text-[11px] text-zinc-400 tabular-nums sm:inline">
              {selectedMissionOption.id
                ? `${selectedMissionOption.completedMinutes}/${selectedMissionOption.estimatedMinutes}m · ${selectedMissionOption.multiplier}x`
                : `${selectedMissionOption.multiplier}x`}
            </span>

            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200',
                effectiveMenuOpen && 'rotate-180 text-white',
              )}
              aria-hidden="true"
            />
          </button>

          <span className="h-3.5 w-px shrink-0 bg-white/10" aria-hidden="true" />

          <motion.button
            type="button"
            whileHover={prefersReducedMotion ? undefined : { y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
            transition={PILL_SPRING}
            onMouseEnter={() => audioEngine.playHover()}
            onClick={() => {
              audioEngine.playClick();
              setActiveTab('kanban');
            }}
            aria-label="Abrir Quadro de Missões"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white will-change-transform"
          >
            <ScrollText className="h-3 w-3 text-zinc-400" aria-hidden="true" />
            <span>Missões</span>
            <ArrowRight className="h-3 w-3 text-zinc-500" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Centered Floating Glassmorphic Mission Popover */}
        <AnimatePresence>
          {effectiveMenuOpen && (
            <motion.div
              id="temple-mission-listbox"
              role="listbox"
              aria-labelledby="temple-mission-label"
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: -6, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -4, scale: 0.98 }
              }
              transition={{
                duration: 0.16,
                ease: [0.16, 1, 0.3, 1],
                type: 'tween',
              }}
              className="absolute top-[calc(100%+0.5rem)] left-1/2 z-50 flex max-h-72 w-[min(92vw,460px)] -translate-x-1/2 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-white/10 bg-black/85 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            >
              {missionOptions.map((option, idx) => {
                const isSelected = option.id === activeMissionId;
                const isHighlighted = idx === highlightedIndex;
                const rankDef = RANK_DEFINITIONS[option.rank];

                return (
                  <button
                    key={option.id ?? '__free_training__'}
                    id={`temple-mission-option-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => {
                      audioEngine.playHover();
                      setHighlightedIndex(idx);
                    }}
                    onClick={() => selectMissionOption(option.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors',
                      isSelected
                        ? 'border-[var(--chakra-primary,#DC2626)]/50 bg-white/[0.08] text-zinc-50'
                        : isHighlighted
                          ? 'border-white/10 bg-white/[0.05] text-zinc-100'
                          : 'border-transparent text-zinc-300 hover:bg-white/[0.04]',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
                        style={{
                          borderColor: rankDef.borderColor,
                          color: rankDef.badgeColor,
                        }}
                      >
                        {option.rank} · {option.multiplier}x
                      </span>

                      {option.isAmaterasu && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-red-600/50 bg-black px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-red-400 uppercase">
                          <Flame
                            className="h-2.5 w-2.5 text-red-500"
                            aria-hidden="true"
                          />
                          <span>Amaterasu</span>
                        </span>
                      )}

                      <span className="truncate font-medium">
                        {option.title}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-zinc-400 uppercase">
                        {option.statusLabel}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                        {option.id
                          ? `${option.completedMinutes}/${option.estimatedMinutes}m`
                          : `${option.estimatedMinutes}m`}
                      </span>
                      {isSelected && (
                        <Check
                          className="h-3.5 w-3.5 transition-colors duration-700"
                          style={{ color: 'var(--chakra-primary, #DC2626)' }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Center Stage: Monumental Ocular Globe + Susano'o + Giant 3D Timer */}
      <div className="relative z-10 my-auto flex w-full justify-center py-4 sm:py-8">
        <OcularClock />
      </div>

      {/* Bottom Stage: Unified Horizontal Command Dock */}
      <div
        className={cn(
          'relative z-20 w-full max-w-4xl pb-14 transition-opacity duration-500 lg:pb-2',
          isTsukuyomiMode && status === 'running' && 'opacity-85 hover:opacity-100',
        )}
      >
        <TimerControls
          onOpenSusanooBreak={onOpenSusanooBreak}
          onOpenIzanagiAbandon={onOpenIzanagiAbandon}
        />
      </div>

      {/* Bottom-Left Peripheral: Floating Audio Pod */}
      <AmbientSoundMixer compact />

      {/* Bottom-Right Peripheral: Floating Lab Uchiha Beta Drawer */}
      {isMounted ? createPortal(labDrawerWidget, document.body) : null}
    </div>
  );
}
