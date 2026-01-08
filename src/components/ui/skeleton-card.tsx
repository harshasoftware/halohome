import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

/**
 * SkeletonCard - Reusable skeleton for list item cards
 *
 * Used across ScoutPanel, CompatibilityPanel, FavoritesPanel to show
 * loading states for cards with icon, title, subtitle, and metadata.
 */

export interface SkeletonCardProps {
  /** Shape of the leading icon/avatar */
  iconShape?: "circle" | "square"
  /** Size of the leading icon (defaults vary by shape: circle=10, square=20) */
  iconSize?: "sm" | "md" | "lg"
  /** Show subtitle line */
  showSubtitle?: boolean
  /** Show metadata line (e.g., coordinates) */
  showMetadata?: boolean
  /** Number of badge/tag skeletons to show */
  badgeCount?: number
  /** Show a score badge on the right side */
  showScore?: boolean
  /** Show action button area */
  showAction?: boolean
  /** Additional className for the container */
  className?: string
}

const iconSizeMap = {
  circle: {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  },
  square: {
    sm: "w-16 h-16",
    md: "w-20 h-20",
    lg: "w-24 h-24",
  },
}

export function SkeletonCard({
  iconShape = "circle",
  iconSize = "md",
  showSubtitle = true,
  showMetadata = true,
  badgeCount = 0,
  showScore = false,
  showAction = false,
  className,
}: SkeletonCardProps) {
  const iconClasses = cn(
    iconSizeMap[iconShape][iconSize],
    iconShape === "circle" ? "rounded-full" : "rounded-lg",
    "flex-shrink-0"
  )

  return (
    <div
      className={cn(
        "p-3 rounded-xl border border-slate-200 dark:border-slate-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Leading icon/avatar */}
        <Skeleton className={iconClasses} />

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row with optional score */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4" />
            </div>
            {showScore && (
              <Skeleton className="h-6 w-14 rounded-full flex-shrink-0" />
            )}
          </div>

          {/* Subtitle */}
          {showSubtitle && <Skeleton className="h-3 w-1/2" />}

          {/* Metadata (e.g., coordinates) */}
          {showMetadata && <Skeleton className="h-3 w-1/3" />}

          {/* Badges/tags */}
          {badgeCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {Array.from({ length: badgeCount }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-12 rounded" />
              ))}
            </div>
          )}

          {/* Action button */}
          {showAction && (
            <Skeleton className="h-9 w-full rounded-lg mt-2" />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonCardList - Renders multiple SkeletonCards
 */
export interface SkeletonCardListProps extends SkeletonCardProps {
  /** Number of skeleton cards to render */
  count?: number
  /** Gap between cards */
  gap?: "sm" | "md" | "lg"
}

const gapMap = {
  sm: "space-y-1",
  md: "space-y-2",
  lg: "space-y-3",
}

export function SkeletonCardList({
  count = 3,
  gap = "md",
  ...cardProps
}: SkeletonCardListProps) {
  return (
    <div className={gapMap[gap]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...cardProps} />
      ))}
    </div>
  )
}

/**
 * Pre-configured skeleton variants for common use cases
 */

/** Skeleton for favorites panel cards (icon + name + country + coordinates) */
export function SkeletonFavoriteCard({ className }: { className?: string }) {
  return (
    <SkeletonCard
      iconShape="circle"
      iconSize="md"
      showSubtitle={true}
      showMetadata={true}
      showScore={false}
      badgeCount={0}
      className={className}
    />
  )
}

/** Skeleton for compatibility panel cards (rank + name + score + tags) */
export function SkeletonCompatibilityCard({ className }: { className?: string }) {
  return (
    <SkeletonCard
      iconShape="circle"
      iconSize="sm"
      showSubtitle={true}
      showMetadata={true}
      showScore={true}
      badgeCount={3}
      showAction={true}
      className={className}
    />
  )
}

/** Skeleton for scout panel cards (rank + name + score + planet tags) */
export function SkeletonScoutCard({ className }: { className?: string }) {
  return (
    <SkeletonCard
      iconShape="circle"
      iconSize="sm"
      showSubtitle={true}
      showMetadata={true}
      showScore={true}
      badgeCount={4}
      className={className}
    />
  )
}

/** Skeleton for place cards (thumbnail + name + rating + type) */
export function SkeletonPlaceCard({ className }: { className?: string }) {
  return (
    <SkeletonCard
      iconShape="square"
      iconSize="md"
      showSubtitle={true}
      showMetadata={true}
      showScore={false}
      badgeCount={1}
      className={cn("border-0 p-2", className)}
    />
  )
}

/**
 * Skeleton for mobile favorites sheet cards - larger touch-friendly dimensions
 * Matches MobileFavoritesSheet's card layout with larger icon, title, subtitle,
 * coordinates, and action buttons area.
 */
export function SkeletonMobileFavoriteCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4",
        "bg-white dark:bg-white/[0.02]",
        "border-slate-200 dark:border-white/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* City icon - larger for mobile touch */}
        <Skeleton className="flex-shrink-0 w-12 h-12 rounded-xl" />

        {/* City info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />
          {/* Country */}
          <Skeleton className="h-4 w-1/2" />
          {/* Coordinates */}
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
        {/* Go to City button */}
        <Skeleton className="flex-1 h-10 rounded-lg" />
        {/* Delete button */}
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      </div>
    </div>
  )
}

export default SkeletonCard
