/**
 * Scout Worker Pool
 *
 * Uses a SINGLE worker with parallel WASM (rayon) for maximum performance.
 * Rayon handles internal parallelization via SharedArrayBuffer threads.
 *
 * Key features:
 * - Single worker with rayon thread pool (fastest architecture)
 * - Parallel computation via WASM rayon (not JS worker distribution)
 * - Progress tracking and caching
 * - Results stored in Zustand for instant access
 * - Lifecycle independent of ScoutPanel component
 *
 * Requirements:
 * - Cross-Origin-Opener-Policy: same-origin
 * - Cross-Origin-Embedder-Policy: credentialless
 */

import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import type {
  ScoutParallelMessage,
  ScoutParallelResult,
  OverallCityRanking,
  CityRanking,
} from '../workers/scoutParallel.worker';
import type { ScoutCategory, ScoutAnalysis, OverallScoutLocation } from '../utils/scout-utils';
import type { LifeCategory } from '../utils/scout-algorithm-c2';
import {
  getCachedCategoryResult,
  setCachedCategoryResult,
  getCachedOverallResult,
  setCachedOverallResult,
} from '../utils/scout-cache';

// ============================================================================
// Types
// ============================================================================

export type ComputationPhase = 'idle' | 'initializing' | 'computing' | 'complete' | 'error';

export interface ScoutProgress {
  phase: ComputationPhase;
  overallPercent: number;
  categoriesComplete: number;
  totalCategories: number;
  currentCategory?: string;
  detail?: string;
  error?: string;
}

export interface ScoutResults {
  overall: OverallScoutLocation[] | null;
  categories: Map<ScoutCategory, ScoutAnalysis>;
  linesKey: string;
}

type ProgressListener = (progress: ScoutProgress) => void;
type ResultsListener = (results: ScoutResults) => void;

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: ScoutCategory[] = ['career', 'love', 'health', 'home', 'wellbeing', 'wealth'];
const CATEGORY_LABELS: Record<ScoutCategory, string> = {
  career: 'Career',
  love: 'Love',
  health: 'Health',
  home: 'Home',
  wellbeing: 'Wellbeing',
  wealth: 'Wealth',
};

// ============================================================================
// Worker Result Conversion
// ============================================================================

function rankingToScoutLocation(
  ranking: CityRanking,
  category: ScoutCategory
): import('../utils/scout-utils').ScoutLocation {
  const city = {
    name: ranking.cityName,
    country: ranking.country,
    lat: ranking.latitude,
    lng: ranking.longitude,
    population: ranking.population,
  };

  const influences = ranking.topInfluences.map(inf => ({
    planet: inf.planet as any,
    lineType: inf.angle as any,
    rating: Math.max(1, Math.min(5, Math.round(ranking.benefitScore / 20))),
    isAspect: false,
    title: `${inf.planet} ${inf.angle}`,
    description: `${Math.round(inf.distanceKm)} km away`,
  }));

  return {
    city,
    category,
    nature: ranking.nature === 'mixed' ? 'beneficial' : ranking.nature,
    overallScore: Math.round(ranking.benefitScore),
    influences,
    distance: Math.round(ranking.minDistanceKm),
  };
}

function overallRankingToLocation(ranking: OverallCityRanking): OverallScoutLocation {
  return {
    city: {
      name: ranking.cityName,
      country: ranking.country,
      lat: ranking.latitude,
      lng: ranking.longitude,
      population: ranking.population,
    },
    totalScore: Math.round(ranking.totalScore),
    averageScore: Math.round(ranking.averageScore),
    categoryScores: ranking.categoryScores.map(cs => ({
      category: cs.category as ScoutCategory,
      score: Math.round(cs.score),
      nature: cs.nature === 'mixed' ? 'beneficial' : cs.nature,
      topInfluence: null,
    })),
    beneficialCategories: ranking.beneficialCategories,
    challengingCategories: ranking.challengingCategories,
    distance: Math.round(ranking.minDistanceKm),
  };
}

