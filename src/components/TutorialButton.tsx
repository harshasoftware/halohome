import * as React from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useTutorial } from '@/stores/uiStore'

export function TutorialButton() {
  const { setShowTutorial } = useTutorial()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setShowTutorial(true)}
          className="relative flex items-center justify-center h-9 w-9 rounded-full border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          aria-label="Start tutorial"
        >
          <FontAwesomeIcon icon={faLightbulb} className="h-[1.1rem] w-[1.1rem]" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tutorial</p>
      </TooltipContent>
    </Tooltip>
  )
}
