import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Loader2, CalendarClock } from "lucide-react"
import { useSearchMeetings } from "@/api/meetings"
import { fmtDate, fmtTime } from "@/lib/format"
import { MeetingTypeBadge } from "@/components/meetings/badges"
import { cn } from "@/lib/utils"

export function HeaderSearch() {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Debounce keystrokes before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const { data: results, isFetching } = useSearchMeetings(debounced)

  function go(id: string) {
    navigate(`/meetings/${id}`)
    setQuery("")
    setOpen(false)
  }

  const showDropdown = open && debounced.trim().length > 0

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Search meetings…"
        className="h-9 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          )}

          {!isFetching && (results?.length ?? 0) === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No meetings match “{debounced}”.
            </div>
          )}

          {!isFetching &&
            (results ?? []).slice(0, 8).map((m) => (
              <button
                key={m.id}
                onClick={() => go(m.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                )}
              >
                <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.title}</span>
                    <MeetingTypeBadge type={m.type} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {fmtDate(m.startTime)} · {fmtTime(m.startTime)}
                    {m.location ? ` · ${m.location}` : ""}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
