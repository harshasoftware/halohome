/**
 * SAM v2 Segmentation Service
 *
 * Uses Meta's Segment Anything Model v2 via @xenova/transformers for
 * in-browser image segmentation. This is the standard extraction method
 * for both plot boundaries and building footprints.
 */

import type { LatLng } from '@/lib/building-footprints/coordinate-utils';
import { imagePixelToLatLng, type BoundingBox } from '@/lib/building-footprints/coordinate-utils';

// Types for SAM segmentation
export interface SegmentationPoint {
  x: number;
  y: number;
  label: 0 | 1; // 0 = background, 1 = foreground
}

export interface SegmentationBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SegmentationResult {
  mask: ImageData;
  score: number;
  polygons: Array<{ x: number; y: number }[]>;
}

export interface SAMConfig {
  model: 'sam-vit-base' | 'sam-vit-large' | 'sam-vit-huge';
  quantized: boolean;
  device: 'webgpu' | 'wasm' | 'cpu';
}

const DEFAULT_CONFIG: SAMConfig = {
  model: 'sam-vit-base', // Start with base for faster loading
  quantized: true, // Use quantized model for smaller size
  device: 'webgpu', // Prefer WebGPU for performance
};

// SAM pipeline state
let samPipeline: any = null;
let isLoading = false;
let loadError: Error | null = null;
let currentConfig: SAMConfig | null = null;

// Progress callback type
type ProgressCallback = (progress: { status: string; progress: number }) => void;

/**
 * Check if WebGPU is available in the browser
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Get the best available compute device
 */
export async function getBestDevice(): Promise<'webgpu' | 'wasm' | 'cpu'> {
  if (await isWebGPUAvailable()) {
    return 'webgpu';
  }
  // WASM is generally available in modern browsers
  return 'wasm';
}

/**
 * Load the SAM model
 *
 * @param config - Model configuration
 * @param onProgress - Progress callback
 */
export async function loadSAMModel(
  config: Partial<SAMConfig> = {},
  onProgress?: ProgressCallback
): Promise<void> {
  if (isLoading) {
    throw new Error('SAM model is already loading');
  }

  const finalConfig: SAMConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    device: config.device || (await getBestDevice()),
  };

  // Check if already loaded with same config
  if (samPipeline && currentConfig?.model === finalConfig.model) {
    return;
  }

  isLoading = true;
  loadError = null;

  try {
    onProgress?.({ status: 'Loading transformers.js library', progress: 5 });

    // Dynamic import of transformers.js
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure environment
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    onProgress?.({ status: 'Initializing SAM model', progress: 15 });

    // Determine model path based on config
    const modelId = getModelId(finalConfig);

    onProgress?.({ status: `Loading ${finalConfig.model}`, progress: 25 });

    // Create the image segmentation pipeline
    samPipeline = await pipeline('image-segmentation', modelId, {
      quantized: finalConfig.quantized,
      device: finalConfig.device,
      progress_callback: (data: any) => {
        if (data.status === 'downloading') {
          const progress = 25 + (data.progress || 0) * 0.6; // 25-85%
          onProgress?.({
            status: `Downloading model: ${Math.round(data.progress || 0)}%`,
            progress,
          });
        } else if (data.status === 'loading') {
          onProgress?.({ status: 'Loading model into memory', progress: 90 });
        }
      },
    });

    currentConfig = finalConfig;
    onProgress?.({ status: 'SAM model ready', progress: 100 });
  } catch (error) {
    loadError = error instanceof Error ? error : new Error(String(error));
    throw loadError;
  } finally {
    isLoading = false;
  }
}

/**
 * Get the Hugging Face model ID based on config
 * 
 * Note: SlimSAM requires SamModel/AutoProcessor (not pipeline).
 * For now, we use SegFormer which works with image-segmentation pipeline.
 * TODO: Migrate to SamModel/AutoProcessor for full SAM support.
 */
function getModelId(config: SAMConfig): string {
  // Using SegFormer models that work with image-segmentation pipeline
  // These provide automatic segmentation without prompts
  const modelMap: Record<string, string> = {
    'sam-vit-base': 'Xenova/segformer-b1-finetuned-ade-512-512', // General segmentation
    'sam-vit-large': 'Xenova/segformer-b1-finetuned-cityscapes-1024-1024', // Higher detail
    'sam-vit-huge': 'Xenova/segformer-b5-finetuned-cityscapes-1024-1024', // Best quality
  };
  return modelMap[config.model] || modelMap['sam-vit-base'];
}

/**
 * Check if SAM is loaded and ready
 */
export function isSAMReady(): boolean {
  return samPipeline !== null && !isLoading;
}

/**
 * Get loading state
 */
