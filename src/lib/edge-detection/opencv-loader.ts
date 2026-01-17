/**
 * OpenCV.js Dynamic Loader
 *
 * Loads OpenCV.js on-demand to avoid bloating the main bundle.
 * Uses the official OpenCV.js build from CDN.
 */

// OpenCV.js global type declaration
declare global {
  interface Window {
    cv: typeof import('opencv-ts');
    Module: {
      onRuntimeInitialized: () => void;
    };
  }
}

// Type definitions for OpenCV.js (simplified subset we use)
export interface OpenCV {
  Mat: new (rows?: number, cols?: number, type?: number) => Mat;
  matFromImageData: (imageData: ImageData) => Mat;
  imread: (canvas: HTMLCanvasElement) => Mat;
  imshow: (canvas: HTMLCanvasElement, mat: Mat) => void;
  cvtColor: (src: Mat, dst: Mat, code: number, dstCn?: number) => void;
  GaussianBlur: (src: Mat, dst: Mat, ksize: Size, sigmaX: number, sigmaY?: number, borderType?: number) => void;
  Canny: (src: Mat, dst: Mat, threshold1: number, threshold2: number, apertureSize?: number, L2gradient?: boolean) => void;
  HoughLinesP: (image: Mat, lines: Mat, rho: number, theta: number, threshold: number, minLineLength?: number, maxLineGap?: number) => void;
  findContours: (image: Mat, contours: MatVector, hierarchy: Mat, mode: number, method: number, offset?: Point) => void;
  approxPolyDP: (curve: Mat, approxCurve: Mat, epsilon: number, closed: boolean) => void;
  arcLength: (curve: Mat, closed: boolean) => number;
  contourArea: (contour: Mat, oriented?: boolean) => number;
  boundingRect: (points: Mat) => Rect;
  COLOR_RGBA2GRAY: number;
  COLOR_GRAY2RGBA: number;
  RETR_EXTERNAL: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
  CHAIN_APPROX_TC89_L1: number;
  CV_8UC1: number;
  CV_8UC4: number;
  Size: new (width: number, height: number) => Size;
  Point: new (x: number, y: number) => Point;
  Scalar: new (v0: number, v1?: number, v2?: number, v3?: number) => Scalar;
  MatVector: new () => MatVector;
}

export interface Mat {
  rows: number;
  cols: number;
  data: Uint8Array;
  data32S: Int32Array;
  delete: () => void;
  clone: () => Mat;
  size: () => Size;
  get: (row: number, col: number) => number[];
  intPtr: (row: number, col: number) => number;
}

export interface MatVector {
  size: () => number;
  get: (index: number) => Mat;
  delete: () => void;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Scalar {
  [index: number]: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// CDN URL for OpenCV.js
const OPENCV_CDN_URL = 'https://docs.opencv.org/4.8.0/opencv.js';

let cvInstance: OpenCV | null = null;
let loadingPromise: Promise<OpenCV> | null = null;

/**
 * Load OpenCV.js from CDN.
 * Returns a promise that resolves when OpenCV is ready.
 */
export async function loadOpenCV(): Promise<OpenCV> {
  // Return existing instance if already loaded
  if (cvInstance) {
    return cvInstance;
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.cv && window.cv.Mat) {
      cvInstance = window.cv as unknown as OpenCV;
      resolve(cvInstance);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = OPENCV_CDN_URL;
    script.async = true;

    // Set up the runtime initialized callback
    window.Module = {
      onRuntimeInitialized: () => {
        cvInstance = window.cv as unknown as OpenCV;
        resolve(cvInstance);
      },
    };

    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Failed to load OpenCV.js from CDN'));
    };

    // Add timeout
    const timeout = setTimeout(() => {
      if (!cvInstance) {
        loadingPromise = null;
        reject(new Error('OpenCV.js loading timed out'));
      }
    }, 30000);

    // Clear timeout on success
    const originalCallback = window.Module.onRuntimeInitialized;
    window.Module.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      originalCallback();
    };

    document.body.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Check if OpenCV is loaded and ready.
 */
export function isOpenCVReady(): boolean {
  return cvInstance !== null;
}

/**
 * Get the OpenCV instance (throws if not loaded).
 */
export function getOpenCV(): OpenCV {
  if (!cvInstance) {
    throw new Error('OpenCV.js is not loaded. Call loadOpenCV() first.');
  }
  return cvInstance;
}
