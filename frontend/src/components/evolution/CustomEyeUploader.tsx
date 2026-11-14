'use client';

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import Image from 'next/image';
import {
  Cpu,
  Eye,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  ZoomIn,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { cn } from '@/lib/cn';
import { compressEyeImageFile, isValidEyeImageUrl } from '@/lib/imageUpload';
import { useTsukuyomiStore } from '@/store/useTsukuyomiStore';
import type { MangekyouVariant } from '@/types/tsukuyomi';

type AiStyleVariant = MangekyouVariant | 'custom';

const AI_STYLE_OPTIONS: ReadonlyArray<{ value: AiStyleVariant; label: string }> = [
  { value: 'itachi', label: 'Itachi' },
  { value: 'sasuke', label: 'Sasuke' },
  { value: 'shisui', label: 'Shisui' },
  { value: 'obito', label: 'Obito' },
  { value: 'madara', label: 'Madara' },
  { value: 'custom', label: 'Custom' },
];

export function CustomEyeUploader() {
  const {
    customEye,
    equippedEyeStage,
    mangekyouVariant,
    backendConnected,
    isGeneratingSharingan,
    lastGeneratedSharingan,
    updateCustomEye,
    generateCustomSharinganWithAi,
  } = useTsukuyomiStore(
    useShallow((state) => ({
      customEye: state.customEye,
      equippedEyeStage: state.equippedEyeStage,
      mangekyouVariant: state.mangekyouVariant,
      backendConnected: state.backendConnected,
      isGeneratingSharingan: state.isGeneratingSharingan,
      lastGeneratedSharingan: state.lastGeneratedSharingan,
      updateCustomEye: state.updateCustomEye,
      generateCustomSharinganWithAi: state.generateCustomSharinganWithAi,
    })),
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState<string>(() =>
    customEye.imageDataUrl && !customEye.imageDataUrl.startsWith('data:')
      ? customEye.imageDataUrl
      : '',
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyleVariant, setAiStyleVariant] = useState<AiStyleVariant>(mangekyouVariant);
  const [aiOutputFormat, setAiOutputFormat] = useState<'svg' | 'raster'>('svg');
  const [useLoadedPhotoForVision, setUseLoadedPhotoForVision] = useState(true);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  async function processFile(file: File) {
    setErrorMessage(null);
    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressEyeImageFile(file, 512, 0.85);
      updateCustomEye({
        imageDataUrl: compressedDataUrl,
        enabled: true,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível processar a imagem selecionada.',
      );
    } finally {
      setIsCompressing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void processFile(file);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = urlInput.trim();
    if (!isValidEyeImageUrl(trimmed)) {
      setErrorMessage(
        'Informe um caminho local (ex.: /assets/eyes/itachi-custom.png) ou URL http(s) válida.',
      );
      return;
    }
    setErrorMessage(null);
    updateCustomEye({
      imageDataUrl: trimmed,
      enabled: true,
    });
  }

  function handleClearImage() {
    setErrorMessage(null);
    setUrlInput('');
    updateCustomEye({
      imageDataUrl: null,
      enabled: false,
    });
  }

  function handleToggleEnabled() {
    if (!customEye.imageDataUrl && !customEye.enabled) {
      setErrorMessage(
        'Envie uma imagem ou informe uma URL válida antes de ativar o olho customizado.',
      );
      return;
    }
    setErrorMessage(null);
    updateCustomEye({ enabled: !customEye.enabled });
  }

  const canSendVisionPhoto = Boolean(
    customEye.imageDataUrl &&
      !customEye.imageDataUrl.startsWith('data:image/svg+xml'),
  );

  async function handleGenerateWithGroqAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiErrorMessage(null);

    try {
      await generateCustomSharinganWithAi({
        prompt: aiPrompt.trim() || undefined,
        baseEyeImageBase64:
          canSendVisionPhoto && useLoadedPhotoForVision
            ? customEye.imageDataUrl
            : null,
        styleVariant: aiStyleVariant,
        outputFormat: aiOutputFormat,
        autoEquip: true,
      });
    } catch (error) {
      setAiErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível conectar à API do backend (.NET 8 + Groq AI). Verifique se a API está em execução.',
      );
    }
  }

  const hasImage = Boolean(customEye.imageDataUrl);
  const glowSpread = Math.round(customEye.glowIntensity * 28);
  const glowOpacity = Number((0.12 + customEye.glowIntensity * 0.65).toFixed(2));
  const previewBoxShadow = customEye.enabled && hasImage
    ? `0 0 ${glowSpread}px rgba(220, 38, 38, ${glowOpacity}), inset 0 0 24px #000000`
    : 'inset 0 0 24px #000000';

  return (
    <section
      aria-labelledby="custom-eye-heading"
      className="obsidian-surface rounded-2xl border border-zinc-800/90 border-t-white/[0.08] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Selo Ocular Customizado (IA / Arte)</span>
          </div>
          <h3
            id="custom-eye-heading"
            className="mt-1 font-display text-xl font-semibold tracking-wide text-zinc-50"
          >
            Globo Ocular Personalizado
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Substitua o vetor do Sharingan no Relógio Ocular por uma arte gerada
            por IA (.png, .webp, .jpg comprimidos em WebP ≤ 512px) ou caminho local.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <span className="text-xs font-medium text-zinc-400">
            {customEye.enabled ? 'Ativo no Relógio' : 'Vetor Canônico'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={customEye.enabled}
            aria-label="Alternar uso do olho customizado no Relógio Ocular"
            onClick={handleToggleEnabled}
            className={cn(
              'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]',
              customEye.enabled
                ? 'border-red-500/70 bg-red-600/80'
                : 'border-zinc-700 bg-zinc-900',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-zinc-50 shadow-sm transition-transform duration-200',
                customEye.enabled ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Preview Circular */}
        <div className="flex flex-col items-center justify-center gap-4 lg:w-5/12 lg:shrink-0">
          <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-zinc-800 bg-[#050507] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <div
              className="relative h-full w-full overflow-hidden rounded-full bg-black"
              style={{ boxShadow: previewBoxShadow }}
            >
              {customEye.imageDataUrl ? (
                <Image
                  src={customEye.imageDataUrl}
                  alt="Pré-visualização circular do olho customizado"
                  fill
                  unoptimized
                  className={cn(
                    'object-cover transition-opacity duration-300',
                    customEye.enabled ? 'opacity-100' : 'opacity-45 grayscale',
                  )}
                  style={{
                    transform: `scale(${customEye.scale})`,
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-4 opacity-50">
                  <SharinganSvg
                    stage={equippedEyeStage}
                    variant={mangekyouVariant}
                    className="h-full w-full"
                  />
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ boxShadow: 'inset 0 0 24px #000000' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Eye className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
            <span>
              {hasImage
                ? customEye.enabled
                  ? 'Aplicado em tempo real no Templo'
                  : 'Imagem salva (desativada)'
                : 'Nenhuma imagem carregada'}
            </span>
          </div>
        </div>

        {/* Upload, URL e Controles */}
        <div className="min-w-0 flex-1 space-y-5 lg:w-7/12">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'rounded-xl border border-dashed p-4 transition-colors',
              isDragOver
                ? 'border-red-500 bg-red-950/20'
                : 'border-zinc-700/90 bg-[#09090B]/70 hover:border-zinc-600',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Selecionar arquivo de imagem ocular"
            />
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-200">
                  Enviar imagem (.png, .webp, .jpg)
                </p>
                <p className="text-xs text-zinc-400">
                  Arraste e solte aqui ou escolha um arquivo. Compressão
                  automática ≤ 512×512 WebP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-900/70 bg-red-950/40 px-3.5 py-2 text-xs font-medium text-red-100 transition-colors hover:border-red-600/80 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isCompressing ? 'Comprimindo...' : 'Selecionar Arquivo'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-2">
            <label
              htmlFor="custom-eye-url"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
            >
              <Link2 className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span>Caminho local ou URL da imagem</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="custom-eye-url"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="/assets/eyes/itachi-custom.png"
                className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-600 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 transition-colors hover:border-red-700/70 hover:bg-zinc-800"
              >
                Aplicar URL
              </button>
            </div>
          </form>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-red-900/80 bg-red-950/40 px-3 py-2 text-xs text-red-300"
            >
              {errorMessage}
            </p>
          ) : null}

          {/* Sliders */}
          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-[#09090B]/60 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="custom-eye-scale"
                  className="flex items-center gap-1.5 font-medium text-zinc-300"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                  <span>Escala / Zoom</span>
                </label>
                <span className="font-mono tabular-nums text-zinc-200">
                  {customEye.scale.toFixed(2)}x
                </span>
              </div>
              <input
                id="custom-eye-scale"
                type="range"
                min={0.8}
                max={1.8}
                step={0.05}
                value={customEye.scale}
                onChange={(e) =>
                  updateCustomEye({ scale: Number(e.target.value) })
                }
                className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
              />
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#09090B]/60 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="custom-eye-glow"
                  className="flex items-center gap-1.5 font-medium text-zinc-300"
                >
                  <Sparkles className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                  <span>Intensidade do Glow</span>
                </label>
                <span className="font-mono tabular-nums text-zinc-200">
                  {Math.round(customEye.glowIntensity * 100)}%
                </span>
              </div>
              <input
                id="custom-eye-glow"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={customEye.glowIntensity}
                onChange={(e) =>
                  updateCustomEye({ glowIntensity: Number(e.target.value) })
                }
                className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
              />
            </div>
          </div>

          {hasImage ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-transparent px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-900/70 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Remover imagem customizada</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Forja Ocular Groq AI (Vision + SVG Vetorial) */}
      <div className="mt-8 border-t border-zinc-800/90 pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Groq AI · Sharingan Generator & Vision</span>
            </div>
            <h4 className="mt-1 font-display text-lg font-semibold text-zinc-100">
              Forja Ocular por Inteligência Artificial
            </h4>
            <p className="mt-0.5 text-xs text-zinc-400">
              Descreva o Doujutsu desejado e/ou use uma foto de olho carregada
              acima para despertar um Mangekyou vetorial em SVG + Lore via Groq
              API.
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-[11px] font-medium sm:self-center',
              backendConnected
                ? 'border-red-700/60 bg-red-950/35 text-red-200'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-400',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                backendConnected ? 'bg-red-500' : 'bg-zinc-500',
              )}
            />
            {backendConnected
              ? 'Backend .NET conectado'
              : 'Sincroniza ao conectar à API'}
          </span>
        </div>

        <form onSubmit={handleGenerateWithGroqAi} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="groq-sharingan-prompt"
              className="block text-xs font-medium text-zinc-300"
            >
              Descrição de estilo, lâminas e personalidade do Sharingan
            </label>
            <textarea
              id="groq-sharingan-prompt"
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex.: Baseado no Mangekyou do Itachi, porém com 4 lâminas entrelaçadas e detalhes das chamas negras do Amaterasu"
              className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-300">
                Linhagem / Variante Base
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AI_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAiStyleVariant(option.value)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      aiStyleVariant === option.value
                        ? 'border-red-600/80 bg-red-950/50 text-red-100'
                        : 'border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-300">
                Formato Equipado Automaticamente
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiOutputFormat('svg')}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    aiOutputFormat === 'svg'
                      ? 'border-red-600/80 bg-red-950/50 text-red-100'
                      : 'border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700',
                  )}
                >
                  SVG Vetorial (Alta Precisão)
                </button>
                <button
                  type="button"
                  onClick={() => setAiOutputFormat('raster')}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    aiOutputFormat === 'raster'
                      ? 'border-red-600/80 bg-red-950/50 text-red-100'
                      : 'border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700',
                  )}
                >
                  Arte Rasterizada (IA)
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={canSendVisionPhoto && useLoadedPhotoForVision}
                disabled={!canSendVisionPhoto}
                onChange={(e) => setUseLoadedPhotoForVision(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-[#09090B] accent-red-600 disabled:opacity-40"
              />
              <span className={cn(!canSendVisionPhoto && 'text-zinc-500')}>
                {canSendVisionPhoto
                  ? 'Analisar imagem carregada acima com Groq Vision (llama-3.2-90b-vision-preview)'
                  : 'Carregue uma foto/URL não-SVG acima para ativar análise por Groq Vision'}
              </span>
            </label>

            <button
              type="submit"
              disabled={isGeneratingSharingan}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-600/80 bg-red-700/85 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-50 shadow-[0_0_24px_rgba(220,38,38,0.28)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingSharingan ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Canalizando Groq AI...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Despertar com Groq AI</span>
                </>
              )}
            </button>
          </div>
        </form>

        {aiErrorMessage ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-900/80 bg-red-950/40 px-3 py-2 text-xs text-red-300"
          >
            {aiErrorMessage}
          </p>
        ) : null}

        {lastGeneratedSharingan ? (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-[#09090B]/90 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white/20"
                    style={{
                      backgroundColor: lastGeneratedSharingan.primaryGlowColor,
                    }}
                  />
                  <h5 className="font-display text-sm font-semibold text-red-200">
                    {lastGeneratedSharingan.doujutsuName}
                  </h5>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  {lastGeneratedSharingan.loreDescription}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-400">
                Glow: {lastGeneratedSharingan.primaryGlowColor}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateCustomEye({
                    imageDataUrl: lastGeneratedSharingan.svgDataUri,
                    enabled: true,
                  })
                }
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-red-600/80 hover:text-red-100"
              >
                Equipar SVG Vetorial
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCustomEye({
                    imageDataUrl: lastGeneratedSharingan.rasterImageUrl,
                    enabled: true,
                  })
                }
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-red-600/80 hover:text-red-100"
              >
                Equipar Arte Rasterizada
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
