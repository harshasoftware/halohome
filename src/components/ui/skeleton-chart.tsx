import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

/**
 * SkeletonChart - Reusable skeletons for chart/analysis displays
 *
 * Used in AstrologyTab and RelocationPanel to show loading states for:
 * - Aggregate score cards with progress bars
 * - Angular shift cards (ASC/MC)
 * - Planet influence rows with progress indicators
 * - House change displays
 */

/**
 * SkeletonProgressBar - A simple horizontal progress bar skeleton
 */
export interface SkeletonProgressBarProps {
  /** Height of the progress bar */
  height?: "xs" | "sm" | "md"
  /** Additional className */
  className?: string
}

const progressHeightMap = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
}

export function SkeletonProgressBar({
  height = "sm",
  className,
}: SkeletonProgressBarProps) {
  return (
    <Skeleton
      className={cn(
        "w-full rounded-full",
        progressHeightMap[height],
        className
      )}
    />
  )
}

/**
 * SkeletonScoreCard - Score display card with progress bar
 * Used for AstrologyTab aggregate influence score
 */
export interface SkeletonScoreCardProps {
  /** Show the header row with icon and label */
  showHeader?: boolean
  /** Show the score value */
  showScore?: boolean
  /** Show the progress bar */
  showProgressBar?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonScoreCard({
  showHeader = true,
  showScore = true,
  showProgressBar = true,
  className,
}: SkeletonScoreCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 bg-muted/30",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          {/* Icon and label */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Score and quality label */}
          {showScore && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          )}
        </div>
      )}
      {showProgressBar && <SkeletonProgressBar height="md" />}
    </div>
  )
}

/**
 * SkeletonAngularShiftCard - Card showing angular shift (ASC/MC)
 * Used for RelocationPanel angular shifts section
 */
export interface SkeletonAngularShiftCardProps {
  /** Additional className */
  className?: string
}

