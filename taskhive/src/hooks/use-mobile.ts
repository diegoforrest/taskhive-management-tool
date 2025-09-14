import * as React from "react"
import { BP_MOBILE } from "@/lib/breakpoints"

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BP_MOBILE - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BP_MOBILE)
    }
    // Use addEventListener if available, fallback to addListener for older browsers
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener("change", onChange)
    } else if (typeof (mql as any).addListener === 'function') {
      ;(mql as any).addListener(onChange)
    }

    setIsMobile(window.innerWidth < BP_MOBILE)

    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener("change", onChange)
      } else if (typeof (mql as any).removeListener === 'function') {
        ;(mql as any).removeListener(onChange)
      }
    }
  }, [])

  return !!isMobile
}