export function getSAMLoadingState(): {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
} {
  return {
    isLoading,
    isReady: samPipeline !== null,
    error: loadError,
  };
}

/**
 * Segment an image using point prompts
 *
 * @param imageSource - Image URL, data URL, or ImageData
 * @param points - Array of point prompts (click locations)
 * @returns Segmentation results
 */
export async function segmentWithPoints(
  imageSource: string | ImageData,
  points: SegmentationPoint[]
): Promise<SegmentationResult[]> {
  if (!samPipeline) {
    throw new Error('SAM model not loaded. Call loadSAMModel() first.');
  }

  // Convert ImageData to data URL if needed
  const imageUrl = imageSource instanceof ImageData
    ? imageDataToDataURL(imageSource)
    : imageSource;

  // Format points for SAM
  const inputPoints = points.map((p) => [[p.x, p.y]]);
  const inputLabels = points.map((p) => [p.label]);

  try {
    // Yield control before segmentation to allow UI updates
    await new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(undefined), { timeout: 100 });
      } else {
        setTimeout(() => resolve(undefined), 0);
      }
    });

    // Note: This operation is still CPU/GPU intensive and may block briefly
    // For full non-blocking, consider using a Web Worker
    const results = await samPipeline(imageUrl, {
      input_points: inputPoints,
      input_labels: inputLabels,
    });

    return processSegmentationResults(results);
  } catch (error) {
    console.error('SAM segmentation error:', error);
    throw error;
  }
}

/**
 * Segment an image using a bounding box prompt
 *
 * @param imageSource - Image URL, data URL, or ImageData
 * @param box - Bounding box prompt
 * @returns Segmentation results
 */
export async function segmentWithBox(
  imageSource: string | ImageData,
  box: SegmentationBox
): Promise<SegmentationResult[]> {
  if (!samPipeline) {
    throw new Error('SAM model not loaded. Call loadSAMModel() first.');
  }

  const imageUrl = imageSource instanceof ImageData
    ? imageDataToDataURL(imageSource)
    : imageSource;

  try {
    const results = await samPipeline(imageUrl, {
      input_boxes: [[[box.x1, box.y1, box.x2, box.y2]]],
    });

    return processSegmentationResults(results);
  } catch (error) {
    console.error('SAM segmentation error:', error);
    throw error;
  }
}

/**
 * Automatic segmentation of entire image
 * Detects all distinct objects/regions
 *
 * @param imageSource - Image URL, data URL, or ImageData
 * @param threshold - Confidence threshold (0-1)
 * @returns Array of segmentation results
 */
export async function segmentAutomatic(
  imageSource: string | ImageData,
  threshold: number = 0.5
): Promise<SegmentationResult[]> {
  if (!samPipeline) {
    throw new Error('SAM model not loaded. Call loadSAMModel() first.');
  }

  const imageUrl = imageSource instanceof ImageData
    ? imageDataToDataURL(imageSource)
    : imageSource;

  try {
    // Yield control before segmentation to allow UI updates
    // This helps keep the map interactive during processing
    await new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(undefined), { timeout: 100 });
      } else {
        setTimeout(() => resolve(undefined), 0);
      }
    });

    // SegFormer models work with simple pipeline call (no special params)
    // Results are automatically returned as array of { label, mask, score }
    // Note: This operation is still CPU/GPU intensive and may block briefly
    // For full non-blocking, consider using a Web Worker
    const results = await samPipeline(imageUrl);

    console.log('[SAM] SegFormer returned', results?.length || 0, 'segmentation results');
    if (results && results.length > 0) {
      console.log('[SAM] First result structure:', {
        hasLabel: !!results[0].label,
        hasMask: !!results[0].mask,
        hasScore: results[0].score !== undefined,
        score: results[0].score,
        threshold,
        maskType: results[0].mask?.constructor?.name,
        maskKeys: results[0].mask ? Object.keys(results[0].mask) : [],
      });
      // Log all scores
      const scores = results.map((r: any) => r.score).filter((s: any) => s !== undefined);
      if (scores.length > 0) {
        console.log('[SAM] All scores:', scores, 'min:', Math.min(...scores), 'max:', Math.max(...scores));
      }
    }

    // Filter by threshold if score is available
    // Note: SegFormer may not always provide scores, so we include results without scores
    // and use a default confidence value
    const filteredResults = results.filter((r: any) => {
      // SegFormer sometimes returns null scores - treat as valid result with default confidence
      if (r.score === null || r.score === undefined) {
        console.log(`[SAM] Result has no score, including with default confidence`);
        return true; // Include results without scores
      }
      
      // SegFormer scores are usually already normalized 0-1, but check if they're in 0-100 range
      const normalizedScore = r.score > 1 ? r.score / 100 : r.score;
      const passes = normalizedScore >= threshold;
      if (!passes) {
        console.log(`[SAM] Filtered out result: score ${r.score} (normalized: ${normalizedScore}) < threshold ${threshold}`);
      }
      return passes;
    });

    console.log('[SAM] After filtering:', filteredResults.length, 'results (from', results.length, 'total)');

    return processSegmentationResults(filteredResults);
  } catch (error) {
    console.error('SAM automatic segmentation error:', error);
    throw error;
  }
}

