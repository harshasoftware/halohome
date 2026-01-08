import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

/**
 * SkeletonBadge - Reusable skeleton for badges, tags, and score displays
 *
 * Used across ScoutPanel, CompatibilityPanel, and AstrologyTab to show
 * loading states for pill-shaped badges, tags, and circular score displays.
 */

export type SkeletonBadgeSize = "xs" | "sm" | "md" | "lg"
export type SkeletonBadgeShape = "pill" | "circle"

export interface SkeletonBadgeProps {
  /** Size of the badge */
  size?: SkeletonBadgeSize
  /** Shape of the badge */
  shape?: SkeletonBadgeShape
  /** Custom width (overrides size preset) */
  width?: string
  /** Additional className for the container */
  className?: string
}

// Size presets for pill-shaped badges (width x height)
const pillSizeMap: Record<SkeletonBadgeSize, string> = {
  xs: "h-4 w-8",    // Tiny tags
  sm: "h-5 w-12",   // Small tags (planet lines, categories)
  md: "h-6 w-16",   // Medium badges
  lg: "h-7 w-20",   // Larger badges
}

// Size presets for circular badges (square dimensions)
const circleSizeMap: Record<SkeletonBadgeSize, string> = {
  xs: "h-6 w-6",    // Tiny circular indicators
  sm: "h-8 w-8",    // Rank badges
  md: "h-10 w-10",  // Score badges
  lg: "h-12 w-12",  // Large score displays
}

export function SkeletonBadge({
  size = "sm",
  shape = "pill",
  width,
  className,
}: SkeletonBadgeProps) {
  const sizeClasses = shape === "pill" ? pillSizeMap[size] : circleSizeMap[size]

  return (
    <Skeleton
      className={cn(
        sizeClasses,
        "rounded-full",
        className
      )}
      style={width ? { width } : undefined}
    />
  )
}

/**
 * SkeletonBadgeGroup - Renders multiple badges in a flex row
 */
export interface SkeletonBadgeGroupProps {
  /** Number of badges to render */
  count?: number
  /** Size of each badge */
  size?: SkeletonBadgeSize
  /** Shape of badges */
  shape?: SkeletonBadgeShape
  /** Gap between badges */
  gap?: "xs" | "sm" | "md"
  /** Additional className for the container */
  className?: string
}

const gapMap = {
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
}

export function SkeletonBadgeGroup({
  count = 3,
  size = "sm",
  shape = "pill",
  gap = "sm",
  className,
}: SkeletonBadgeGroupProps) {
  return (
    <div className={cn("flex items-center flex-wrap", gapMap[gap], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBadge key={i} size={size} shape={shape} />
      ))}
    </div>
  )
}

/**
 * Pre-configured skeleton variants for common use cases
 */

/** Skeleton for small pill-shaped tags (planet lines, category indicators) */
export function SkeletonTagBadge({ className }: { className?: string }) {
  return <SkeletonBadge size="sm" shape="pill" className={className} />
}

/** Skeleton for circular rank badges (1st, 2nd, 3rd place indicators) */
export function SkeletonRankBadge({ className }: { className?: string }) {
  return <SkeletonBadge size="sm" shape="circle" className={className} />
}

/** Skeleton for circular score badges (overall score displays) */
export function SkeletonScoreBadge({ className }: { className?: string }) {
  return <SkeletonBadge size="md" shape="circle" className={className} />
}

/** Skeleton for larger score displays */
export function SkeletonLargeScoreBadge({ className }: { className?: string }) {
  return <SkeletonBadge size="lg" shape="circle" className={className} />
}

/** Skeleton for category filter pills */
export function SkeletonFilterPill({ className }: { className?: string }) {
  return <SkeletonBadge size="md" shape="pill" className={className} />
}

export default SkeletonBadge
