import { useMemo, useState } from "react"
import { DateTime } from "luxon"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

/**
 * Read-only month calendar for the dashboard rail: highlights today and marks
 * days that have meetings with a dot.
 */
export function MiniCalendar({ meetingDates }: { meetingDates: Set<string> }) {
  const [month, setMonth] = useState(() => DateTime.now().startOf("month"))
  const today = DateTime.now()

  const days = useMemo(() => {
    const start = month.startOf("month")
    // Sunday-first grid: Luxon weekday is Mon=1..Sun=7.
    const gridStart = start.minus({ days: start.weekday % 7 })
    return Array.from({ length: 42 }, (_, i) => gridStart.plus({ days: i }))
  }, [month])

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{month.toFormat("LLLL yyyy")}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => m.minus({ months: 1 }))}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setMonth((m) => m.plus({ months: 1 }))}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.hasSame(month, "month")
          const isToday = day.hasSame(today, "day")
          const hasMeeting = meetingDates.has(day.toFormat("yyyy-LL-dd"))
          return (
            <div key={day.toISO()} className="flex justify-center py-0.5">
              <div
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full text-sm",
                  !inMonth && "text-muted-foreground/40",
                  inMonth && !isToday && "text-foreground",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {day.day}
                {hasMeeting && !isToday && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
