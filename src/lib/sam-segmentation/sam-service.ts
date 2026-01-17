/**
 * SAM v2 Segmentation Service
 *
 * Uses Meta's Segment Anything Model v2 via @xenova/transformers for
 * in-browser image segmentation. This is the standard extraction method
 * for both plot boundaries and building footprints.
 */

import type { LatLng } from '@/lib/building-footprints/coordinate-utils';

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
 */
function getModelId(config: SAMConfig): string {
  // Using Xenova's converted SAM models for transformers.js
  const modelMap: Record<string, string> = {
    'sam-vit-base': 'Xenova/slimsam-77-uniform',
    'sam-vit-large': 'Xenova/sam-vit-base',
    'sam-vit-huge': 'Xenova/sam-vit-large',
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
    // Use automatic mask generation
    const results = await samPipeline(imageUrl, {
      mask_threshold: threshold,
      pred_iou_thresh: threshold,
      stability_score_thresh: threshold,
    });

    return processSegmentationResults(results);
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

  return results.map((result) => {
    const mask = result.mask;
    const score = result.score || 1.0;

    // Extract polygons from the mask
    const polygons = maskToPolygons(mask);

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
  if (!mask) return [];

  const polygons: Array<{ x: number; y: number }[]> = [];

  // If mask has data property (RLEMask or similar)
  if (mask.data && mask.width && mask.height) {
    const { width, height, data } = mask;

    // Find contours using a simple marching squares algorithm
    const binaryMask = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i++) {
      binaryMask[i] = data[i] > 0.5 ? 1 : 0;
    }

    const contours = findContours(binaryMask, width, height);
    polygons.push(...contours);
  }

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
 */
export function pixelPolygonsToLatLng(
  polygons: Array<{ x: number; y: number }[]>,
  tileBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  imageWidth: number,
  imageHeight: number
): Array<LatLng[]> {
  const latRange = tileBounds.north - tileBounds.south;
  const lngRange = tileBounds.east - tileBounds.west;

  return polygons.map((polygon) =>
    polygon.map((point) => ({
      lat: tileBounds.north - (point.y / imageHeight) * latRange,
      lng: tileBounds.west + (point.x / imageWidth) * lngRange,
    }))
  );
}
