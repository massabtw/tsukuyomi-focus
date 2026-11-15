const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/webp',
  'image/jpeg',
  'image/jpg',
]);

const ACCEPTED_EXTENSION_REGEX = /\.(png|webp|jpe?g)$/i;

export function isSupportedEyeImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  return ACCEPTED_EXTENSION_REGEX.test(file.name);
}

export function isValidEyeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function loadImageFromSrc(
  src: string,
  fallbackErrorMessage: string,
  allowCrossOrigin = false,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (allowCrossOrigin && /^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(fallbackErrorMessage));
    img.src = src;
  });
}

export interface SharinganLensCompositeOptions {
  photoSrc: string;
  sharinganSvgDataUri: string;
  eyeCenterX: number;
  eyeCenterY: number;
  irisRadiusRatio: number;
  primaryCrimsonHex?: string;
  lensOpacity?: number;
  outputSize?: number;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Composites an anime-accurate Sharingan SVG lens onto a user photo at the detected
 * iris coordinates using Uchiha color grading, eyelid feathering, and layered blend modes.
 */
export async function composeSharinganLensOnPhoto({
  photoSrc,
  sharinganSvgDataUri,
  eyeCenterX,
  eyeCenterY,
  irisRadiusRatio,
  primaryCrimsonHex = '#DC2626',
  lensOpacity = 0.9,
  outputSize = 768,
}: SharinganLensCompositeOptions): Promise<string> {
  const [photoImg, sharinganImg] = await Promise.all([
    loadImageFromSrc(photoSrc, 'Não foi possível carregar a foto base para a lente Sharingan.', true),
    loadImageFromSrc(sharinganSvgDataUri, 'Não foi possível renderizar o SVG do Sharingan.'),
  ]);

  const srcW = photoImg.naturalWidth || photoImg.width;
  const srcH = photoImg.naturalHeight || photoImg.height;
  if (srcW <= 0 || srcH <= 0) {
    throw new Error('Dimensões inválidas da foto base.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexto 2D indisponível para compor a lente Sharingan.');
  }

  // Cover-fit the user photo into the square sphere canvas
  const coverScale = Math.max(outputSize / srcW, outputSize / srcH);
  const drawW = srcW * coverScale;
  const drawH = srcH * coverScale;
  const offsetX = (outputSize - drawW) / 2;
  const offsetY = (outputSize - drawH) / 2;

  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, outputSize, outputSize);

  ctx.save();
  ctx.filter = 'contrast(1.16) saturate(0.84) brightness(0.93)';
  ctx.drawImage(photoImg, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  // Dramatic dark Uchiha vignette around the photo
  const vignette = ctx.createRadialGradient(
    outputSize * 0.5,
    outputSize * 0.5,
    outputSize * 0.28,
    outputSize * 0.5,
    outputSize * 0.5,
    outputSize * 0.56,
  );
  vignette.addColorStop(0, 'rgba(9, 9, 11, 0)');
  vignette.addColorStop(0.72, 'rgba(9, 9, 11, 0.22)');
  vignette.addColorStop(1, 'rgba(9, 9, 11, 0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, outputSize, outputSize);

  const clampedX = clampNumber(eyeCenterX, 0.05, 0.95);
  const clampedY = clampNumber(eyeCenterY, 0.05, 0.95);
  const clampedRadius = clampNumber(irisRadiusRatio, 0.05, 0.5);

  const cx = offsetX + clampedX * drawW;
  const cy = offsetY + clampedY * drawH;
  const radius = Math.max(20, clampedRadius * Math.min(drawW, drawH));
  const opacity = clampNumber(lensOpacity, 0.2, 1);

  // Build feathered eyelid-masked Sharingan lens in an offscreen canvas
  const lensPadding = Math.ceil(radius * 0.16);
  const lensCanvasSize = Math.ceil((radius + lensPadding) * 2);
  const lensCenter = lensCanvasSize / 2;
  const lensCanvas = document.createElement('canvas');
  lensCanvas.width = lensCanvasSize;
  lensCanvas.height = lensCanvasSize;
  const lensCtx = lensCanvas.getContext('2d');

  if (!lensCtx) {
    throw new Error('Contexto 2D indisponível para a máscara ocular.');
  }

  lensCtx.drawImage(
    sharinganImg,
    lensCenter - radius,
    lensCenter - radius,
    radius * 2,
    radius * 2,
  );

  // Feather the outer limbal border & upper/lower eyelid arc softly
  lensCtx.save();
  lensCtx.globalCompositeOperation = 'destination-in';
  lensCtx.translate(lensCenter, lensCenter);
  lensCtx.scale(1.06, 0.9);
  const maskGrad = lensCtx.createRadialGradient(0, 0, radius * 0.52, 0, 0, radius * 1.03);
  maskGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  maskGrad.addColorStop(0.84, 'rgba(255, 255, 255, 0.96)');
  maskGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.55)');
  maskGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  lensCtx.fillStyle = maskGrad;
  lensCtx.beginPath();
  lensCtx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
  lensCtx.fill();
  lensCtx.restore();

  // Pass 1: Multiply base dark iris seat so bright eyes take obsidian depth naturally
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = opacity * 0.45;
  ctx.drawImage(lensCanvas, cx - lensCenter, cy - lensCenter);
  ctx.restore();

  // Pass 2: Source-over crisp anime Sharingan core for faithful crimson & obsidian contrast
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = opacity * 0.78;
  ctx.drawImage(lensCanvas, cx - lensCenter, cy - lensCenter);
  ctx.restore();

  // Pass 3: Screen crimson glow pass & corneal reflection boost
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = opacity * 0.46;
  ctx.drawImage(lensCanvas, cx - lensCenter, cy - lensCenter);

  const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius * 1.35);
  auraGrad.addColorStop(0, `${primaryCrimsonHex}44`);
  auraGrad.addColorStop(0.6, `${primaryCrimsonHex}22`);
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const webpDataUrl = canvas.toDataURL('image/webp', 0.9);
  if (webpDataUrl.startsWith('data:image/webp')) {
    return webpDataUrl;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  return loadImageFromSrc(objectUrl, 'Falha ao carregar imagem selecionada.')
    .finally(() => {
      URL.revokeObjectURL(objectUrl);
    });
}

/**
 * Resizes and compresses a Base64 data URL image to <= 512x512 JPEG
 * before sending to Groq Vision to avoid payload limits.
 */
export async function compressBase64ImageForVision(
  dataUrl: string,
  maxDimension = 512,
  quality = 0.8,
): Promise<string> {
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const img = await loadImageFromSrc(trimmed, 'Falha ao comprimir imagem para Groq Vision.');
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (srcWidth <= 0 || srcHeight <= 0) {
    return trimmed;
  }

  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return trimmed;
  }

  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resizes and compresses an uploaded image file via HTML5 Canvas to <= 512x512 WebP
 * so it fits comfortably within localStorage quota.
 */
export async function compressEyeImageFile(
  file: File,
  maxDimension = 512,
  quality = 0.85,
): Promise<string> {
  if (!isSupportedEyeImageFile(file)) {
    throw new Error('Formato inválido. Use PNG, WebP ou JPG.');
  }

  const img = await loadImageFromFile(file);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error('Dimensões inválidas da imagem.');
  }

  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexto 2D indisponível para compressão da imagem.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webpDataUrl = canvas.toDataURL('image/webp', quality);
  if (webpDataUrl.startsWith('data:image/webp')) {
    return webpDataUrl;
  }

  return canvas.toDataURL('image/jpeg', quality);
}