function groupByCountry(locations: import('../utils/scout-utils').ScoutLocation[]): import('../utils/scout-utils').CountryGroup[] {
  const countryMap = new Map<string, import('../utils/scout-utils').ScoutLocation[]>();

  for (const loc of locations) {
    const country = loc.city.country;
    if (!countryMap.has(country)) {
      countryMap.set(country, []);
    }
    countryMap.get(country)!.push(loc);
  }

  return Array.from(countryMap.entries())
    .map(([country, locs]) => ({
      country,
      locations: locs.sort((a, b) => b.overallScore - a.overallScore),
      beneficialCount: locs.filter(l => l.nature === 'beneficial').length,
      challengingCount: locs.filter(l => l.nature === 'challenging').length,
    }))
    .sort((a, b) => {
      const aTopScore = a.locations[0]?.overallScore ?? 0;
      const bTopScore = b.locations[0]?.overallScore ?? 0;
      return bTopScore - aTopScore;
    });
}

// ============================================================================
// Cache Key Generation
// ============================================================================

function generateLinesKey(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): string {
  const planetaryData = planetaryLines
    .map(l => `${l.planet}:${l.lineType}:${l.points?.length || 0}`)
    .sort()
    .join('|');

  const aspectData = aspectLines
    .map(l => `${l.planet1}:${l.planet2}:${l.aspect}:${l.lineType1}:${l.lineType2}`)
    .sort()
    .join('|');

  const combined = `${planetaryData}::${aspectData}`;

  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `lines-${(hash >>> 0).toString(36)}`;
}

// ============================================================================
// Scout Worker Pool (Hybrid: Parallel WASM or Multi-Worker Fallback)
// ============================================================================

type PoolMode = 'parallel' | 'pool';

class ScoutWorkerPool {
  // Parallel mode (single worker with rayon)
  private parallelWorker: Worker | null = null;

  // Pool mode (multiple workers, fallback)
  private poolWorkers: Worker[] = [];
  private poolSize = 0;

  // Common state
  private mode: PoolMode = 'parallel';
  private isInitialized = false;
  private initPromise: Promise<void> | null = null; // Prevents duplicate initialization
  private backend: 'wasm-parallel' | 'wasm' | 'typescript' = 'typescript';
  private numThreads = 1;

  // Current computation state
  private currentLinesKey = '';
  private currentLines: { planetary: PlanetaryLine[]; aspect: AspectLine[] } | null = null;
  private currentMinPopulation: number | undefined = undefined;

  // Results storage
  private results: ScoutResults = {
    overall: null,
    categories: new Map(),
    linesKey: '',
  };

  // Progress tracking
  private progress: ScoutProgress = {
    phase: 'idle',
    overallPercent: 0,
    categoriesComplete: 0,
    totalCategories: 7, // 6 categories + overall
  };

