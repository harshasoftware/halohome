/**
 * GSAP Type Definitions
 *
 * TypeScript types for lazy-loaded GSAP and ScrollTrigger.
 * These provide minimal type coverage for the API surface used in this codebase.
 */

/**
 * GSAP Tween configuration options
 */
export interface GSAPTweenVars {
  duration?: number;
  delay?: number;
  ease?: string;
  stagger?: number | GSAPStaggerConfig;
  repeat?: number;
  yoyo?: boolean;
  paused?: boolean;
  immediateRender?: boolean;
  overwrite?: boolean | string;
  onComplete?: () => void;
  onStart?: () => void;
  onUpdate?: () => void;
  scrollTrigger?: ScrollTriggerConfig | ScrollTriggerStatic;
  // Transform properties
  x?: number | string;
  y?: number | string;
  rotation?: number;
  rotationX?: number;
  rotationY?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  skewY?: number;
  // CSS properties
  opacity?: number;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  color?: string;
  filter?: string;
  // SVG specific
  strokeDashoffset?: number;
  strokeDasharray?: number | string;
  drawSVG?: string | number;
  // Allow any other CSS/GSAP properties
  [key: string]: unknown;
}

/**
 * GSAP Stagger configuration
 */
export interface GSAPStaggerConfig {
  each?: number;
  amount?: number;
  from?: number | string | 'start' | 'center' | 'end' | 'edges' | 'random';
  grid?: [number, number] | 'auto';
  axis?: 'x' | 'y';
  ease?: string;
}

/**
 * GSAP Timeline configuration
 */
export interface GSAPTimelineVars extends GSAPTweenVars {
  defaults?: GSAPTweenVars;
  smoothChildTiming?: boolean;
  autoRemoveChildren?: boolean;
}

/**
 * GSAP Tween instance
 */
export interface GSAPTween {
  play(): GSAPTween;
  pause(): GSAPTween;
  resume(): GSAPTween;
  reverse(): GSAPTween;
  restart(includeDelay?: boolean, suppressEvents?: boolean): GSAPTween;
  seek(time: number | string, suppressEvents?: boolean): GSAPTween;
  progress(value?: number, suppressEvents?: boolean): number | GSAPTween;
  timeScale(value?: number): number | GSAPTween;
  kill(): GSAPTween;
  duration(value?: number): number | GSAPTween;
  totalDuration(value?: number): number | GSAPTween;
  delay(value?: number): number | GSAPTween;
  invalidate(): GSAPTween;
  isActive(): boolean;
}

/**
 * GSAP Timeline instance
 */
export interface GSAPTimeline extends GSAPTween {
  to(targets: GSAPTarget, vars: GSAPTweenVars, position?: string | number): GSAPTimeline;
  from(targets: GSAPTarget, vars: GSAPTweenVars, position?: string | number): GSAPTimeline;
  fromTo(targets: GSAPTarget, fromVars: GSAPTweenVars, toVars: GSAPTweenVars, position?: string | number): GSAPTimeline;
  set(targets: GSAPTarget, vars: GSAPTweenVars, position?: string | number): GSAPTimeline;
  add(child: GSAPTween | GSAPTimeline | (() => void), position?: string | number): GSAPTimeline;
  addLabel(label: string, position?: string | number): GSAPTimeline;
  addPause(position?: string | number, callback?: () => void): GSAPTimeline;
  clear(includeLabels?: boolean): GSAPTimeline;
  getChildren(nested?: boolean, tweens?: boolean, timelines?: boolean, ignoreBeforeTime?: number): (GSAPTween | GSAPTimeline)[];
}

/**
 * Valid GSAP animation targets
 */
export type GSAPTarget = string | Element | Element[] | NodeList | object | null;

/**
 * ScrollTrigger configuration
 */
