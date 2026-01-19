/**
 * SAM Web Worker Service Wrapper
 * 
 * Manages the SAM segmentation worker and provides a clean API for
 * offloading segmentation to a Web Worker to keep the main thread responsive.
 */

import type { SegmentationPoint, SegmentationResult } from './sam-service';
import type { BoundingBox } from '@/lib/building-footprints/coordinate-utils';
import { pixelPolygonsToLatLng } from './sam-service';

// Worker message types
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

// Pending request tracking
interface PendingRequest {
  resolve: (value: SegmentationResult[]) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: { status: string; progress: number }) => void;
}

class SAMWorkerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestIdCounter = 0;
  private useWorker = true; // Flag to enable/disable worker (fallback to main thread)

  /**
   * Initialize the worker
   */
  async initialize(onProgress?: (progress: { status: string; progress: number }) => void): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Check if workers are supported
        if (typeof Worker === 'undefined') {
          console.warn('[SAM Worker Service] Workers not supported, will use main thread');
          this.useWorker = false;
          this.isInitialized = true;
          return;
        }

        // Create worker
        this.worker = new Worker(
          new URL('../../features/globe/workers/sam-segmentation.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.addEventListener('message', (event: MessageEvent<SAMWorkerResponse>) => {
          this.handleWorkerMessage(event);
        });

        // Set up error handler
        this.worker.addEventListener('error', (error) => {
          console.error('[SAM Worker Service] Worker error:', error);
          this.useWorker = false; // Fallback to main thread on error
        });

        // Initialize the worker
        const initId = this.generateRequestId();
        const initPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Worker initialization timeout'));
          }, 30000); // 30 second timeout

          const handleMessage = (event: MessageEvent<SAMWorkerResponse>) => {
            const { id, type, error: workerError, progress: workerProgress } = event.data;
            if (id !== initId) return;

            if (type === 'progress' && workerProgress && onProgress) {
              onProgress(workerProgress);
            } else if (type === 'ready') {
              clearTimeout(timeout);
              this.worker?.removeEventListener('message', handleMessage);
              resolve();
            } else if (type === 'error') {
              clearTimeout(timeout);
              this.worker?.removeEventListener('message', handleMessage);
              reject(new Error(workerError || 'Worker initialization failed'));
            }
          };

          this.worker!.addEventListener('message', handleMessage);
        });

        // Send init message with default model (sam-vit-base)
        this.worker.postMessage({
          id: initId,
          type: 'init',
          model: 'sam-vit-base', // Use same default as main thread
        } as SAMWorkerMessage);

        await initPromise;
        this.isInitialized = true;
        console.log('[SAM Worker Service] Worker initialized successfully');
      } catch (error) {
        console.error('[SAM Worker Service] Failed to initialize worker:', error);
        this.useWorker = false;
        this.isInitialized = true; // Mark as initialized to prevent retry loops
        // Fallback to main thread will be used
      }
    })();

    return this.initPromise;
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent<SAMWorkerResponse>): void {
    const { id, type, results, error, progress } = event.data;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      // Message for a request we don't have (might be init progress)
      return;
    }

    switch (type) {
      case 'progress':
        if (progress && pending.onProgress) {
          pending.onProgress(progress);
        }
        break;

      case 'result':
        if (results) {
          this.pendingRequests.delete(id);
          pending.resolve(results);
        } else {
          this.pendingRequests.delete(id);
          pending.reject(new Error('No results from worker'));
        }
        break;

      case 'error':
        this.pendingRequests.delete(id);
        pending.reject(new Error(error || 'Worker error'));
        break;
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `sam-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Segment an image automatically (offloaded to worker)
   */
  async segmentAutomatic(
    imageSource: string | ImageData,
    threshold: number = 0.5,
    onProgress?: (progress: { status: string; progress: number }) => void
  ): Promise<SegmentationResult[]> {
    // Fallback to main thread if worker is disabled
    if (!this.useWorker || !this.worker) {
      const { segmentAutomatic: mainThreadSegment } = await import('./sam-service');
      return mainThreadSegment(imageSource, threshold);
    }

    // Ensure worker is initialized
    if (!this.isInitialized) {
      await this.initialize(onProgress);
    }

    // If worker still not available, fallback
    if (!this.worker || !this.useWorker) {
      const { segmentAutomatic: mainThreadSegment } = await import('./sam-service');
      return mainThreadSegment(imageSource, threshold);
    }

    return new Promise<SegmentationResult[]>((resolve, reject) => {
      const id = this.generateRequestId();
      
      this.pendingRequests.set(id, {
        resolve,
        reject,
        onProgress,
      });

      // Prepare image data
      let message: SAMWorkerMessage;
      
      if (imageSource instanceof ImageData) {
        // Transfer ImageData to worker
        message = {
          id,
          type: 'segmentAutomatic',
          imageData: {
            data: imageSource.data,
            width: imageSource.width,
            height: imageSource.height,
          },
          threshold,
        };
        
        // Transfer the ArrayBuffer for better performance
        this.worker.postMessage(message, [imageSource.data.buffer]);
      } else {
        // String URL
        message = {
          id,
          type: 'segmentAutomatic',
          imageDataUrl: imageSource,
          threshold,
        };
        
        this.worker.postMessage(message);
      }

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Segmentation timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Segment an image with point prompts (offloaded to worker)
   */
  async segmentWithPoints(
    imageSource: string | ImageData,
    points: SegmentationPoint[],
    threshold: number = 0.5,
    onProgress?: (progress: { status: string; progress: number }) => void
  ): Promise<SegmentationResult[]> {
    // Fallback to main thread if worker is disabled
    if (!this.useWorker || !this.worker) {
      const { segmentWithPoints: mainThreadSegment } = await import('./sam-service');
      return mainThreadSegment(imageSource, points);
    }

    // Ensure worker is initialized
    if (!this.isInitialized) {
      await this.initialize(onProgress);
    }

    // If worker still not available, fallback
    if (!this.worker || !this.useWorker) {
      const { segmentWithPoints: mainThreadSegment } = await import('./sam-service');
      return mainThreadSegment(imageSource, points);
    }

    return new Promise<SegmentationResult[]>((resolve, reject) => {
      const id = this.generateRequestId();
      
      this.pendingRequests.set(id, {
        resolve,
        reject,
        onProgress,
      });

      // Prepare image data
      let message: SAMWorkerMessage;
      
      if (imageSource instanceof ImageData) {
        message = {
          id,
          type: 'segmentWithPoints',
          imageData: {
            data: imageSource.data,
            width: imageSource.width,
            height: imageSource.height,
          },
          points,
          threshold,
        };
        
        this.worker.postMessage(message, [imageSource.data.buffer]);
      } else {
        message = {
          id,
          type: 'segmentWithPoints',
          imageDataUrl: imageSource,
          points,
          threshold,
        };
        
        this.worker.postMessage(message);
      }

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Segmentation timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Convert pixel polygons to lat/lng coordinates
   * This is a convenience method that uses the shared pixelPolygonsToLatLng function
   */
  pixelPolygonsToLatLng(
    polygons: Array<{ x: number; y: number }[]>,
    tileBounds: BoundingBox,
    imageWidth: number,
    imageHeight: number
  ): Array<Array<{ lat: number; lng: number }>> {
    return pixelPolygonsToLatLng(polygons, tileBounds, imageWidth, imageHeight);
  }

  /**
   * Check if worker is available and initialized
   */
  isWorkerAvailable(): boolean {
    return this.useWorker && this.isInitialized && this.worker !== null;
  }

  /**
   * Terminate the worker (cleanup)
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
      this.pendingRequests.clear();
    }
  }
}

// Export singleton instance
export const samWorkerService = new SAMWorkerService();