export function SkeletonAngularShiftCard({
  className,
}: SkeletonAngularShiftCardProps) {
  return (
    <div
      className={cn(
        "p-3 bg-muted/50 rounded-lg space-y-2",
        className
      )}
    >
      {/* Header row: label and shift badge */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
      {/* Sign transition row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

/**
 * SkeletonPlanetRow - Row showing planet with progress/change info
 * Used for AstrologyTab line influences and RelocationPanel house changes
 */
export interface SkeletonPlanetRowProps {
  /** Show expanded state with progress bar */
  expanded?: boolean
  /** Show house change arrow and values */
  showHouseChange?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonPlanetRow({
  expanded = false,
  showHouseChange = false,
  className,
}: SkeletonPlanetRowProps) {
  return (
    <div
      className={cn(
        "py-2 border-b border-slate-100 dark:border-slate-800 last:border-0",
        className
      )}
    >
      {/* Main row */}
      <div className="flex items-center justify-between p-1">
        <div className="flex items-center gap-2">
          {/* Planet indicator */}
          <Skeleton className="w-3 h-3 rounded-full" />
          {/* Planet name and type */}
          <Skeleton className="h-4 w-28" />
          {/* Influence badge */}
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <div className="flex items-center gap-2">
          {showHouseChange ? (
            <>
              {/* House change: H1 → H2 */}
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-4 w-6" />
            </>
          ) : (
            <>
              {/* Distance */}
              <Skeleton className="h-3 w-12" />
              {/* Chevron */}
              <Skeleton className="h-3 w-3" />
            </>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 ml-5 space-y-2">
          {/* Progress bar with score */}
          <div className="flex items-center gap-2">
            <SkeletonProgressBar height="sm" className="flex-1" />
            <Skeleton className="h-3 w-8" />
          </div>
          {/* Interpretation text */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      )}
    </div>
  )
}

/**
 * SkeletonPlanetRowList - List of planet rows
 */
export interface SkeletonPlanetRowListProps {
  /** Number of rows to show */
  count?: number
  /** Number of expanded rows (from the start) */
  expandedCount?: number
  /** Show house change style */
  showHouseChange?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonPlanetRowList({
  count = 5,
  expandedCount = 3,
  showHouseChange = false,
  className,
}: SkeletonPlanetRowListProps) {
  return (
    <div className={cn("bg-muted/30 rounded-lg p-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPlanetRow
          key={i}
          expanded={!showHouseChange && i < expandedCount}
          showHouseChange={showHouseChange}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonDominantPlanets - Badges showing dominant planetary energies
 */
export interface SkeletonDominantPlanetsProps {
  /** Number of planet badges to show */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonDominantPlanets({
  count = 3,
  className,
}: SkeletonDominantPlanetsProps) {
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Planet badges */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
    </div>
  )
}

/**
 * SkeletonInterpretation - Text block for interpretations
 */
export interface SkeletonInterpretationProps {
  /** Number of text lines */
  lines?: number
  /** Additional className */
  className?: string
}

export function SkeletonInterpretation({
  lines = 3,
  className,
}: SkeletonInterpretationProps) {
  return (
    <div className={cn("bg-muted/30 rounded-lg p-3 space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonLocationHeader - Header bar showing location transition
 * Used for RelocationPanel location header
 */
export interface SkeletonLocationHeaderProps {
  /** Additional className */
  className?: string
}

export function SkeletonLocationHeader({
  className,
}: SkeletonLocationHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg",
        className
      )}
    >
      {/* Origin location */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Arrow */}
      <Skeleton className="w-4 h-4 flex-shrink-0" />
      {/* Destination location */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

/**
 * SkeletonSectionHeader - Section header with optional count
 */
export interface SkeletonSectionHeaderProps {
  /** Show count on the right */
  showCount?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonSectionHeader({
  showCount = false,
  className,
}: SkeletonSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <Skeleton className="h-3 w-24" />
      {showCount && <Skeleton className="h-3 w-12" />}
    </div>
  )
}

/**
 * SkeletonHouseChangeCard - Card for planet house change
 * Used in RelocationPanel when planets change houses
 */
export interface SkeletonHouseChangeCardProps {
  /** Additional className */
  className?: string
}

export function SkeletonHouseChangeCard({
  className,
}: SkeletonHouseChangeCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 bg-muted/30 rounded-lg",
        className
      )}
    >
      {/* Planet symbol and name */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-5 h-5" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* House change */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-4 w-8" />
      </div>
    </div>
  )
}

/**
 * SkeletonHouseChangeList - List of house change cards
 */
export interface SkeletonHouseChangeListProps {
  /** Number of cards to show */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonHouseChangeList({
  count = 4,
  className,
}: SkeletonHouseChangeListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHouseChangeCard key={i} />
      ))}
    </div>
  )
}

/**
 * SkeletonLegend - Legend items for influence levels
 */
export interface SkeletonLegendProps {
  /** Number of legend items */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonLegend({
  count = 4,
  className,
}: SkeletonLegendProps) {
  return (
    <div className={className}>
      <Skeleton className="h-3 w-24 mb-2" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * SkeletonActionButtons - Action buttons area
 */
export interface SkeletonActionButtonsProps {
  /** Number of buttons */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonActionButtons({
  count = 2,
  className,
}: SkeletonActionButtonsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}

/**
 * Pre-configured composite skeletons for specific use cases
 */

/**
 * SkeletonAstrologyAnalysis - Full skeleton for AstrologyTab
 */
export function SkeletonAstrologyAnalysis({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 pb-8 space-y-4", className)}>
      {/* Aggregate Score */}
      <SkeletonScoreCard />

      {/* Dominant Planets */}
      <SkeletonDominantPlanets count={3} />

      {/* Overall Interpretation */}
      <SkeletonInterpretation lines={3} />

      {/* Line Influences Section */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <SkeletonSectionHeader showCount className="mb-2" />
        <SkeletonPlanetRowList count={5} expandedCount={3} />
      </div>

      {/* Action Buttons */}
      <SkeletonActionButtons count={2} />

      {/* Legend */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <SkeletonLegend count={4} />
      </div>
    </div>
  )
}

/**
 * SkeletonRelocationAnalysis - Full skeleton for RelocationPanel
 */
export function SkeletonRelocationAnalysis({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 space-y-6", className)}>
      {/* Location Header */}
      <SkeletonLocationHeader />

      {/* Angular Shifts */}
      <div className="space-y-3">
        <SkeletonSectionHeader />
        <SkeletonAngularShiftCard />
        <SkeletonAngularShiftCard />
      </div>

      {/* House Changes */}
      <div className="space-y-3">
        <SkeletonSectionHeader showCount />
        <SkeletonHouseChangeList count={4} />
      </div>

      {/* Footer info */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
        <Skeleton className="h-3 w-32 mx-auto" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  )
}

export default SkeletonScoreCard
