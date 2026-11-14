'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, ScrollText, Sparkles, X } from 'lucide-react';
import { RANK_DEFINITIONS, RANK_ORDER } from '@/constants/ranks';
import { cn } from '@/lib/cn';
import { formatLocalDate } from '@/lib/date';
import { calculateSessionChakra } from '@/lib/gamification';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { MissionRank, MissionStatus } from '@/types/tsukuyomi';

export interface NewMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: MissionStatus;
}

const COLUMN_STATUS_LABELS: Record<MissionStatus, string> = {
  todo: 'Pergaminho de Missões',
  in_tsukuyomi: 'Dentro do Tsukuyomi',
  completed: 'Missões Cumpridas',
};

const QUICK_MINUTE_OPTIONS = [15, 25, 35, 50, 75, 90] as const;

interface NewMissionFormProps {
  defaultStatus: MissionStatus;
  onClose: () => void;
}

function NewMissionForm({ defaultStatus, onClose }: NewMissionFormProps) {
  const titleId = useId();
  const descId = useId();
  const minutesId = useId();
  const amaterasuId = useId();

  const addMission = useTsukuyomiStore((state) => state.addMission);
  const missions = useTsukuyomiStore((state) => state.missions);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rank, setRank] = useState<MissionRank>('B');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(
    RANK_DEFINITIONS.B.suggestedMinutes,
  );
  const [status, setStatus] = useState<MissionStatus>(defaultStatus);
  const [isAmaterasu, setIsAmaterasu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = formatLocalDate();
  const activeAmaterasuToday = missions.find(
    (m) =>
      m.status !== 'completed' &&
      m.isAmaterasu &&
      m.amaterasuDate === today,
  );

  const canActivateAmaterasu =
    !activeAmaterasuToday && status !== 'completed';
  const effectiveAmaterasu = canActivateAmaterasu && isAmaterasu;

  const safeMinutes = Math.max(5, Math.min(240, Math.round(estimatedMinutes || 25)));
  const previewChakra = calculateSessionChakra({
    durationMinutes: safeMinutes,
    rank,
    isAmaterasu: effectiveAmaterasu,
    usedSusanoo: false,
  });
  const previewSusanooChakra = calculateSessionChakra({
    durationMinutes: safeMinutes,
    rank,
    isAmaterasu: effectiveAmaterasu,
    usedSusanoo: true,
  });

  function handleRankChange(nextRank: MissionRank) {
    setRank(nextRank);
    setEstimatedMinutes(RANK_DEFINITIONS[nextRank].suggestedMinutes);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Inscreva o título da missão antes de selar o pergaminho.');
      return;
    }

    addMission({
      title: trimmedTitle,
      description: description.trim(),
      rank,
      estimatedMinutes: safeMinutes,
      isAmaterasu: effectiveAmaterasu,
      status,
    });

    onClose();
  }

  const currentRankDef = RANK_DEFINITIONS[rank];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label
          htmlFor={titleId}
          className="block text-xs font-medium tracking-wider text-[#A1A1AA] uppercase"
        >
          Título da Missão
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Ex.: Refatorar pipeline de autenticação"
          maxLength={120}
          autoFocus
          className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#DC2626] focus:outline-none"
        />
        {errorMessage && (
          <p className="text-xs text-[#EF4444]" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor={descId}
          className="block text-xs font-medium tracking-wider text-[#A1A1AA] uppercase"
        >
          Detalhes do Pergaminho{' '}
          <span className="text-[#52525B] normal-case">(opcional)</span>
        </label>
        <textarea
          id={descId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={320}
          placeholder="Critérios de conclusão, escopo ou alvo do ciclo..."
          className="w-full resize-none rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#DC2626] focus:outline-none"
        />
      </div>

      {/* Rank Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-wider text-[#A1A1AA] uppercase">
            Classificação Ninja (Rank)
          </span>
          <span className="font-mono text-xs tabular-nums text-[#A1A1AA]">
            Multiplicador{' '}
            <span className="text-[#FAFAFA]">
              {currentRankDef.multiplier.toFixed(1)}x
            </span>
          </span>
        </div>

        <div
          className="grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Selecionar Rank da Missão"
        >
          {RANK_ORDER.map((rankKey) => {
            const def = RANK_DEFINITIONS[rankKey];
            const selected = rank === rankKey;
            return (
              <button
                key={rankKey}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleRankChange(rankKey)}
                className={cn(
                  'group relative flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-colors',
                  selected
                    ? 'bg-[#18181B] text-[#FAFAFA]'
                    : 'border-[#27272A] bg-[#09090B]/80 text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]',
                )}
                style={
                  selected
                    ? {
                        borderColor: def.borderColor,
                        boxShadow: `0 0 18px ${def.glowColor}`,
                      }
                    : undefined
                }
              >
                <span
                  className="font-mono text-base font-bold tabular-nums"
                  style={{ color: selected ? def.badgeColor : undefined }}
                >
                  {def.rank}
                </span>
                <span className="mt-0.5 font-mono text-[10px] tabular-nums text-[#A1A1AA]">
                  {def.multiplier.toFixed(1)}x
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#52525B]">
                  {def.suggestedMinutes}m
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[#A1A1AA]">
          <span className="font-medium text-[#FAFAFA]">
            {currentRankDef.label} — {currentRankDef.title}:
          </span>{' '}
          {currentRankDef.description}
        </p>
      </div>

      {/* Duration & Initial Column */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor={minutesId}
            className="block text-xs font-medium tracking-wider text-[#A1A1AA] uppercase"
          >
            Duração Estimada (min)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={minutesId}
              type="number"
              min={5}
              max={240}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className="w-24 rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 font-mono text-sm tabular-nums text-[#FAFAFA] focus:border-[#DC2626] focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {QUICK_MINUTE_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedMinutes(mins)}
                  className={cn(
                    'rounded border px-1.5 py-1 font-mono text-[11px] tabular-nums transition-colors',
                    estimatedMinutes === mins
                      ? 'border-[#DC2626]/70 bg-[#450A0A]/50 text-[#FAFAFA]'
                      : 'border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:border-[#3F3F46]',
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium tracking-wider text-[#A1A1AA] uppercase">
            Coluna Inicial
          </span>
          <select
            aria-label="Coluna inicial da missão"
            value={status}
            onChange={(e) => setStatus(e.target.value as MissionStatus)}
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#DC2626] focus:outline-none"
          >
            {(['todo', 'in_tsukuyomi', 'completed'] as const).map((col) => (
              <option key={col} value={col}>
                {COLUMN_STATUS_LABELS[col]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Amaterasu Daily Seal */}
      <div
        className={cn(
          'rounded-xl border p-3.5 transition-colors',
          effectiveAmaterasu
            ? 'border-[#DC2626]/70 bg-[#000000] shadow-[inset_0_0_24px_rgba(0,0,0,0.95),0_0_16px_rgba(127,29,29,0.35)]'
            : 'border-[#27272A] bg-[#09090B]/70',
        )}
      >
        <label
          htmlFor={amaterasuId}
          className={cn(
            'flex items-start gap-3',
            canActivateAmaterasu ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
          )}
        >
          <input
            id={amaterasuId}
            type="checkbox"
            checked={effectiveAmaterasu}
            disabled={!canActivateAmaterasu}
            onChange={(e) => setIsAmaterasu(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#7F1D1D] bg-[#000000] accent-[#DC2626]"
          />
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FAFAFA]">
                <Flame
                  className="h-4 w-4 text-[#DC2626]"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(220, 38, 38, 0.7))',
                  }}
                />
                Selo Amaterasu Diário
              </span>
              <span className="rounded border border-[#7F1D1D]/70 bg-[#000000] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-[#EF4444]">
                2.0x CHAKRA
              </span>
            </div>

            {activeAmaterasuToday ? (
              <p className="text-xs text-[#A1A1AA]">
                Já existe uma missão sob as chamas negras hoje:{' '}
                <span className="font-medium text-[#EF4444]">
                  {activeAmaterasuToday.title}
                </span>
                . Conclua-a ou apague seu selo antes de marcar outra.
              </p>
            ) : status === 'completed' ? (
              <p className="text-xs text-[#A1A1AA]">
                Missões já criadas como cumpridas não recebem o selo Amaterasu.
              </p>
            ) : (
              <p className="text-xs text-[#A1A1AA]">
                Prioridade absoluta (1 por dia). Dobra o Chakra obtido, mas não
                concluí-la antes da virada do dia consome{' '}
                <span className="font-mono tabular-nums text-[#EF4444]">
                  300
                </span>{' '}
                de Chakra.
              </p>
            )}
          </div>
        </label>
      </div>

      {/* Chakra Preview + Actions */}
      <div className="flex flex-col gap-3 border-t border-[#27272A] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-xs text-[#A1A1AA]">
          <Sparkles className="h-4 w-4 text-[#DC2626]" />
          <div>
            <div>
              Recompensa estimada:{' '}
              <span className="font-mono font-semibold tabular-nums text-[#FAFAFA]">
                +{previewChakra.toLocaleString('pt-BR')} Chakra
              </span>
            </div>
            <div className="font-mono text-[11px] tabular-nums text-[#52525B]">
              Com Susano&apos;o ativo: +{previewSusanooChakra.toLocaleString('pt-BR')}{' '}
              Chakra
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#27272A] bg-[#09090B] px-4 py-2 text-sm font-medium text-[#A1A1AA] transition-colors hover:border-[#3F3F46] hover:text-[#FAFAFA]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-[#DC2626]/70 bg-[#DC2626] px-4 py-2 text-sm font-semibold text-[#FAFAFA] shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-colors hover:bg-[#EF4444]"
          >
            <ScrollText className="h-4 w-4" />
            Selar Missão
          </button>
        </div>
      </div>
    </form>
  );
}

export function NewMissionModal({
  isOpen,
  onClose,
  defaultStatus = 'todo',
}: NewMissionModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const headingId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="new-mission-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
        >
          <motion.div
            key="new-mission-dialog"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 12 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 8 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 280, damping: 28 }
            }
            onClick={(e) => e.stopPropagation()}
            className="obsidian-surface relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#27272A] border-t-white/[0.08] p-6"
          >
            {/* Subtle crimson rim accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DC2626]/60 to-transparent"
            />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-[#DC2626] uppercase">
                  Registro Ninja
                </p>
                <h2
                  id={headingId}
                  className="mt-1 font-display text-xl font-semibold tracking-wide text-[#FAFAFA]"
                >
                  Inscrever Nova Missão
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal de nova missão"
                className="rounded-lg border border-[#27272A] bg-[#09090B]/80 p-1.5 text-[#A1A1AA] transition-colors hover:border-[#DC2626]/60 hover:text-[#FAFAFA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NewMissionForm
              key={defaultStatus}
              defaultStatus={defaultStatus}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
