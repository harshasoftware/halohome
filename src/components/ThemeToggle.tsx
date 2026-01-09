import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark'
  // On hover, preview the opposite theme's icon
  const showSun = isDark ? isHovered : !isHovered
  const showMoon = isDark ? !isHovered : isHovered

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex items-center justify-center h-9 w-9 rounded-full border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors overflow-hidden"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {/* Sun icon */}
          <Sun
            className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ease-out ${
              showSun
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            }`}
          />
          {/* Moon icon */}
          <Moon
            className={`h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 ease-out ${
              showMoon
                ? 'rotate-0 scale-100 opacity-100'
                : 'rotate-90 scale-0 opacity-0'
            }`}
          />
          <span className="sr-only">Toggle theme</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isDark ? 'Light mode' : 'Dark mode'}</p>
      </TooltipContent>
    </Tooltip>
  )
}
