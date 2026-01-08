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

/**
 * SkeletonScoutLocationCard - Card showing a scouted location
 * Matches the structure of RankedLocationCard and OverallLocationCard
 */
export interface SkeletonScoutLocationCardProps {
  /** Show rank badge on the left */
  showRank?: boolean
  /** Show category badges (for overall view) */
  showCategoryBadges?: boolean
  /** Number of tag badges to show */
  tagCount?: number
  /** Additional className */
  className?: string
}

export function SkeletonScoutLocationCard({
  showRank = true,
  showCategoryBadges = false,
  tagCount = 2,
  className,
}: SkeletonScoutLocationCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        {showRank && (
          <Skeleton className="flex-shrink-0 w-9 h-9 rounded-full" />
        )}

        <div className="flex-1 min-w-0 space-y-2">
          {/* City Name */}
          <Skeleton className="h-4 w-32" />
          {/* Country */}
          <Skeleton className="h-3 w-20" />

          {/* Nature Badge + Distance */}
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>

          {/* Category badges (for overall view) or Planet line tags */}
          {showCategoryBadges ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          ) : tagCount > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Array.from({ length: tagCount }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded-md" />
              ))}
            </div>
          )}
        </div>

        {/* Score Badge */}
        <Skeleton className="flex-shrink-0 w-10 h-10 rounded-full" />
      </div>
    </div>
  )
}

/**
 * SkeletonScoutLocationCardList - List of scout location cards
 */
export interface SkeletonScoutLocationCardListProps {
  /** Number of cards to show */
  count?: number
  /** Show rank badges */
  showRank?: boolean
  /** Show category badges (for overall view) */
  showCategoryBadges?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonScoutLocationCardList({
  count = 5,
  showRank = true,
  showCategoryBadges = false,
  className,
}: SkeletonScoutLocationCardListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonScoutLocationCard
          key={i}
          showRank={showRank}
          showCategoryBadges={showCategoryBadges}
          tagCount={i % 2 === 0 ? 2 : 1}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonScoutFilterPills - Category filter pills skeleton
 */
export interface SkeletonScoutFilterPillsProps {
  /** Number of pills to show */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonScoutFilterPills({
  count = 7,
  className,
}: SkeletonScoutFilterPillsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-hidden px-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-9 rounded-full flex-shrink-0",
            i === 0 ? "w-20" : "w-16" // First pill (Overall) is wider
          )}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonScoutFiltersRow - Filter controls row skeleton
 */
export interface SkeletonScoutFiltersRowProps {
  /** Show country filter */
  showCountryFilter?: boolean
  /** Additional className */
  className?: string
}

export function SkeletonScoutFiltersRow({
  showCountryFilter = true,
  className,
}: SkeletonScoutFiltersRowProps) {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      {/* View Mode Toggle */}
      <Skeleton className="h-7 w-24 rounded-lg" />
      {/* Population Filter */}
      <Skeleton className="h-7 w-20 rounded-md" />
      {/* Country Filter */}
      {showCountryFilter && (
        <Skeleton className="h-7 w-28 rounded-md" />
      )}
      {/* Spacer */}
      <div className="flex-1" />
      {/* Good/Avoid Toggle */}
      <Skeleton className="h-7 w-24 rounded-lg" />
    </div>
  )
}

/**
 * SkeletonScoutStatsRow - Stats summary row skeleton
 */
export interface SkeletonScoutStatsRowProps {
  /** Additional className */
  className?: string
}

export function SkeletonScoutStatsRow({
  className,
}: SkeletonScoutStatsRowProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-1.5", className)}>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/**
 * SkeletonScoutCountrySection - Country accordion section skeleton
 */
export interface SkeletonScoutCountrySectionProps {
  /** Additional className */
  className?: string
}

export function SkeletonScoutCountrySection({
  className,
}: SkeletonScoutCountrySectionProps) {
  return (
    <div className={cn("border-b border-slate-200 dark:border-white/5", className)}>
      <div className="w-full px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Flag */}
          <Skeleton className="w-6 h-4 rounded" />
          {/* Country name */}
          <Skeleton className="h-4 w-24" />
          {/* Count badges */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-10 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonScoutCountrySectionList - List of country sections
 */
export interface SkeletonScoutCountrySectionListProps {
  /** Number of country sections to show */
  count?: number
  /** Additional className */
  className?: string
}

export function SkeletonScoutCountrySectionList({
  count = 5,
  className,
}: SkeletonScoutCountrySectionListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonScoutCountrySection key={i} />
      ))}
    </div>
  )
}

/**
 * SkeletonScoutPanel - Full skeleton for ScoutPanel content area
 * Shows skeleton for the scrollable content (without the static header elements)
 */
export interface SkeletonScoutPanelContentProps {
  /** View mode: top (location cards) or countries (accordion sections) */
  viewMode?: "top" | "countries"
  /** Additional className */
  className?: string
}

export function SkeletonScoutPanelContent({
  viewMode = "top",
  className,
}: SkeletonScoutPanelContentProps) {
  return (
    <div className={cn("h-full", className)}>
      {viewMode === "top" ? (
        <div className="p-4">
          <SkeletonScoutLocationCardList count={6} showCategoryBadges />
        </div>
      ) : (
        <SkeletonScoutCountrySectionList count={8} />
      )}
    </div>
  )
}

export default SkeletonScoreCard
