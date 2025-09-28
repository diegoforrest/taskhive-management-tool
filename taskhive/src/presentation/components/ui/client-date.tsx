"use client"

import React from "react"
import { Badge } from "@/presentation/components/ui/badge"

type ClientDateProps = {
  iso?: string | null | undefined
  locale?: string
  options?: Intl.DateTimeFormatOptions
  showOverdueBadge?: boolean
}

export default function ClientDate({ iso, locale = 'en-US', options, showOverdueBadge }: ClientDateProps) {
  const [formatted, setFormatted] = React.useState<string | null>(null)
  const [isOverdue, setIsOverdue] = React.useState<boolean>(false)

  const optionsKey = React.useMemo(() => JSON.stringify(options || {}), [options])

  React.useEffect(() => {
    if (!iso) {
      setFormatted(null)
      setIsOverdue(false)
      return
    }

    try {
      const d = new Date(iso)
      setFormatted(new Intl.DateTimeFormat(locale, options).format(d))
      setIsOverdue(d.getTime() < Date.now())
    } catch {
      setFormatted(String(iso))
      setIsOverdue(false)
    }
  // optionsKey is a stable JSON string memoized from options; include it
  // rather than options to satisfy exhaustive-deps while keeping options
  // treated as a value rather than object identity.
  }, [iso, locale, optionsKey, options])

  if (!iso) return <span className="text-xs text-muted-foreground">No due date</span>

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{formatted}</span>
      {showOverdueBadge && isOverdue && (
        <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
      )}
    </span>
  )
}