export interface ScrollTriggerConfig {
  trigger?: string | Element;
  scroller?: string | Element | Window;
  start?: string | number | (() => string | number);
  end?: string | number | (() => string | number);
  endTrigger?: string | Element;
  scrub?: boolean | number;
  pin?: boolean | string | Element;
  pinSpacing?: boolean | string;
  markers?: boolean | { startColor?: string; endColor?: string; fontSize?: string; fontWeight?: string; indent?: number };
  toggleActions?: string;
  toggleClass?: string | { targets: string | Element | Element[]; className: string };
  once?: boolean;
  anticipatePin?: number;
  fastScrollEnd?: boolean | number;
  horizontal?: boolean;
  containerAnimation?: GSAPTimeline;
  onEnter?: (self: ScrollTriggerInstance) => void;
  onLeave?: (self: ScrollTriggerInstance) => void;
  onEnterBack?: (self: ScrollTriggerInstance) => void;
  onLeaveBack?: (self: ScrollTriggerInstance) => void;
  onUpdate?: (self: ScrollTriggerInstance) => void;
  onToggle?: (self: ScrollTriggerInstance) => void;
  onRefresh?: (self: ScrollTriggerInstance) => void;
  onRefreshInit?: (self: ScrollTriggerInstance) => void;
  onScrubComplete?: (self: ScrollTriggerInstance) => void;
  invalidateOnRefresh?: boolean;
  id?: string;
  animation?: GSAPTween | GSAPTimeline;
}

/**
 * ScrollTrigger instance
 */
export interface ScrollTriggerInstance {
  animation?: GSAPTween | GSAPTimeline;
  direction: number;
  end: number;
  isActive: boolean;
  pin?: Element;
  progress: number;
  scroller: Element | Window;
  start: number;
  trigger?: Element;
  vars: ScrollTriggerConfig;
  disable(reset?: boolean, allowAnimation?: boolean): void;
  enable(reset?: boolean, refresh?: boolean): void;
  getTween(): GSAPTween | undefined;
  kill(reset?: boolean, allowAnimation?: boolean): void;
  labelToScroll(label: string): number;
  refresh(safe?: boolean): void;
  scroll(position?: number): number | void;
  update(reset?: boolean, recordVelocity?: boolean, forceFake?: boolean): void;
}

/**
 * ScrollTrigger static methods and properties
 */
export interface ScrollTriggerStatic {
  create(config: ScrollTriggerConfig): ScrollTriggerInstance;
  defaults(config: Partial<ScrollTriggerConfig>): void;
  getAll(): ScrollTriggerInstance[];
  getById(id: string): ScrollTriggerInstance | undefined;
  isScrolling(): boolean;
  refresh(safe?: boolean): void;
  update(): void;
  clearScrollMemory(): void;
  maxScroll(element: Element | Window, horizontal?: boolean): number;
  scrollerProxy(element: string | Element, vars?: { scrollTop?: (value?: number) => number | void; scrollLeft?: (value?: number) => number | void; getBoundingClientRect?: () => DOMRect; pinType?: string }): void;
  addEventListener(type: string, callback: () => void): void;
  removeEventListener(type: string, callback: () => void): void;
  batch(targets: GSAPTarget, vars: { interval?: number; batchMax?: number; once?: boolean; onEnter?: (elements: Element[], triggers: ScrollTriggerInstance[]) => void; onLeave?: (elements: Element[], triggers: ScrollTriggerInstance[]) => void; onEnterBack?: (elements: Element[], triggers: ScrollTriggerInstance[]) => void; onLeaveBack?: (elements: Element[], triggers: ScrollTriggerInstance[]) => void; [key: string]: unknown }): ScrollTriggerInstance[];
  sort(func?: (a: ScrollTriggerInstance, b: ScrollTriggerInstance) => number): ScrollTriggerInstance[];
  enable(): void;
  disable(): void;
  kill(reset?: boolean): void;
  saveStyles(targets: GSAPTarget): void;
  revert(soft?: boolean): void;
  clearMatchMedia(): void;
  matchMedia(vars: Record<string, () => void | (() => void)>): { add: (key: string, func: () => void | (() => void)) => void; revert: () => void; kill: () => void };
  config(config: { limitCallbacks?: boolean; syncInterval?: number; autoRefreshEvents?: string; ignoreMobileResize?: boolean }): void;
  normalizeScroll(vars?: boolean | { allowNestedScroll?: boolean; lockAxis?: boolean; momentum?: ((self: ScrollTriggerStatic) => number) | number; type?: string; content?: Element; target?: Element | Window }): { enable: () => void; disable: () => void; kill: () => void } | void;
  observe(vars: { target: GSAPTarget; type: string; onUp?: () => void; onDown?: () => void; onLeft?: () => void; onRight?: () => void; onChange?: () => void; onPress?: () => void; onRelease?: () => void; onDrag?: () => void; wheelSpeed?: number; tolerance?: number; preventDefault?: boolean; ignore?: GSAPTarget; lockAxis?: boolean; capture?: boolean; debounce?: boolean; dragMinimum?: number; onEnable?: () => void; onDisable?: () => void; onClick?: () => void; onHover?: () => void; onHoverEnd?: () => void }): { enable: () => void; disable: () => void; kill: () => void };
}

