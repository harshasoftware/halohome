/**
 * SAM Segmentation Worker
 * 
 * Offloads SAM v2 segmentation to a Web Worker to prevent blocking the main thread.
 * This allows the map to remain interactive during segmentation operations.
 */

import type { SegmentationPoint, SegmentationResult } from '@/lib/sam-segmentation/sam-service';

// Import SAM functions - these will run in the worker context
// Note: transformers.js should work in workers, but we need to load the model in the worker
let samPipeline: any = null;
let isLoading = false;

interface SAMWorkerMessage {
  id: string;
  type: 'init' | 'segmentAutomatic' | 'segmentWithPoints';
  model?: 'sam-vit-base' | 'sam-vit-large' | 'sam-vit-huge';
  imageData?: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  imageDataUrl?: string;
  threshold?: number;
  points?: SegmentationPoint[];
}

interface SAMWorkerResponse {
  id: string;
  type: 'progress' | 'result' | 'error' | 'ready';
  progress?: { status: string; progress: number };
  results?: SegmentationResult[];
  error?: string;
}

// Convert ImageData-like object to data URL using OffscreenCanvas
async function imageDataToDataURL(data: Uint8ClampedArray, width: number, height: number): Promise<string> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  const imageData = new ImageData(data, width, height);
  ctx.putImageData(imageData, 0, 0);
  
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error('Failed to read blob as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

// Get model ID - matches main thread logic
function getModelId(model: 'sam-vit-base' | 'sam-vit-large' | 'sam-vit-huge' = 'sam-vit-base'): string {
  // Using SegFormer models that work with image-segmentation pipeline
  // These provide automatic segmentation without prompts
  const modelMap: Record<string, string> = {
    'sam-vit-base': 'Xenova/segformer-b1-finetuned-ade-512-512', // General segmentation
    'sam-vit-large': 'Xenova/segformer-b1-finetuned-cityscapes-1024-1024', // Higher detail
    'sam-vit-huge': 'Xenova/segformer-b5-finetuned-cityscapes-1024-1024', // Best quality
  };
  return modelMap[model] || modelMap['sam-vit-base'];
}

// Load SAM model in worker
async function loadSAMInWorker(
  model: 'sam-vit-base' | 'sam-vit-large' | 'sam-vit-huge' = 'sam-vit-base',
  onProgress?: (progress: { status: string; progress: number }) => void
): Promise<void> {
  if (samPipeline) return;
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isLoading = true;
  try {
    onProgress?.({ status: 'Loading transformers.js', progress: 5 });
    const { pipeline, env } = await import('@xenova/transformers');
    
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    
    onProgress?.({ status: 'Loading SAM model', progress: 25 });
    
    // Use the same model configuration as main thread
    const modelId = getModelId(model);
    console.log('[SAM Worker] Loading model:', modelId);
    
    samPipeline = await pipeline('image-segmentation', modelId, {
      quantized: true,
      device: 'wasm', // Use WASM in worker (WebGPU might not be available)
      progress_callback: (data: any) => {
        if (data.status === 'downloading') {
          onProgress?.({
            status: `Downloading: ${Math.round((data.progress || 0) * 100)}%`,
            progress: 25 + (data.progress || 0) * 0.6,
          });
        } else if (data.status === 'loading') {
          onProgress?.({ status: 'Loading model', progress: 90 });
        }
      },
    });
    
    onProgress?.({ status: 'SAM ready', progress: 100 });
  } catch (error) {
    console.error('[SAM Worker] Failed to load model:', error);
    isLoading = false;
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Convert a segmentation mask to polygon coordinates
 * Full implementation copied from sam-service.ts
 */
function maskToPolygons(mask: any): Array<{ x: number; y: number }[]> {
  // Handle different mask formats from transformers.js
  if (!mask) {
    console.warn('[SAM Worker] maskToPolygons: mask is null/undefined');
    return [];
  }

  const polygons: Array<{ x: number; y: number }[]> = [];

  // Handle _RawImage format from transformers.js (SegFormer output)
  // _RawImage has: data (Uint8Array), width, height, channels
  if (mask.constructor?.name === '_RawImage' || (mask.data && mask.width && mask.height && mask.channels)) {
    const { width, height, data, channels = 1 } = mask;
    const binaryMask = new Uint8Array(width * height);
    
    console.log(`[SAM Worker] Processing _RawImage mask: ${width}x${height}, channels: ${channels}, data length: ${data.length}`);
    
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
    console.log(`[SAM Worker] _RawImage mask: ${width}x${height}, extracted ${contours.length} contours`);
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
    console.log(`[SAM Worker] ImageData mask: ${width}x${height}, extracted ${contours.length} contours`);
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
    console.log(`[SAM Worker] Tensor mask: ${width}x${height}, extracted ${contours.length} contours`);
    return polygons;
  }

  console.warn('[SAM Worker] maskToPolygons: Unsupported mask format:', {
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
 * Process segmentation results with full mask processing
 */
function processSegmentationResults(results: any[], threshold: number = 0.5): SegmentationResult[] {
  if (!Array.isArray(results)) {
    results = [results];
  }

  return results.map((result, idx) => {
    const mask = result.mask;
    // SegFormer may return null scores - use default confidence of 0.5 for results without scores
    // This allows the results to pass through and be evaluated by area/quality filters instead
    const score = result.score !== null && result.score !== undefined ? result.score : 0.5;

    // Extract polygons from the mask using full processing logic
    const polygons = maskToPolygons(mask);
    
    console.log(`[SAM Worker] Result ${idx}: score=${result.score} (using ${score}), polygons=${polygons.length}, mask format:`, {
      isImageData: mask instanceof ImageData,
      hasData: !!mask?.data,
      hasWidth: mask?.width !== undefined,
      hasHeight: mask?.height !== undefined,
      maskType: mask?.constructor?.name,
    });

    return {
      mask, // Note: mask may not transfer well via postMessage, but polygons will
      score,
      polygons,
    };
  }).filter((r) => {
    // Filter by threshold if score is available
    // Note: SegFormer may not always provide scores, so we include results without scores
    // and use a default confidence value
    if (r.score === null || r.score === undefined) {
      return true; // Include results without scores
    }
    return r.score >= threshold || r.score === 0.5; // Include results without scores
  });
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<SAMWorkerMessage>) => {
  const { id, type, model = 'sam-vit-base', imageData, imageDataUrl, threshold = 0.5, points } = event.data;

  try {
    switch (type) {
      case 'init': {
        const sendProgress = (progress: { status: string; progress: number }) => {
          self.postMessage({
            id,
            type: 'progress',
            progress,
          } as SAMWorkerResponse);
        };
        
        await loadSAMInWorker(model, sendProgress);
        
        self.postMessage({
          id,
          type: 'ready',
        } as SAMWorkerResponse);
        break;
      }

      case 'segmentAutomatic': {
        if (!samPipeline) {
          await loadSAMInWorker(model);
        }

        // Convert ImageData to data URL if needed
        let imageUrl: string;
        if (imageData) {
          imageUrl = await imageDataToDataURL(imageData.data, imageData.width, imageData.height);
        } else if (imageDataUrl) {
          imageUrl = imageDataUrl;
        } else {
          throw new Error('No image data provided');
        }

        // Run segmentation
        const results = await samPipeline(imageUrl);
        
        // Process results with full mask processing
        const processedResults = processSegmentationResults(results, threshold);
        
        // Note: ImageData/mask objects cannot be transferred directly via postMessage
        // We return polygons and scores - masks are not needed on main thread
        // The polygons contain all the information needed for coordinate conversion
        const response: SegmentationResult[] = processedResults.map(r => ({
          // Don't transfer mask (it's not transferable and not needed on main thread)
          // Main thread only needs polygons for coordinate conversion
          mask: null as any, // Set to null since it can't be transferred
          score: r.score,
          polygons: r.polygons, // This is what we actually need
        }));

        self.postMessage({
          id,
          type: 'result',
          results: response,
        } as SAMWorkerResponse);
        break;
      }

      case 'segmentWithPoints': {
        if (!samPipeline) {
          await loadSAMInWorker(model);
        }

        if (!points || points.length === 0) {
          throw new Error('No points provided');
        }

        let imageUrl: string;
        if (imageData) {
          imageUrl = await imageDataToDataURL(imageData.data, imageData.width, imageData.height);
        } else if (imageDataUrl) {
          imageUrl = imageDataUrl;
        } else {
          throw new Error('No image data provided');
        }

        // Format points for SAM
        const inputPoints = points.map((p) => [[p.x, p.y]]);
        const inputLabels = points.map((p) => [p.label]);

        const results = await samPipeline(imageUrl, {
          input_points: inputPoints,
          input_labels: inputLabels,
        });

        const processedResults = processSegmentationResults(results, threshold);

        self.postMessage({
          id,
          type: 'result',
          results: processedResults,
        } as SAMWorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    } as SAMWorkerResponse);
  }
};

console.log('[SAM Worker] Initialized');
