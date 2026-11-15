'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import Image from 'next/image';
import {
  Check,
  Cpu,
  Eye,
  Flame,
  Link2,
  Loader2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  Wand2,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SharinganSvg } from '@/components/clock/SharinganSvg';
import { cn } from '@/lib/cn';
import {
  composeSharinganLensOnPhoto,
  compressBase64ImageForVision,
  compressEyeImageFile,
  isValidEyeImageUrl,
} from '@/lib/imageUpload';
import {
  useEquippedForgedEyeId,
  useForgedEyesInventory,
  useOcularSpinBurstNonce,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { MangekyouVariant, OcularRarity } from '@/types/tsukuyomi';

type AiStyleVariant = MangekyouVariant | 'custom';
type ForgeOutputMode = 'anime_svg' | 'photo_lens';

interface LensAdjustments {
  centerX: number;
  centerY: number;
  radiusRatio: number;
  opacity: number;
}

const AI_STYLE_OPTIONS: ReadonlyArray<{ value: AiStyleVariant; label: string }> = [
  { value: 'itachi', label: 'Itachi' },
  { value: 'sasuke', label: 'Sasuke' },
  { value: 'shisui', label: 'Shisui' },
  { value: 'obito', label: 'Obito' },
  { value: 'madara', label: 'Madara' },
  { value: 'custom', label: 'Custom' },
];

const PATTERN_LABELS: Record<string, string> = {
  eternal_fusion: 'Mangekyou Sharingan Eterno (Fusão)',
  itachi_shuriken: 'Lâminas Itachi',
  sasuke_atomic: 'Atômico Sasuke',
  shisui_kotoamatsukami: 'Shuriken Shisui',
  obito_kamui: 'Vórtice Kamui',
  madara_eternal: 'Choku-Tomoe Eterno',
  indra_spiral: 'Espiral Polimórfica',
};

const CENTER_SHAPE_LABELS: Record<string, string> = {
  circle: 'Núcleo Circular',
  square: 'Núcleo Quadrado',
  diamond: 'Núcleo Diamante',
  triangle: 'Núcleo Triangular',
  hexagram: 'Hexagrama Estelar',
  vortex: 'Vórtice Central',
};

const BLADE_STYLE_LABELS: Record<string, string> = {
  curved_shuriken: 'Lâminas Curvas',
  straight_katana: 'Lâminas Katana',
  square_geometric: 'Geometria Quadrada',
  atomic_rings: 'Anéis Atômicos',
  flame_serrated: 'Fogo Serrilhado',
  spiral_kamui: 'Espiral Kamui',
};

function getRarityBadgeClass(rarity: OcularRarity): string {
  switch (rarity) {
    case 'Rank SS - Divino':
      return 'border-amber-500/70 bg-amber-950/55 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.28)]';
    case 'Rank S':
      return 'border-red-600/70 bg-red-950/55 text-red-200';
    default:
      return 'border-zinc-700 bg-zinc-900/90 text-zinc-200';
  }
}

export function CustomEyeUploader() {
  const {
    customEye,
    equippedEyeStage,
    mangekyouVariant,
    backendConnected,
    isGeneratingSharingan,
    lastGeneratedSharingan,
    updateCustomEye,
    setMangekyouVariant,
    generateCustomSharinganWithAi,
    equipForgedEye,
    deleteForgedEye,
  } = useTsukuyomiStore(
    useShallow((state) => ({
      customEye: state.customEye,
      equippedEyeStage: state.equippedEyeStage,
      mangekyouVariant: state.mangekyouVariant,
      backendConnected: state.backendConnected,
      isGeneratingSharingan: state.isGeneratingSharingan,
      lastGeneratedSharingan: state.lastGeneratedSharingan,
      updateCustomEye: state.updateCustomEye,
      setMangekyouVariant: state.setMangekyouVariant,
      generateCustomSharinganWithAi: state.generateCustomSharinganWithAi,
      equipForgedEye: state.equipForgedEye,
      deleteForgedEye: state.deleteForgedEye,
    })),
  );

  const forgedEyesInventory = useForgedEyesInventory();
  const equippedForgedEyeId = useEquippedForgedEyeId();
  const ocularSpinBurstNonce = useOcularSpinBurstNonce();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compositeSeqRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [urlInput, setUrlInput] = useState<string>(() =>
    customEye.imageDataUrl && !customEye.imageDataUrl.startsWith('data:')
      ? customEye.imageDataUrl
      : '',
  );
  const [baseUserPhotoSrc, setBaseUserPhotoSrc] = useState<string | null>(() =>
    customEye.imageDataUrl &&
    !customEye.imageDataUrl.startsWith('data:image/svg+xml')
      ? customEye.imageDataUrl
      : null,
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCompositingLens, setIsCompositingLens] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyleVariant, setAiStyleVariant] = useState<AiStyleVariant>(mangekyouVariant);
  const [forgeMode, setForgeMode] = useState<ForgeOutputMode>(() =>
    baseUserPhotoSrc ? 'photo_lens' : 'anime_svg',
  );
  const [useLoadedPhotoForVision, setUseLoadedPhotoForVision] = useState(true);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [lensAdjustments, setLensAdjustments] = useState<LensAdjustments>(() => ({
    centerX: lastGeneratedSharingan?.eyeCenterX ?? 0.5,
    centerY: lastGeneratedSharingan?.eyeCenterY ?? 0.5,
    radiusRatio: lastGeneratedSharingan?.irisRadiusRatio ?? 0.22,
    opacity: 0.9,
  }));

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const photoSourceForLens =
    baseUserPhotoSrc ??
    (customEye.imageDataUrl &&
    !customEye.imageDataUrl.startsWith('data:image/svg+xml')
      ? customEye.imageDataUrl
      : null);

  const canSendVisionPhoto = Boolean(photoSourceForLens);

  async function runPhotoLensComposite(
    photoSrc: string,
    svgDataUri: string,
    crimsonHex: string,
    adjustments: LensAdjustments,
  ) {
    const seq = ++compositeSeqRef.current;
    setIsCompositingLens(true);
    setAiErrorMessage(null);

    try {
      const compositedDataUrl = await composeSharinganLensOnPhoto({
        photoSrc,
        sharinganSvgDataUri: svgDataUri,
        eyeCenterX: adjustments.centerX,
        eyeCenterY: adjustments.centerY,
        irisRadiusRatio: adjustments.radiusRatio,
        primaryCrimsonHex: crimsonHex,
        lensOpacity: adjustments.opacity,
      });

      if (seq !== compositeSeqRef.current) {
        return;
      }

      updateCustomEye({
        imageDataUrl: compositedDataUrl,
        enabled: true,
      });
    } catch (error) {
      if (seq !== compositeSeqRef.current) {
        return;
      }
      setAiErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível aplicar a lente Sharingan sobre a foto.',
      );
    } finally {
      if (seq === compositeSeqRef.current) {
        setIsCompositingLens(false);
      }
    }
  }

  function scheduleLensComposite(nextAdjustments: LensAdjustments) {
    if (!photoSourceForLens || !lastGeneratedSharingan?.svgDataUri) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const photoSrc = photoSourceForLens;
    const svgUri = lastGeneratedSharingan.svgDataUri;
    const crimson =
      lastGeneratedSharingan.primaryCrimsonHex ??
      lastGeneratedSharingan.primaryGlowColor ??
      '#DC2626';

    debounceTimerRef.current = setTimeout(() => {
      void runPhotoLensComposite(photoSrc, svgUri, crimson, nextAdjustments);
    }, 140);
  }

  async function processFile(file: File) {
    setErrorMessage(null);
    setAiErrorMessage(null);
    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressEyeImageFile(file, 512, 0.85);
      setBaseUserPhotoSrc(compressedDataUrl);
      setForgeMode('photo_lens');
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
    setAiErrorMessage(null);
    if (!trimmed.startsWith('data:image/svg+xml')) {
      setBaseUserPhotoSrc(trimmed);
      setForgeMode('photo_lens');
    }
    updateCustomEye({
      imageDataUrl: trimmed,
      enabled: true,
    });
  }

  function handleClearImage() {
    setErrorMessage(null);
    setAiErrorMessage(null);
    setUrlInput('');
    setBaseUserPhotoSrc(null);
    setForgeMode('anime_svg');
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

  async function handleGenerateWithGroqAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiErrorMessage(null);

    const shouldComposePhotoLens =
      forgeMode === 'photo_lens' && Boolean(photoSourceForLens);

    try {
      let visionImagePayload: string | null = null;
      if (photoSourceForLens && (useLoadedPhotoForVision || shouldComposePhotoLens)) {
        visionImagePayload = photoSourceForLens.startsWith('data:image/')
          ? await compressBase64ImageForVision(photoSourceForLens, 512, 0.8)
          : photoSourceForLens;
      }

      const generated = await generateCustomSharinganWithAi({
        prompt: aiPrompt.trim() || undefined,
        baseEyeImageBase64: visionImagePayload,
        styleVariant: aiStyleVariant,
        outputFormat: shouldComposePhotoLens ? 'photo_lens' : 'anime_svg',
        autoEquip: !shouldComposePhotoLens,
      });

      const nextLensAdjustments: LensAdjustments = {
        centerX: generated.eyeCenterX ?? 0.5,
        centerY: generated.eyeCenterY ?? 0.5,
        radiusRatio: generated.irisRadiusRatio ?? 0.22,
        opacity: lensAdjustments.opacity,
      };
      setLensAdjustments(nextLensAdjustments);

      if (shouldComposePhotoLens && photoSourceForLens) {
        await runPhotoLensComposite(
          photoSourceForLens,
          generated.svgDataUri,
          generated.primaryCrimsonHex ?? generated.primaryGlowColor ?? '#DC2626',
          nextLensAdjustments,
        );
      }
    } catch (error) {
      setAiErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível conectar à API do backend (.NET 8 + Groq AI). Verifique se a API está em execução.',
      );
    }
  }

  function handleApplyPureAnimeIris() {
    if (!lastGeneratedSharingan) return;
    setAiErrorMessage(null);
    if (!baseUserPhotoSrc && photoSourceForLens) {
      setBaseUserPhotoSrc(photoSourceForLens);
    }
    updateCustomEye({
      imageDataUrl: lastGeneratedSharingan.svgDataUri,
      enabled: true,
    });
  }

  function handleApplyPhotoLens() {
    if (!lastGeneratedSharingan) return;
    if (!photoSourceForLens) {
      setAiErrorMessage('Carregue uma foto acima para aplicar a lente Sharingan.');
      return;
    }

    void runPhotoLensComposite(
      photoSourceForLens,
      lastGeneratedSharingan.svgDataUri,
      lastGeneratedSharingan.primaryCrimsonHex ??
        lastGeneratedSharingan.primaryGlowColor ??
        '#DC2626',
      lensAdjustments,
    );
  }

  function handleSelectStyleOption(value: AiStyleVariant) {
    setAiStyleVariant(value);
    setAiErrorMessage(null);
    setErrorMessage(null);

    if (value === 'custom') {
      if (forgedEyesInventory.length > 0) {
        equipForgedEye(forgedEyesInventory[0].id);
      } else if (lastGeneratedSharingan?.svgDataUri) {
        updateCustomEye({
          imageDataUrl: lastGeneratedSharingan.svgDataUri,
          enabled: true,
        });
      }
      return;
    }

    setMangekyouVariant(value);
  }

  const hasImage = Boolean(customEye.imageDataUrl);
  const glowSpread = Math.round(customEye.glowIntensity * 28);
  const glowOpacity = Number((0.12 + customEye.glowIntensity * 0.65).toFixed(2));
  const previewBoxShadow = customEye.enabled && hasImage
    ? `0 0 ${glowSpread}px rgba(220, 38, 38, ${glowOpacity}), inset 0 0 24px #000000`
    : 'inset 0 0 24px #000000';

  const activePatternLabel = lastGeneratedSharingan
    ? PATTERN_LABELS[lastGeneratedSharingan.patternType] ??
      lastGeneratedSharingan.patternType
    : null;

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
            Substitua o vetor do Sharingan no Relógio Ocular por uma íris 100%
            fiel ao anime ou aplique a lente Sharingan diretamente sobre sua foto.
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
              key={`forge-preview-${equippedEyeStage}-${mangekyouVariant}-${hasImage && customEye.enabled ? (customEye.imageDataUrl?.slice(-24) ?? 'custom') : 'canon'}-${ocularSpinBurstNonce}`}
              className="relative inset-0 flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black origin-center"
              style={{ boxShadow: previewBoxShadow, transformOrigin: 'center center' }}
            >
              {customEye.imageDataUrl ? (
                <Image
                  src={customEye.imageDataUrl}
                  alt="Pré-visualização circular do olho customizado"
                  fill
                  unoptimized
                  className={cn(
                    'h-full w-full object-cover object-center origin-center transition-opacity duration-300',
                    customEye.enabled ? 'opacity-100' : 'opacity-45 grayscale',
                  )}
                  style={{
                    transform: `scale(${customEye.scale})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2">
                  <SharinganSvg
                    stage={equippedEyeStage}
                    variant={mangekyouVariant}
                    className="h-full w-full object-cover object-center origin-center"
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
              {isCompositingLens
                ? 'Aplicando lente Sharingan na foto...'
                : hasImage
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
                className="inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-lg border border-red-900/70 bg-red-950/40 px-3.5 py-2 text-xs font-medium text-red-100 transition-colors hover:border-red-600/80 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="min-h-[36px] shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 transition-colors hover:border-red-700/70 hover:bg-zinc-800"
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
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-transparent px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-900/70 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Remover imagem customizada</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Forja Ocular Groq AI (Vision + Motor Vetorial Anime HD) */}
      <div className="mt-8 border-t border-zinc-800/90 pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Groq AI · Motor Ocular &amp; Lente Vision</span>
            </div>
            <h4 className="mt-1 font-display text-lg font-semibold text-zinc-100">
              Forja Ocular por Inteligência Artificial
            </h4>
            <p className="mt-0.5 text-xs text-zinc-400">
              Parametrize um Mangekyou 100% fiel ao anime via Groq AI e aplique
              como esfera do relógio ou diretamente sobre a pupila da sua foto.
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
              placeholder="Ex.: Baseado no Mangekyou do Itachi, porém com 6 lâminas em espiral e chamas negras do Amaterasu"
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
                    onClick={() => handleSelectStyleOption(option.value)}
                    className={cn(
                      'min-h-[36px] cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
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
                Modo de Aplicação no Relógio
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForgeMode('anime_svg')}
                  className={cn(
                    'min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    forgeMode === 'anime_svg'
                      ? 'border-red-600/80 bg-red-950/50 text-red-100'
                      : 'border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  Íris Pura do Relógio (Anime HD)
                </button>
                <button
                  type="button"
                  disabled={!canSendVisionPhoto}
                  onClick={() => setForgeMode('photo_lens')}
                  className={cn(
                    'min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                    forgeMode === 'photo_lens' && canSendVisionPhoto
                      ? 'border-red-600/80 bg-red-950/50 text-red-100'
                      : 'border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  Aplicar Lente na Foto Carregada (Groq Vision)
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
                  ? 'Analisar imagem carregada acima com Groq Vision (Llama 4 Vision)'
                  : 'Carregue uma foto/URL não-SVG acima para ativar análise por Groq Vision'}
              </span>
            </label>

            <button
              type="submit"
              disabled={isGeneratingSharingan || isCompositingLens}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-lg border border-red-600/80 bg-red-700/85 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-50 shadow-[0_0_24px_rgba(220,38,38,0.28)] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingSharingan || isCompositingLens ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>
                    {isCompositingLens
                      ? 'Aplicando Lente na Foto...'
                      : 'Canalizando Groq AI...'}
                  </span>
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
          <div className="mt-5 rounded-xl border border-red-900/50 bg-[#09090B]/95 p-4 shadow-[0_0_28px_rgba(220,38,38,0.12)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white/25"
                    style={{
                      backgroundColor:
                        lastGeneratedSharingan.primaryCrimsonHex ??
                        lastGeneratedSharingan.primaryGlowColor,
                    }}
                  />
                  <span
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      getRarityBadgeClass(
                        lastGeneratedSharingan.ocularPowers.rarity,
                      ),
                    )}
                  >
                    {lastGeneratedSharingan.ocularPowers.rarity}
                  </span>
                  <h5 className="font-display text-sm font-semibold tracking-wide text-red-200">
                    {lastGeneratedSharingan.doujutsuName}
                  </h5>
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  {lastGeneratedSharingan.loreDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                {activePatternLabel ? (
                  <span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                    {activePatternLabel}
                  </span>
                ) : null}
                <span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {CENTER_SHAPE_LABELS[lastGeneratedSharingan.centerShape] ??
                    lastGeneratedSharingan.centerShape}
                </span>
                <span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {BLADE_STYLE_LABELS[lastGeneratedSharingan.bladeStyle] ??
                    lastGeneratedSharingan.bladeStyle}
                </span>
                <span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 font-mono text-[11px] tabular-nums text-zinc-300">
                  {lastGeneratedSharingan.bladeCount ?? 3} lâminas
                </span>
                {lastGeneratedSharingan.hasAmaterasuFlames ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-red-800/70 bg-red-950/50 px-2 py-0.5 text-[11px] font-medium text-red-200">
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    <span>Amaterasu</span>
                  </span>
                ) : null}
                {lastGeneratedSharingan.detectedMood ? (
                  <span className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] text-zinc-400">
                    {lastGeneratedSharingan.detectedMood}
                  </span>
                ) : null}
              </div>
            </div>

            {/* RPG Gameplay Powers: Left Eye Passive + Right Eye Active Jutsu */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/90 bg-[#121215]/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    <Shield className="h-3 w-3 text-red-400" aria-hidden="true" />
                    <span>Olho Esquerdo · Passiva</span>
                  </span>
                  <span className="rounded border border-zinc-700/80 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    {lastGeneratedSharingan.ocularPowers.leftEyePassive.type}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-zinc-100">
                  {lastGeneratedSharingan.ocularPowers.leftEyePassive.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  {lastGeneratedSharingan.ocularPowers.leftEyePassive.description}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800/90 bg-[#121215]/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    <Zap className="h-3 w-3 text-amber-400" aria-hidden="true" />
                    <span>Olho Direito · Jutsu Ativo</span>
                  </span>
                  <span className="rounded border border-zinc-700/80 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    {lastGeneratedSharingan.ocularPowers.rightEyeActiveJutsu.type}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-zinc-100">
                  {lastGeneratedSharingan.ocularPowers.rightEyeActiveJutsu.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  {
                    lastGeneratedSharingan.ocularPowers.rightEyeActiveJutsu
                      .description
                  }
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span>
                  Pitch Ocular:{' '}
                  <strong className="font-mono text-zinc-200">
                    {lastGeneratedSharingan.ocularPowers.visualThemeSignature.audioPitchRate.toFixed(
                      2,
                    )}
                    x
                  </strong>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span>Aura do Templo:</span>
                <span
                  className="inline-block h-3 w-3 rounded-full border border-white/25"
                  style={{
                    backgroundColor:
                      lastGeneratedSharingan.ocularPowers.visualThemeSignature
                        .primaryGlowColor,
                  }}
                />
                <span className="font-mono text-zinc-200">
                  {
                    lastGeneratedSharingan.ocularPowers.visualThemeSignature
                      .primaryGlowColor
                  }
                </span>
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApplyPureAnimeIris}
                className="min-h-[36px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-red-600/80 hover:text-red-100"
              >
                Equipar Íris Pura (Anime HD)
              </button>
              <button
                type="button"
                disabled={!canSendVisionPhoto || isCompositingLens}
                onClick={handleApplyPhotoLens}
                className="min-h-[36px] rounded-lg border border-red-900/70 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:border-red-600/80 hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Aplicar Lente na Foto Carregada
              </button>
            </div>

            {canSendVisionPhoto ? (
              <div className="mt-4 border-t border-zinc-800/80 pt-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                  <span>Ajuste Fino da Lente na Foto</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800/80 bg-[#121215]/70 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="lens-center-x" className="text-zinc-300">
                        Posição X
                      </label>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {Math.round(lensAdjustments.centerX * 100)}%
                      </span>
                    </div>
                    <input
                      id="lens-center-x"
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.01}
                      value={lensAdjustments.centerX}
                      onChange={(e) => {
                        const next = {
                          ...lensAdjustments,
                          centerX: Number(e.target.value),
                        };
                        setLensAdjustments(next);
                        scheduleLensComposite(next);
                      }}
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-[#121215]/70 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="lens-center-y" className="text-zinc-300">
                        Posição Y
                      </label>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {Math.round(lensAdjustments.centerY * 100)}%
                      </span>
                    </div>
                    <input
                      id="lens-center-y"
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.01}
                      value={lensAdjustments.centerY}
                      onChange={(e) => {
                        const next = {
                          ...lensAdjustments,
                          centerY: Number(e.target.value),
                        };
                        setLensAdjustments(next);
                        scheduleLensComposite(next);
                      }}
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-[#121215]/70 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="lens-radius" className="text-zinc-300">
                        Tamanho da Íris
                      </label>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {Math.round(lensAdjustments.radiusRatio * 100)}%
                      </span>
                    </div>
                    <input
                      id="lens-radius"
                      type="range"
                      min={0.05}
                      max={0.48}
                      step={0.01}
                      value={lensAdjustments.radiusRatio}
                      onChange={(e) => {
                        const next = {
                          ...lensAdjustments,
                          radiusRatio: Number(e.target.value),
                        };
                        setLensAdjustments(next);
                        scheduleLensComposite(next);
                      }}
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-[#121215]/70 p-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="lens-opacity" className="text-zinc-300">
                        Fusão Ocular
                      </label>
                      <span className="font-mono tabular-nums text-zinc-200">
                        {Math.round(lensAdjustments.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      id="lens-opacity"
                      type="range"
                      min={0.35}
                      max={1}
                      step={0.05}
                      value={lensAdjustments.opacity}
                      onChange={(e) => {
                        const next = {
                          ...lensAdjustments,
                          opacity: Number(e.target.value),
                        };
                        setLensAdjustments(next);
                        scheduleLensComposite(next);
                      }}
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-red-600"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Cofre de Danzou / Laboratório de Obito (Galeria de Olhos Forjados) */}
      <div className="mt-8 border-t border-zinc-800/90 pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-red-400">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cofre de Danzou · Laboratório de Obito</span>
            </div>
            <h4 className="mt-1 font-display text-lg font-semibold text-zinc-100">
              Inventário de Doujutsus Forjados
            </h4>
            <p className="mt-0.5 text-xs text-zinc-400">
              Cada Sharingan desperto pela IA é preservado neste cofre com suas
              próprias Passivas e Jutsus Ativos para equipar a qualquer momento.
            </p>
          </div>
          <span className="self-start rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 font-mono text-[11px] text-zinc-300 sm:self-center">
            {forgedEyesInventory.length}{' '}
            {forgedEyesInventory.length === 1 ? 'olho selado' : 'olhos selados'}
          </span>
        </div>

        {forgedEyesInventory.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-800 bg-[#09090B]/60 px-4 py-6 text-center text-xs text-zinc-500">
            Nenhum olho customizado selado ainda. Use a Forja Ocular acima para
            despertar seu primeiro Mangekyou único!
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {forgedEyesInventory.map((item) => {
              const isEquipped =
                customEye.enabled && equippedForgedEyeId === item.id;
              const glowHex =
                item.ocularPowers.visualThemeSignature.primaryGlowColor ||
                item.primaryCrimsonHex;

              return (
                <article
                  key={item.id}
                  className={cn(
                    'flex flex-col justify-between gap-4 rounded-xl border bg-[#09090B]/90 p-4 transition-all',
                    isEquipped
                      ? 'border-red-600/75 shadow-[0_0_24px_rgba(220,38,38,0.18)]'
                      : 'border-zinc-800/90 hover:border-zinc-700',
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-black"
                      style={{
                        boxShadow: `0 0 20px ${glowHex}55, inset 0 0 12px #000000`,
                      }}
                    >
                      <div
                        className="animate-ocular-spin relative flex h-full w-full items-center justify-center origin-center will-change-transform transform-gpu"
                        style={{
                          animationDuration: '24s',
                          transformOrigin: 'center center',
                        }}
                      >
                        <Image
                          src={item.compositeDataUrl ?? item.svgDataUri}
                          alt={item.doujutsuName}
                          fill
                          unoptimized
                          className="h-full w-full object-cover object-center origin-center"
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                            getRarityBadgeClass(item.ocularPowers.rarity),
                          )}
                        >
                          {item.ocularPowers.rarity}
                        </span>
                        <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {CENTER_SHAPE_LABELS[item.centerShape] ??
                            item.centerShape}{' '}
                          · {item.bladeCount}L
                        </span>
                      </div>
                      <h5 className="truncate font-display text-sm font-semibold text-zinc-100">
                        {item.doujutsuName}
                      </h5>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
                        {item.loreDescription}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-zinc-800/80 bg-[#121215]/75 p-2.5 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <Shield
                        className="mt-0.5 h-3 w-3 shrink-0 text-red-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-200">
                          Passiva: {item.ocularPowers.leftEyePassive.name}
                        </span>
                        <p className="text-zinc-400">
                          {item.ocularPowers.leftEyePassive.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 border-t border-zinc-800/60 pt-1.5">
                      <Zap
                        className="mt-0.5 h-3 w-3 shrink-0 text-amber-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-200">
                          Jutsu: {item.ocularPowers.rightEyeActiveJutsu.name}
                        </span>
                        <p className="text-zinc-400">
                          {item.ocularPowers.rightEyeActiveJutsu.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => equipForgedEye(item.id)}
                      className={cn(
                        'inline-flex min-h-[36px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        isEquipped
                          ? 'border-emerald-600/60 bg-emerald-950/45 text-emerald-200'
                          : 'border-red-700/75 bg-red-950/45 text-red-100 hover:bg-red-900/60',
                      )}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Equipado no Templo</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Equipar no Templo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteForgedEye(item.id)}
                      aria-label={`Remover ${item.doujutsuName} do cofre`}
                      className="inline-flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-transparent text-zinc-400 transition-colors hover:border-red-900/70 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
