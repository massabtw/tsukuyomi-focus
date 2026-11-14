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

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem selecionada.'));
    };
    img.src = objectUrl;
  });
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
