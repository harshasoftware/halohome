
import * as React from "react"

/**
 * A hook to determine if the current device is a mobile device.
 * @param breakpoint - The breakpoint to use to determine if the device is mobile.
 * @returns `true` if the device is a mobile device, `false` otherwise.
 */
export function useIsMobile(breakpoint = 768) {
  // Initialize with actual window width if available (client-side)
  const getInitialValue = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint
    }
    return false
  }

  const [isMobile, setIsMobile] = React.useState(getInitialValue)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Set initial value in effect as well for SSR hydration
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [breakpoint])

  return isMobile
}