/**
 * GSAP Static interface (the main gsap object)
 */
export interface GSAPStatic {
  // Core animation methods
  to(targets: GSAPTarget, vars: GSAPTweenVars): GSAPTween;
  from(targets: GSAPTarget, vars: GSAPTweenVars): GSAPTween;
  fromTo(targets: GSAPTarget, fromVars: GSAPTweenVars, toVars: GSAPTweenVars): GSAPTween;
  set(targets: GSAPTarget, vars: GSAPTweenVars): GSAPTween;
  timeline(vars?: GSAPTimelineVars): GSAPTimeline;

  // Utility methods
  killTweensOf(targets: GSAPTarget, props?: string | object): void;
  getTweensOf(targets: GSAPTarget, onlyActive?: boolean): GSAPTween[];
  isTweening(targets: GSAPTarget): boolean;
  getProperty(target: GSAPTarget, property: string, unit?: string): string | number;
  quickSetter(target: GSAPTarget, property: string, unit?: string): (value: number | string) => void;
  quickTo(target: GSAPTarget, property: string, vars?: GSAPTweenVars): (value: number | string, start?: number | string, startIsRelative?: boolean) => GSAPTween;

  // Plugin registration
  registerPlugin(...plugins: unknown[]): void;

  // Easing
  parseEase(ease: string | ((progress: number) => number)): (progress: number) => number;

  // Global timeline control
  globalTimeline: GSAPTimeline;
  ticker: {
    add(callback: () => void): void;
    remove(callback: () => void): void;
    fps(value?: number): number | void;
    lagSmoothing(threshold?: number, adjustedLag?: number): void;
    deltaRatio(fps?: number): number;
    time: number;
    frame: number;
    wake(): void;
    sleep(): void;
  };

  // Version and config
  version: string;
  config(config?: { autoSleep?: number; force3D?: boolean | string; nullTargetWarn?: boolean; units?: { [key: string]: string } }): { autoSleep: number; force3D: boolean | string; nullTargetWarn: boolean; units: { [key: string]: string } };
  defaults(vars?: GSAPTweenVars): GSAPTweenVars;

  // Context for scoping and cleanup
  context(func?: () => void, scope?: Element | string): { add: (func: () => void) => void; revert: () => void; kill: () => void; clear: () => void };

  // Utility functions
  utils: {
    checkPrefix(property: string, element?: Element): string;
    clamp(minimum: number, maximum: number, value: number): number;
    distribute(config: { base?: number; amount?: number; from?: number | string; grid?: [number, number] | 'auto'; axis?: 'x' | 'y'; ease?: string | ((progress: number) => number) }): (i: number, target: Element, targets: Element[]) => number;
    getUnit(value: string | number): string;
    interpolate<T>(start: T, end: T, progress: number): T;
    mapRange(inMin: number, inMax: number, outMin: number, outMax: number, value: number): number;
    normalize(min: number, max: number, value: number): number;
    pipe(...functions: ((value: number) => number)[]): (value: number) => number;
    random(min: number, max: number, snap?: number, returnFunction?: boolean): number | (() => number);
    selector(scope?: Element | string): (selector: string) => Element[];
    shuffle<T>(array: T[]): T[];
    snap(snapValue: number | number[] | ((value: number) => number), value: number): number;
    splitColor(color: string, returnHSL?: boolean): [number, number, number, number?];
    toArray<T extends Element>(value: GSAPTarget): T[];
    unitize(func: (value: number) => number, unit?: string): (value: number) => string;
    wrap(value1: number | unknown[], value2?: number, index?: number): number | unknown | ((i: number) => unknown);
    wrapYoyo(value1: number | unknown[], value2?: number, index?: number): number | unknown | ((i: number) => unknown);
  };

  // MatchMedia for responsive animations
  matchMedia(): { add: (key: string, func: () => void | (() => void)) => void; revert: () => void; kill: () => void };
  matchMediaRefresh(): void;
}
