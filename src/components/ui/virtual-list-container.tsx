/**
 * VirtualListContainer Component
 *
 * A reusable container component that works with the useVirtualList hook.
 * Provides proper absolute positioning and total height calculation for
 * virtualized lists.
 *
 * @example
 * // Basic usage with useVirtualList hook
 * const { virtualItems, totalHeight, containerRef } = useVirtualList({
 *   items: cities,
 *   itemHeight: 80,
 * });
 *
 * return (
 *   <div ref={containerRef} className="h-[400px] overflow-auto">
 *     <VirtualListContainer totalHeight={totalHeight}>
 *       {virtualItems.map(({ item, index, style }) => (
 *         <div key={index} style={style}>
 *           <CityCard city={item} />
 *         </div>
 *       ))}
 *     </VirtualListContainer>
 *   </div>
 * );
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface VirtualListContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Total height of all items in pixels.
   * This creates the scrollable area for proper scrollbar sizing.
   */
  totalHeight: number
  /**
   * Optional inner className for the content wrapper.
   * The outer container always has position: relative for absolute positioning of children.
   */
  innerClassName?: string
}

/**
 * Container component for virtualized lists.
 *
 * Creates a spacer div with the total height of all items, allowing the
 * scrollbar to reflect the full list size. Children (visible items) should
 * be absolutely positioned within this container.
 *
 * Works with both desktop scroll containers and mobile bottom sheets.
 */
const VirtualListContainer = React.forwardRef<
  HTMLDivElement,
  VirtualListContainerProps
>(({ className, innerClassName, totalHeight, children, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative w-full", className)}
    style={{
      height: totalHeight,
      minHeight: totalHeight,
      ...style,
    }}
    // Data attribute for CSS performance optimizations on mobile
    data-virtual-list="true"
    {...props}
  >
    <div className={cn("absolute inset-0", innerClassName)}>
      {children}
    </div>
  </div>
))
VirtualListContainer.displayName = "VirtualListContainer"

/**
 * Wrapper component for individual virtual list items.
 * Applies absolute positioning based on the item's calculated position.
 *
 * @example
 * {virtualItems.map(({ item, index, style }) => (
 *   <VirtualListItem key={index} style={style}>
 *     <CityCard city={item} />
 *   </VirtualListItem>
 * ))}
 */
export interface VirtualListItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The style object containing positioning info from useVirtualList.
   * Includes: position, top, height, width, left
   */
  style: React.CSSProperties
}

const VirtualListItem = React.forwardRef<
  HTMLDivElement,
  VirtualListItemProps
>(({ className, style, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(className)}
    style={style}
    {...props}
  >
    {children}
  </div>
))
VirtualListItem.displayName = "VirtualListItem"

export { VirtualListContainer, VirtualListItem }