/**
 * Process raw segmentation results into our format
 */
function processSegmentationResults(results: any[]): SegmentationResult[] {
  if (!Array.isArray(results)) {
    results = [results];
  }

  return results.map((result, idx) => {
    const mask = result.mask;
    // SegFormer may return null scores - use default confidence of 0.5 for results without scores
    // This allows the results to pass through and be evaluated by area/quality filters instead
    const score = result.score !== null && result.score !== undefined ? result.score : 0.5;

    // Extract polygons from the mask
    const polygons = maskToPolygons(mask);
    
    console.log(`[SAM] Result ${idx}: score=${result.score} (using ${score}), polygons=${polygons.length}, mask format:`, {
      isImageData: mask instanceof ImageData,
      hasData: !!mask?.data,
      hasWidth: mask?.width !== undefined,
      hasHeight: mask?.height !== undefined,
      maskType: mask?.constructor?.name,
    });

    return {
      mask,
      score,
      polygons,
    };
  });
}

/**
 * Convert a segmentation mask to polygon coordinates
 */
function maskToPolygons(mask: any): Array<{ x: number; y: number }[]> {
  // Handle different mask formats from transformers.js
  if (!mask) {
    console.warn('[SAM] maskToPolygons: mask is null/undefined');
    return [];
  }

  const polygons: Array<{ x: number; y: number }[]> = [];

  // Handle _RawImage format from transformers.js (SegFormer output)
  // _RawImage has: data (Uint8Array), width, height, channels
  if (mask.constructor?.name === '_RawImage' || (mask.data && mask.width && mask.height && mask.channels)) {
    const { width, height, data, channels = 1 } = mask;
    const binaryMask = new Uint8Array(width * height);
    
    console.log(`[SAM] Processing _RawImage mask: ${width}x${height}, channels: ${channels}, data length: ${data.length}`);
    
    // Handle different channel formats
    if (channels === 1) {
      // Grayscale: single channel
      for (let i = 0; i < data.length && i < binaryMask.length; i++) {
        binaryMask[i] = data[i] > 128 ? 1 : 0;
      }
    } else if (channels === 3 || channels === 4) {
      // RGB/RGBA: check if any channel is > 128
      const pixels = data.length / channels;
      for (let i = 0; i < pixels && i < binaryMask.length; i++) {
        const idx = i * channels;
        let maxVal = 0;
        for (let c = 0; c < channels; c++) {
          if (data[idx + c] > maxVal) {
            maxVal = data[idx + c];
          }
        }
        binaryMask[i] = maxVal > 128 ? 1 : 0;
      }
    } else {
      // Fallback: treat as grayscale
      for (let i = 0; i < Math.min(data.length, binaryMask.length); i++) {
        binaryMask[i] = data[i] > 128 ? 1 : 0;
      }
    }

    const contours = findContours(binaryMask, width, height);
    polygons.push(...contours);
    console.log(`[SAM] _RawImage mask: ${width}x${height}, extracted ${contours.length} contours`);
    return polygons;
  }

  // Handle ImageData format (browser native)
  if (mask instanceof ImageData) {
    const { width, height, data } = mask;
    const binaryMask = new Uint8Array(width * height);
    
    // Convert RGBA to binary (check if any channel is > 128)
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // Consider pixel as foreground if alpha > 128 or any RGB channel > 128
      binaryMask[pixelIdx] = (a > 128 || r > 128 || g > 128 || b > 128) ? 1 : 0;
    }

    const contours = findContours(binaryMask, width, height);
    polygons.push(...contours);
    console.log(`[SAM] ImageData mask: ${width}x${height}, extracted ${contours.length} contours`);
    return polygons;
  }

  // If mask has data property (RLEMask or tensor format)
  if (mask.data && mask.width && mask.height) {
    const { width, height, data } = mask;

    // Find contours using a simple marching squares algorithm
    const binaryMask = new Uint8Array(width * height);
    
    // Handle different data formats
    if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
      for (let i = 0; i < data.length; i++) {
        binaryMask[i] = data[i] > 128 ? 1 : 0;
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        binaryMask[i] = data[i] > 0.5 ? 1 : 0;
      }
    } else if (data.data) {
      // Handle tensor-like format (e.g., from transformers.js)
      const tensorData = data.data;
      for (let i = 0; i < Math.min(tensorData.length, binaryMask.length); i++) {
        binaryMask[i] = tensorData[i] > 0.5 ? 1 : 0;
      }
    }

    const contours = findContours(binaryMask, width, height);
    polygons.push(...contours);
    console.log(`[SAM] Tensor mask: ${width}x${height}, extracted ${contours.length} contours`);
    return polygons;
  }

  console.warn('[SAM] maskToPolygons: Unsupported mask format:', {
    type: mask.constructor?.name,
    keys: Object.keys(mask),
    hasData: !!mask.data,
    hasWidth: mask.width !== undefined,
    hasHeight: mask.height !== undefined,
  });

  return polygons;
}

