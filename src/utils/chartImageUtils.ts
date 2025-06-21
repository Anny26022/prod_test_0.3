import { ChartImage, ChartImageBlob } from '../types/trade';
import { DatabaseService } from '../db/database';
import { generateId } from './helpers';

// Configuration constants
export const CHART_IMAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB max file size
  INLINE_THRESHOLD: 50 * 1024, // 50KB threshold for inline vs blob storage
  COMPRESSION_QUALITY: 0.85, // JPEG compression quality (increased for better quality)
  WEBP_QUALITY: 0.8, // WebP compression quality (better compression)
  MAX_DIMENSION: 2048, // Max width/height for compression
  AGGRESSIVE_COMPRESSION_THRESHOLD: 500 * 1024, // 500KB - use more aggressive compression
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.webp'] as const,
  // Progressive JPEG for better loading experience
  PROGRESSIVE_JPEG: true,
};

// Image validation
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export function validateImageFile(file: File): ImageValidationResult {
  const result: ImageValidationResult = { isValid: true, warnings: [] };

  // Check file size
  if (file.size > CHART_IMAGE_CONFIG.MAX_FILE_SIZE) {
    result.isValid = false;
    result.error = `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(CHART_IMAGE_CONFIG.MAX_FILE_SIZE)})`;
    return result;
  }

  // Check file type
  if (!CHART_IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type as any)) {
    result.isValid = false;
    result.error = `File type "${file.type}" is not supported. Allowed types: ${CHART_IMAGE_CONFIG.ALLOWED_TYPES.join(', ')}`;
    return result;
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!CHART_IMAGE_CONFIG.ALLOWED_EXTENSIONS.includes(extension as any)) {
    result.isValid = false;
    result.error = `File extension "${extension}" is not supported. Allowed extensions: ${CHART_IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`;
    return result;
  }

  // Add warnings for large files
  if (file.size > CHART_IMAGE_CONFIG.INLINE_THRESHOLD) {
    result.warnings?.push(`Large file (${formatFileSize(file.size)}) will be stored separately for better performance`);
  }

  return result;
}

// Enhanced image compression with smart format selection
export async function compressImage(file: File, maxDimension = CHART_IMAGE_CONFIG.MAX_DIMENSION, customQuality?: number): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  outputFormat: string;
}> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const needsResize = width > maxDimension || height > maxDimension;

        if (needsResize) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Enable image smoothing for better quality
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Smart format and quality selection
        const isLargeFile = file.size > CHART_IMAGE_CONFIG.AGGRESSIVE_COMPRESSION_THRESHOLD;
        let outputFormat: string;
        let quality: number;

        // Choose optimal format and quality
        if (file.type === 'image/png' && !hasTransparency(ctx, width, height)) {
          // Convert PNG without transparency to JPEG for better compression
          outputFormat = 'image/jpeg';
          quality = customQuality ?? (isLargeFile ? 0.75 : CHART_IMAGE_CONFIG.COMPRESSION_QUALITY);
        } else if (file.type === 'image/png') {
          // Keep PNG for transparency
          outputFormat = 'image/png';
          quality = 1; // PNG doesn't use quality parameter
        } else if (supportsWebP() && isLargeFile) {
          // Use WebP for large files if supported
          outputFormat = 'image/webp';
          quality = customQuality ?? CHART_IMAGE_CONFIG.WEBP_QUALITY;
        } else {
          // Default to JPEG
          outputFormat = 'image/jpeg';
          quality = customQuality ?? (isLargeFile ? 0.75 : CHART_IMAGE_CONFIG.COMPRESSION_QUALITY);
        }

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: outputFormat,
            lastModified: Date.now(),
          });

          resolve({
            compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: file.size / compressedFile.size,
            outputFormat,
          });
        }, outputFormat, quality);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Check if image has transparency (for PNG optimization)
function hasTransparency(ctx: CanvasRenderingContext2D | null, width: number, height: number): boolean {
  if (!ctx) return false;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Check alpha channel (every 4th value)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true; // Found transparency
      }
    }
    return false;
  } catch {
    return true; // Assume transparency if we can't check
  }
}

// Check WebP support
function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Get image dimensions
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Convert file to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix to get just the base64 data
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Create chart image record
export async function createChartImage(
  file: File,
  shouldCompress: boolean = true
): Promise<ChartImage> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  let processedFile = file;
  let compressed = false;
  let originalSize = file.size;

  // Compress if needed and requested
  if (shouldCompress && (file.size > CHART_IMAGE_CONFIG.INLINE_THRESHOLD || file.type !== 'image/webp')) {
    try {
      const compressionResult = await compressImage(file);
      processedFile = compressionResult.compressedFile;
      compressed = true;
      console.log(`📸 Image optimized: ${formatFileSize(originalSize)} → ${formatFileSize(processedFile.size)} (${compressionResult.compressionRatio.toFixed(2)}x) [${compressionResult.outputFormat}]`);
    } catch (error) {
      console.warn('⚠️ Image compression failed, using original:', error);
    }
  }

  const dimensions = await getImageDimensions(processedFile);
  const useInlineStorage = processedFile.size <= CHART_IMAGE_CONFIG.INLINE_THRESHOLD;

  const chartImage: ChartImage = {
    id: generateId(),
    filename: file.name,
    mimeType: processedFile.type as any,
    size: processedFile.size,
    uploadedAt: new Date(),
    storage: useInlineStorage ? 'inline' : 'blob',
    dimensions,
    compressed,
    originalSize: compressed ? originalSize : undefined,
  };

  if (useInlineStorage) {
    // Store as base64 inline
    chartImage.data = await fileToBase64(processedFile);
  } else {
    // Store as blob reference
    chartImage.blobId = chartImage.id;
  }

  return chartImage;
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getImageDataUrl(chartImage: ChartImage): string | null {
  if (chartImage.storage === 'inline' && chartImage.data) {
    return `data:${chartImage.mimeType};base64,${chartImage.data}`;
  }
  return null;
}

// Storage size calculation for trade
export function calculateChartAttachmentsSize(chartAttachments?: any): number {
  if (!chartAttachments) return 0;
  
  let totalSize = 0;
  if (chartAttachments.beforeEntry) {
    totalSize += chartAttachments.beforeEntry.size || 0;
  }
  if (chartAttachments.afterExit) {
    totalSize += chartAttachments.afterExit.size || 0;
  }
  
  return totalSize;
}