  // Pending requests
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    type: 'overall' | 'category';
    category?: ScoutCategory;
    progress: number;
  }>();
  private requestIdCounter = 0;

  // Listeners
  private progressListeners = new Set<ProgressListener>();
  private resultsListeners = new Set<ResultsListener>();

  // Computation tracking
  private isComputing = false;
  private computationAborted = false;
  private maxProgressSeen = 0; // Ensures progress never goes backwards
  private usingExtractionStrategy = false; // True when overall extracts all category results

  constructor() {
    this.poolSize = Math.min(navigator.hardwareConcurrency || 4, 4);
    console.log(`[ScoutWorkerPool] Hybrid architecture initialized (pool size: ${this.poolSize})`);
  }

  // ============================================================================
  // Worker Management
  // ============================================================================

  private async initializePool(): Promise<void> {
    // Already initialized - return immediately
    if (this.isInitialized) return;

    // Initialization in progress - wait for it (prevents duplicate workers!)
    if (this.initPromise) {
      console.log('[ScoutWorkerPool] Waiting for existing initialization...');
      return this.initPromise;
    }

    // Start initialization and store the promise
    this.initPromise = this.doInitializePool();
    return this.initPromise;
  }

  private async doInitializePool(): Promise<void> {
    console.log('[ScoutWorkerPool] Initializing workers...');
    this.updateProgress({ phase: 'initializing', detail: 'Starting workers...' });

    // Try parallel worker first (fastest if it works)
    const parallelSuccess = await this.tryInitParallelWorker();

    if (parallelSuccess && (this.backend === 'wasm-parallel' || this.backend === 'wasm')) {
      // Parallel WASM works - use single worker mode
      this.mode = 'parallel';
      console.log(`[ScoutWorkerPool] Using parallel mode (${this.backend})`);
    } else {
      // Fall back to multi-worker pool
      console.log('[ScoutWorkerPool] Parallel init failed, falling back to worker pool...');
      this.mode = 'pool';
      await this.initWorkerPool();
      console.log(`[ScoutWorkerPool] Using pool mode with ${this.poolSize} workers (${this.backend})`);
    }

    this.isInitialized = true;
  }

  private async tryInitParallelWorker(): Promise<boolean> {
    try {
      console.log('[ScoutWorkerPool] Creating parallel worker...');

      // IMPORTANT: The new URL() MUST be inline in new Worker() for Vite to recognize
      // and bundle the worker. Storing URL in a variable breaks Vite's static analysis.
      this.parallelWorker = new Worker(
        new URL('../workers/scoutParallel.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Track if we received any message (helps diagnose load failures)
      let receivedMessage = false;
      let workerError: ErrorEvent | null = null;

      // Set up message handler
      this.parallelWorker.addEventListener('message', (event) => {
        receivedMessage = true;
        this.handleParallelMessage(event);
      });

      this.parallelWorker.addEventListener('error', (error) => {
        workerError = error;
        // All undefined properties usually means the worker script failed to load
        // (e.g., 404, wrong MIME type, or network error)
        const allUndefined = !error.message && !error.filename && !error.lineno;
        if (allUndefined) {
          console.error('[ScoutWorkerPool] Worker script failed to load (all error properties undefined).');
          console.error('[ScoutWorkerPool] This usually means the worker file returned 404 or wrong content-type.');
        } else {
          console.error('[ScoutWorkerPool] Parallel worker error:', {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            error: error.error,
          });
        }
      });

      // Initialize and wait for ready with timeout
      const initTimeout = 30000; // 30 seconds for cities + WASM load (Rayon disabled)

      const result = await new Promise<ScoutParallelResult>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // Provide more context on why it timed out
          if (workerError) {
            reject(new Error(`Worker failed to load: ${workerError.message || 'script load failed'}`));
          } else if (!receivedMessage) {
            reject(new Error('Worker never responded - script may have failed to load or parse'));
          } else {
            reject(new Error('Parallel worker initialization timeout'));
          }
        }, initTimeout); // 45s desktop, 60s mobile

        const onReady = (event: MessageEvent<ScoutParallelResult>) => {
          if (event.data.type === 'ready') {
            clearTimeout(timeoutId);
            resolve(event.data);
          }
        };
        this.parallelWorker!.addEventListener('message', onReady, { once: true });

        const initMessage: ScoutParallelMessage = { type: 'init' };
        this.parallelWorker!.postMessage(initMessage);
      });

      this.backend = result.backend;
      this.numThreads = result.numThreads;

      // If we got typescript backend, parallel worker isn't useful
      if (result.backend === 'typescript') {
        console.log('[ScoutWorkerPool] Parallel worker returned TypeScript backend, will use pool instead');
        this.parallelWorker.terminate();
        this.parallelWorker = null;
        return false;
      }

      // Log Rayon status
      if (result.rayonInitializing) {
        console.log(`[ScoutWorkerPool] Parallel worker ready: ${result.backend} (Rayon initializing in background...)`);
      } else if (result.backend === 'wasm-parallel') {
        console.log(`[ScoutWorkerPool] Parallel worker ready: ${result.backend} with ${result.numThreads} threads`);
      } else {
        console.log(`[ScoutWorkerPool] Parallel worker ready: ${result.backend} (single-threaded WASM)`);
      }

      return true;
    } catch (error) {
      console.warn('[ScoutWorkerPool] Parallel worker init failed:', error);
      if (this.parallelWorker) {
        this.parallelWorker.terminate();
        this.parallelWorker = null;
      }
      return false;
    }
  }

  private async initWorkerPool(): Promise<void> {
    // Import the old worker types
    type OldWorkerMessage = import('../workers/scout.worker').ScoutWorkerMessage;
    type OldWorkerResult = import('../workers/scout.worker').ScoutWorkerResult;

    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(
        new URL('../workers/scout.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.poolWorkers.push(worker);

      // Set up message handler
      worker.addEventListener('message', (event) => this.handlePoolMessage(i, event));
      worker.addEventListener('error', (error) => {
        console.error(`[ScoutWorkerPool] Pool worker ${i} error:`, error);
      });

      // Initialize worker
      initPromises.push(new Promise<void>((resolve) => {
        const onReady = (event: MessageEvent<OldWorkerResult>) => {
          if (event.data.type === 'ready') {
            this.backend = event.data.backend === 'wasm' ? 'wasm' : 'typescript';
            console.log(`[ScoutWorkerPool] Pool worker ${i} ready (${event.data.backend})`);
            resolve();
          }
        };
        worker.addEventListener('message', onReady, { once: true });

        const initMessage: OldWorkerMessage = { type: 'init', wasmEnabled: true };
        worker.postMessage(initMessage);
      }));
    }

    await Promise.all(initPromises);
  }

  private handleParallelMessage(event: MessageEvent<ScoutParallelResult>): void {
    const result = event.data;

    switch (result.type) {
      case 'rayonReady': {
        // Background Rayon initialization completed!
        // Upgrade backend status - subsequent computations will use parallel
        this.backend = 'wasm-parallel';
        this.numThreads = result.numThreads;
        console.log(`[ScoutWorkerPool] Rayon ready! ${result.numThreads} threads, init took ${result.initTimeMs.toFixed(0)}ms`);
        break;
      }

      case 'progress': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          pending.progress = result.percent;
          this.recalculateOverallProgress();
        }
        break;
      }

      case 'categoryResult': {
        const pending = this.pendingRequests.get(result.id);
        if (pending && pending.category) {
          this.pendingRequests.delete(result.id);

          const locations = result.rankings.map(r =>
            rankingToScoutLocation(r, pending.category!)
          );
          const countries = groupByCountry(locations);

          const analysis: ScoutAnalysis = {
            category: pending.category,
            countries,
            totalBeneficial: result.totalBeneficial,
            totalChallenging: result.totalChallenging,
          };

          // Store result
          this.results.categories.set(pending.category, analysis);

          // Cache the result
          if (this.currentLines) {
            setCachedCategoryResult(
              this.currentLines.planetary,
              this.currentLines.aspect,
              pending.category,
              analysis,
              this.currentMinPopulation
            );
          }

          console.log(`[ScoutWorkerPool] ${pending.category} complete in ${result.timeMs.toFixed(0)}ms (${result.backend})`);
          pending.resolve(analysis);
          this.recalculateOverallProgress();
          this.notifyResultsListeners();
        }
        break;
      }

      case 'overallResult': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          this.pendingRequests.delete(result.id);

          const locations = result.rankings.map(overallRankingToLocation);

          // Store result
          this.results.overall = locations;

          // Cache the result
          if (this.currentLines) {
            setCachedOverallResult(
              this.currentLines.planetary,
              this.currentLines.aspect,
              locations,
              this.currentMinPopulation
            );
          }

          console.log(`[ScoutWorkerPool] Overall complete in ${result.timeMs.toFixed(0)}ms (${result.backend})`);

          // Extract category results if available (optimization: avoids recomputing)
          if (result.categoryResults) {
            let extractedCount = 0;
            for (const [category, catResult] of result.categoryResults) {
              // Skip if already computed
              if (this.results.categories.has(category)) continue;

              const categoryLocations = catResult.rankings.map(r =>
                rankingToScoutLocation(r, category)
              );
              const countries = groupByCountry(categoryLocations);

              const analysis: ScoutAnalysis = {
                category,
                countries,
                totalBeneficial: catResult.totalBeneficial,
                totalChallenging: catResult.totalChallenging,
              };

              // Store result
              this.results.categories.set(category, analysis);

              // Cache the result
              if (this.currentLines) {
                setCachedCategoryResult(
                  this.currentLines.planetary,
                  this.currentLines.aspect,
                  category,
                  analysis,
                  this.currentMinPopulation
                );
              }

              // Resolve any pending request for this category
              for (const [reqId, reqPending] of this.pendingRequests) {
                if (reqPending.category === category) {
                  this.pendingRequests.delete(reqId);
                  reqPending.resolve(analysis);
                }
              }

              extractedCount++;
            }

            if (extractedCount > 0) {
              console.log(`[ScoutWorkerPool] Extracted ${extractedCount} category results from overall (saved ~${extractedCount * 6}s)`);
            }
          }

          pending.resolve(locations);
          this.recalculateOverallProgress();
          this.notifyResultsListeners();
        }
        break;
      }

      case 'error': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          this.pendingRequests.delete(result.id);
          console.error(`[ScoutWorkerPool] Parallel error: ${result.error}`);
          pending.reject(new Error(result.error));
        }
        break;
      }
    }
  }

  private handlePoolMessage(workerIndex: number, event: MessageEvent<import('../workers/scout.worker').ScoutWorkerResult>): void {
    const result = event.data;

    switch (result.type) {
      case 'progress': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          pending.progress = result.percent;
          this.recalculateOverallProgress();
        }
        break;
      }

      case 'categoryResult': {
        const pending = this.pendingRequests.get(result.id);
        if (pending && pending.category) {
          this.pendingRequests.delete(result.id);

          const locations = result.rankings.map(r =>
            rankingToScoutLocation(r, pending.category!)
          );
          const countries = groupByCountry(locations);

          const analysis: ScoutAnalysis = {
            category: pending.category,
            countries,
            totalBeneficial: result.totalBeneficial,
            totalChallenging: result.totalChallenging,
          };

          // Store result
          this.results.categories.set(pending.category, analysis);

          // Cache the result
          if (this.currentLines) {
            setCachedCategoryResult(
              this.currentLines.planetary,
              this.currentLines.aspect,
              pending.category,
              analysis,
              this.currentMinPopulation
            );
          }

          console.log(`[ScoutWorkerPool] ${pending.category} complete (pool worker ${workerIndex}, ${result.backend})`);
          pending.resolve(analysis);
          this.recalculateOverallProgress();
          this.notifyResultsListeners();
        }
        break;
      }

      case 'overallResult': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          this.pendingRequests.delete(result.id);

          const locations = result.rankings.map(overallRankingToLocation);

          // Store result
          this.results.overall = locations;

          // Cache the result
          if (this.currentLines) {
            setCachedOverallResult(
              this.currentLines.planetary,
              this.currentLines.aspect,
              locations,
              this.currentMinPopulation
            );
          }

          console.log(`[ScoutWorkerPool] Overall complete (pool worker ${workerIndex}, ${result.backend})`);
          pending.resolve(locations);
          this.recalculateOverallProgress();
          this.notifyResultsListeners();
        }
        break;
      }

      case 'error': {
        const pending = this.pendingRequests.get(result.id);
        if (pending) {
          this.pendingRequests.delete(result.id);
          console.error(`[ScoutWorkerPool] Pool worker ${workerIndex} error: ${result.error}`);
          pending.reject(new Error(result.error));
        }
        break;
      }
    }
  }

  private getNextRequestId(): string {
    return `${this.mode}-${++this.requestIdCounter}-${Date.now()}`;
  }

  // ============================================================================
  // Progress Management
  // ============================================================================

  private updateProgress(partial: Partial<ScoutProgress>): void {
    this.progress = { ...this.progress, ...partial };
    this.notifyProgressListeners();
  }

  private recalculateOverallProgress(): void {
    // Count completed tasks (7 total: 1 overall + 6 categories)
    const completedCategories = this.results.categories.size;
    const hasOverall = this.results.overall !== null;
    const tasksComplete = completedCategories + (hasOverall ? 1 : 0);
    const totalTasks = 7;

    let calculatedPercent: number;

    if (this.usingExtractionStrategy) {
      // When using extraction strategy, overall computation does ~90% of the work
      // Category extraction is instant and represents the remaining ~10%
      const OVERALL_WEIGHT = 0.90; // Overall computation = 90% of progress
      const EXTRACTION_WEIGHT = 0.10; // Category extraction = 10% of progress

      if (!hasOverall) {
        // Overall still in progress - find its internal progress (0-100)
        let overallProgress = 0;
        for (const [, req] of this.pendingRequests) {
          if (req.type === 'overall') {
            overallProgress = req.progress;
            break;
          }
        }
        // Map overall's 0-100% progress to 0-90% of total
        calculatedPercent = Math.round(overallProgress * OVERALL_WEIGHT);
      } else {
        // Overall done, categories being extracted/completing
        // 90% (overall) + (completedCategories / 6) * 10%
        const extractionProgress = completedCategories / 6;
        calculatedPercent = Math.round(OVERALL_WEIGHT * 100 + extractionProgress * EXTRACTION_WEIGHT * 100);
      }
    } else {
      // Pool mode or when categories computed individually: equal weighting
      // Each pending request reports 0-100%, which maps to its portion (100/7 = ~14.28%) of total
      let pendingProgress = 0;
      for (const [, req] of this.pendingRequests) {
        pendingProgress += req.progress;
      }

      // Each task is 1/7 of total progress
      const completedPercent = (tasksComplete / totalTasks) * 100;
      const pendingPercent = pendingProgress / totalTasks;
      calculatedPercent = Math.round(completedPercent + pendingPercent);
    }

    // Cap at 99% until truly complete
    calculatedPercent = Math.min(99, calculatedPercent);

    // Ensure progress never goes backwards
    const overallPercent = Math.max(this.maxProgressSeen, calculatedPercent);
    this.maxProgressSeen = overallPercent;

    // Determine current category being processed and task number
    let currentCategory: string | undefined;
    let detail: string;

    if (!hasOverall) {
      currentCategory = 'Overall Rankings';
      detail = 'Computing best cities...';
    } else if (completedCategories < 6) {
      // Find first incomplete category
      for (const cat of CATEGORIES) {
        if (!this.results.categories.has(cat)) {
          currentCategory = CATEGORY_LABELS[cat];
          break;
        }
      }
      detail = this.usingExtractionStrategy
        ? 'Extracting category scores...'
        : `Analyzing ${currentCategory}...`;
    } else {
      detail = 'Finalizing results...';
    }

    this.updateProgress({
      overallPercent,
      categoriesComplete: tasksComplete,
      currentCategory,
      detail,
    });

    // Only mark complete when ALL 7 tasks are done
    if (tasksComplete === totalTasks) {
      this.updateProgress({
        phase: 'complete',
        overallPercent: 100,
        detail: 'Scout analysis complete!',
      });
      this.isComputing = false;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Subscribe to progress updates
   */
  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    // Immediately call with current progress
    listener(this.progress);
    return () => this.progressListeners.delete(listener);
  }

  /**
   * Subscribe to results updates
   */
  onResults(listener: ResultsListener): () => void {
    this.resultsListeners.add(listener);
    // Immediately call with current results
    listener(this.results);
    return () => this.resultsListeners.delete(listener);
  }

  private notifyProgressListeners(): void {
    for (const listener of this.progressListeners) {
      listener(this.progress);
    }
  }

  private notifyResultsListeners(): void {
    for (const listener of this.resultsListeners) {
      listener(this.results);
    }
  }

  /**
   * Get current progress state
   */
  getProgress(): ScoutProgress {
    return this.progress;
  }

  /**
   * Get current results
   */
  getResults(): ScoutResults {
    return this.results;
  }

  /**
   * Check if computation is in progress
   */
  isComputationInProgress(): boolean {
    return this.isComputing;
  }

  /**
   * Get backend type
   */
  getBackend(): 'wasm-parallel' | 'wasm' | 'typescript' {
    return this.backend;
  }

  /**
   * Start parallel computation of all categories + overall.
   * This is the main entry point - call when planetary lines are ready.
   */
  async computeAll(
    planetaryLines: PlanetaryLine[],
    aspectLines: AspectLine[],
    minPopulation?: number
  ): Promise<void> {
    // Include minPopulation in the key so different population filters are treated as different computations
    const baseLinesKey = generateLinesKey(planetaryLines, aspectLines);
    const linesKey = minPopulation ? `${baseLinesKey}-pop${minPopulation}` : baseLinesKey;

    // Skip if already computed for these lines AND same population filter
    if (this.results.linesKey === linesKey && this.progress.phase === 'complete') {
      console.log('[ScoutWorkerPool] Results already computed for these lines');
      return;
    }

    // Skip if currently computing same lines with same population filter
    if (this.isComputing && this.currentLinesKey === linesKey) {
      console.log('[ScoutWorkerPool] Already computing these lines');
      return;
    }

    // Abort any in-progress computation
    if (this.isComputing) {
      console.log('[ScoutWorkerPool] Aborting previous computation');
      this.computationAborted = true;
      // Wait a tick for cleanup
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log('[ScoutWorkerPool] Starting parallel computation...');
    this.isComputing = true;
    this.computationAborted = false;
    this.currentLinesKey = linesKey;
    this.currentLines = { planetary: planetaryLines, aspect: aspectLines };
    this.currentMinPopulation = minPopulation;

    // Reset results and progress tracking
    this.results = {
      overall: null,
      categories: new Map(),
      linesKey,
    };
    this.maxProgressSeen = 0;
    this.usingExtractionStrategy = false; // Will be set true in computeWithParallelWorker if applicable

    // Initialize workers if needed
    await this.initializePool();

    this.updateProgress({
      phase: 'computing',
      overallPercent: 0,
      categoriesComplete: 0,
      detail: 'Starting analysis...',
    });

    // Check cache first for each task
    const tasksToCompute: Array<{ type: 'overall' } | { type: 'category'; category: ScoutCategory }> = [];

    // Check overall cache
    const cachedOverall = await getCachedOverallResult(planetaryLines, aspectLines, minPopulation);
    if (cachedOverall) {
      this.results.overall = cachedOverall;
      console.log('[ScoutWorkerPool] Overall result loaded from cache');
    } else {
      tasksToCompute.push({ type: 'overall' });
    }

    // Check category caches
    for (const category of CATEGORIES) {
      const cached = await getCachedCategoryResult(planetaryLines, aspectLines, category, minPopulation);
      if (cached) {
        this.results.categories.set(category, cached);
        console.log(`[ScoutWorkerPool] ${category} result loaded from cache`);
      } else {
        tasksToCompute.push({ type: 'category', category });
      }
    }

    // Update progress after cache check
    this.recalculateOverallProgress();
    this.notifyResultsListeners();

    // If everything was cached, we're done
    if (tasksToCompute.length === 0) {
      console.log('[ScoutWorkerPool] All results loaded from cache!');
      this.updateProgress({
        phase: 'complete',
        overallPercent: 100,
        categoriesComplete: 7,
        detail: 'Scout analysis complete!',
      });
      this.isComputing = false;
      return;
    }

    console.log(`[ScoutWorkerPool] Computing ${tasksToCompute.length} tasks (mode: ${this.mode}, backend: ${this.backend})...`);

    const startTime = performance.now();

    try {
      if (this.mode === 'parallel') {
        // Parallel mode: sequential dispatch, rayon parallelizes internally
        await this.computeWithParallelWorker(tasksToCompute, planetaryLines, aspectLines, minPopulation);
      } else {
        // Pool mode: distribute tasks across multiple workers
        await this.computeWithWorkerPool(tasksToCompute, planetaryLines, aspectLines, minPopulation);
      }

      if (!this.computationAborted) {
        const totalTime = performance.now() - startTime;
        console.log(`[ScoutWorkerPool] All computations complete in ${totalTime.toFixed(0)}ms (${this.mode}, ${this.backend})`);
      }
    } catch (error) {
      console.error('[ScoutWorkerPool] Computation error:', error);
      this.updateProgress({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.isComputing = false;
    }
  }

  private async computeWithParallelWorker(
    tasks: Array<{ type: 'overall' } | { type: 'category'; category: ScoutCategory }>,
    planetaryLines: PlanetaryLine[],
    aspectLines: AspectLine[],
    minPopulation?: number
  ): Promise<void> {
    // Process overall first - it extracts category results as a side effect
    const overallTask = tasks.find(t => t.type === 'overall');
    const categoryTasks = tasks.filter(t => t.type === 'category') as Array<{ type: 'category'; category: ScoutCategory }>;

    // Enable extraction strategy weighting when overall will extract category results
    // This makes progress bar reflect that overall does 90% of the work
    this.usingExtractionStrategy = overallTask !== undefined && categoryTasks.length > 0;

    if (overallTask && !this.computationAborted) {
      const id = this.getNextRequestId();

      await new Promise<void>((resolve, reject) => {
        this.pendingRequests.set(id, {
          resolve: () => resolve(),
          reject,
          type: 'overall',
          progress: 0,
        });

        const message: ScoutParallelMessage = {
          type: 'scoutOverall',
          id,
          planetaryLines,
          aspectLines,
          minPopulation,
        };
        this.parallelWorker!.postMessage(message);
      });
    }

    // After overall completes, check which categories still need computation
    // (scoutOverall extracts all category results as a side effect)
    for (const task of categoryTasks) {
      if (this.computationAborted) break;

      // Skip if already extracted from overall
      if (this.results.categories.has(task.category)) {
        console.log(`[ScoutWorkerPool] Skipping ${task.category} - already extracted from overall`);
        continue;
      }

      const id = this.getNextRequestId();

      await new Promise<void>((resolve, reject) => {
        this.pendingRequests.set(id, {
          resolve: () => resolve(),
          reject,
          type: 'category',
          category: task.category,
          progress: 0,
        });

        const message: ScoutParallelMessage = {
          type: 'scoutCategory',
          id,
          category: task.category as LifeCategory,
          planetaryLines,
          aspectLines,
          minPopulation,
        };
        this.parallelWorker!.postMessage(message);
      });
    }
  }

  private async computeWithWorkerPool(
    tasks: Array<{ type: 'overall' } | { type: 'category'; category: ScoutCategory }>,
    planetaryLines: PlanetaryLine[],
    aspectLines: AspectLine[],
    minPopulation?: number
  ): Promise<void> {
    type OldWorkerMessage = import('../workers/scout.worker').ScoutWorkerMessage;

    // Dispatch all tasks in parallel across workers
    const taskPromises = tasks.map((task, index) => {
      if (this.computationAborted) return Promise.resolve();

      const worker = this.poolWorkers[index % this.poolSize];
      const id = this.getNextRequestId();

      return new Promise<void>((resolve, reject) => {
        if (task.type === 'overall') {
          this.pendingRequests.set(id, {
            resolve: () => resolve(),
            reject,
            type: 'overall',
            progress: 0,
          });

          const message: OldWorkerMessage = {
            type: 'scoutOverall',
            id,
            planetaryLines,
            aspectLines,
          };
          worker.postMessage(message);
        } else {
          this.pendingRequests.set(id, {
            resolve: () => resolve(),
            reject,
            type: 'category',
            category: task.category,
            progress: 0,
          });

          const message: OldWorkerMessage = {
            type: 'scoutCategory',
            id,
            category: task.category as LifeCategory,
            planetaryLines,
            aspectLines,
          };
          worker.postMessage(message);
        }
      });
    });

    await Promise.all(taskPromises);
  }

  /**
   * Terminate all workers and clean up
   */
  terminate(): void {
    console.log(`[ScoutWorkerPool] Terminating workers (mode: ${this.mode})...`);

    // Terminate parallel worker if exists
    if (this.parallelWorker) {
      this.parallelWorker.terminate();
      this.parallelWorker = null;
    }

    // Terminate pool workers if any
    for (const worker of this.poolWorkers) {
      worker.terminate();
    }
    this.poolWorkers = [];

    this.isInitialized = false;
    this.initPromise = null; // Reset so pool can be reinitialized
    this.isComputing = false;
    this.computationAborted = true;
    this.pendingRequests.clear();
    this.mode = 'parallel'; // Reset to default
    this.backend = 'typescript';
    this.numThreads = 1;
  }

  /**
   * Get number of rayon threads
   */
  getNumThreads(): number {
    return this.numThreads;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let instance: ScoutWorkerPool | null = null;

export function getScoutWorkerPool(): ScoutWorkerPool {
  if (!instance) {
    instance = new ScoutWorkerPool();
  }
  return instance;
}

export function terminateScoutWorkerPool(): void {
  if (instance) {
    instance.terminate();
    instance = null;
  }
}

/**
 * Prewarm the scout worker by initializing it in the background.
 * Call this early (e.g., on app mount or after auth) to reduce latency
 * when the user actually opens the Scout panel.
 *
 * This kicks off:
 * - Worker creation and message channel setup
 * - Cities data fetch (3MB JSON)
 * - WASM module loading
 * - Rayon thread pool initialization (background, non-blocking)
 *
 * Returns immediately - initialization continues in background.
 */
export function prewarmScoutWorker(): void {
  const pool = getScoutWorkerPool();
  // Check if already initialized or initialization is in progress
  if (pool['isInitialized'] || pool['initPromise']) {
    return; // Already initialized or initializing
  }
  console.log('[ScoutWorkerPool] Prewarming worker...');
  pool['initializePool']().then(() => {
    console.log('[ScoutWorkerPool] Prewarm complete');
  }).catch((error) => {
    console.warn('[ScoutWorkerPool] Prewarm failed:', error);
  });
}