/**
 * Simple contour finding using marching squares
 */
function findContours(
  mask: Uint8Array,
  width: number,
  height: number
): Array<{ x: number; y: number }[]> {
  const contours: Array<{ x: number; y: number }[]> = [];
  const visited = new Set<string>();

  // Find edge pixels and trace contours
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const key = `${x},${y}`;

      if (mask[idx] && !visited.has(key)) {
        // Check if this is an edge pixel
        const isEdge =
          !mask[(y - 1) * width + x] ||
          !mask[(y + 1) * width + x] ||
          !mask[y * width + x - 1] ||
          !mask[y * width + x + 1];

        if (isEdge) {
          const contour = traceContour(mask, width, height, x, y, visited);
          if (contour.length >= 4) {
            // Simplify the contour
            const simplified = simplifyPolygon(contour, 2);
            if (simplified.length >= 4) {
              contours.push(simplified);
            }
          }
        }
      }
    }
  }

  return contours;
}

/**
 * Trace a single contour starting from a point
 */
function traceContour(
  mask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<string>
): { x: number; y: number }[] {
  const contour: { x: number; y: number }[] = [];
  const directions = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1],
  ];

  let x = startX;
  let y = startY;
  let dir = 0;

  do {
    const key = `${x},${y}`;
    if (!visited.has(key)) {
      visited.add(key);
      contour.push({ x, y });
    }

    // Find next edge pixel
    let found = false;
    for (let i = 0; i < 8; i++) {
      const newDir = (dir + i) % 8;
      const [dx, dy] = directions[newDir];
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (mask[idx]) {
          // Check if it's an edge
          const isEdge =
            ny === 0 || ny === height - 1 || nx === 0 || nx === width - 1 ||
            !mask[(ny - 1) * width + nx] ||
            !mask[(ny + 1) * width + nx] ||
            !mask[ny * width + nx - 1] ||
            !mask[ny * width + nx + 1];

          if (isEdge) {
            x = nx;
            y = ny;
            dir = (newDir + 5) % 8; // Opposite direction
            found = true;
            break;
          }
        }
      }
    }

    if (!found) break;
  } while (!(x === startX && y === startY) && contour.length < 10000);

  return contour;
}

/**
 * Simplify polygon using Ramer-Douglas-Peucker algorithm
 */
function simplifyPolygon(
  points: { x: number; y: number }[],
  epsilon: number
): { x: number; y: number }[] {
  if (points.length < 3) return points;

  // Find the point with maximum distance from line
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPolygon(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolygon(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag === 0) {
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    );
  }

  const u =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
    (mag * mag);

  let closestX: number;
  let closestY: number;

  if (u < 0) {
    closestX = lineStart.x;
    closestY = lineStart.y;
  } else if (u > 1) {
    closestX = lineEnd.x;
    closestY = lineEnd.y;
  } else {
    closestX = lineStart.x + u * dx;
    closestY = lineStart.y + u * dy;
  }

  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
}

/**
 * Convert ImageData to data URL
 */
function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Unload the SAM model to free memory
 */
export async function unloadSAMModel(): Promise<void> {
  if (samPipeline) {
    // Attempt to dispose of the model
    try {
      if (typeof samPipeline.dispose === 'function') {
        await samPipeline.dispose();
      }
    } catch {
      // Ignore disposal errors
    }
    samPipeline = null;
    currentConfig = null;
  }
}

/**
 * Convert pixel coordinates to lat/lng using tile bounds
 * Uses the shared imagePixelToLatLng function for consistency with other coordinate conversions
 */
export function pixelPolygonsToLatLng(
  polygons: Array<{ x: number; y: number }[]>,
  tileBounds: BoundingBox,
  imageWidth: number,
  imageHeight: number
): Array<LatLng[]> {
  return polygons.map((polygon) =>
    polygon.map((point) => imagePixelToLatLng({ x: point.x, y: point.y }, imageWidth, imageHeight, tileBounds))
  );
}
