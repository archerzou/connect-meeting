import { useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DateTime } from "luxon"
import { CalendarDays, Clock, MapPin, Plus } from "lucide-react"
import { useMeetings, type MeetingDto } from "@/api/meetings"
import { MEETING_TYPES, MEETING_TYPE_LIST, type MeetingType } from "@/domain/meeting"
import { fmtTime } from "@/lib/format"
import { formatDuration } from "@/lib/duration"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MeetingTypeBadge } from "@/components/meetings/badges"
import { ParticipantAvatars } from "@/components/meetings/ParticipantAvatars"
import { MiniCalendar } from "@/components/meetings/MiniCalendar"

export default function Dashboard() {
  const { data: meetings, isLoading } = useMeetings()
  const [filter, setFilter] = useState<MeetingType | "all">("all")
  const navigate = useNavigate()

  const filtered = useMemo(
    () => (meetings ?? []).filter((m) => filter === "all" || m.type === filter),
    [meetings, filter]
  )

  const grouped = useMemo(() => groupByDay(filtered), [filtered])
  const todayCount = (meetings ?? []).filter((m) =>
    DateTime.fromISO(m.startTime).hasSame(DateTime.now(), "day")
  ).length

  const meetingDates = useMemo(
    () =>
      new Set(
        (meetings ?? []).map((m) => DateTime.fromISO(m.startTime).toFormat("yyyy-LL-dd"))
      ),
    [meetings]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {meetings?.length ?? 0} scheduled · {todayCount} today
          </p>
        </div>
        <Button asChild>
          <Link to="/meetings/new">
            <Plus className="size-4" /> New meeting
          </Link>
        </Button>
      </div>

      {/* Three-column layout: sidebar (shell) | agenda | right rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Agenda column */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            {MEETING_TYPE_LIST.map((t) => (
              <FilterChip key={t.value} active={filter === t.value} onClick={() => setFilter(t.value)}>
                <span className={cn("size-1.5 rounded-full", t.dot)} />
                {t.label}
              </FilterChip>
            ))}
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Loading meetings…</p>}

          {!isLoading && filtered.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarDays className="size-6" />
              </div>
              <div>
                <p className="font-medium">No meetings yet</p>
                <p className="text-sm text-muted-foreground">Create your first meeting to get started.</p>
              </div>
              <Button asChild>
                <Link to="/meetings/new">
                  <Plus className="size-4" /> New meeting
                </Link>
              </Button>
            </Card>
          )}

          {grouped.map(({ key, label, items }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3">
                {items.map((m) => (
                  <Card
                    key={m.id}
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="cursor-pointer p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium">{m.title}</h3>
                          <MeetingTypeBadge type={m.type} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            {fmtTime(m.startTime)} · {formatDuration(m.durationMinutes)}
                          </span>
                          {m.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="size-3.5" />
                              {m.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <ParticipantAvatars userIds={m.participants.map((p) => p.userId)} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right rail: month calendar + meeting-type breakdown */}
        <aside className="space-y-6">
          <MiniCalendar meetingDates={meetingDates} />
          <MeetingTypeSummary meetings={meetings ?? []} />
        </aside>
      </div>
    </div>
  )
}

function MeetingTypeSummary({ meetings }: { meetings: MeetingDto[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Meeting types</h2>
      <ul className="space-y-2.5">
        {MEETING_TYPE_LIST.map((t) => {
          const count = meetings.filter((m) => m.type === t.value).length
          return (
            <li key={t.value} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2.5 rounded-full", t.dot)} />
              <span className="flex-1">{t.label}</span>
              <span className="text-muted-foreground">{count}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {MEETING_TYPES.Standard.minMinutes}–{MEETING_TYPES.Workshop.maxMinutes} min ·
        capacity {MEETING_TYPES.DecisionMaking.maxParticipants}–{MEETING_TYPES.Workshop.maxParticipants}
      </p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function groupByDay(meetings: MeetingDto[]) {
  const groups = new Map<string, MeetingDto[]>()
  for (const m of meetings) {
    const key = DateTime.fromISO(m.startTime).toFormat("yyyy-LL-dd")
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, items]) => {
      const dt = DateTime.fromISO(key)
      const now = DateTime.now()
      let label = dt.toFormat("cccc, LLLL d")
      if (dt.hasSame(now, "day")) label = `Today · ${dt.toFormat("LLLL d")}`
      else if (dt.hasSame(now.plus({ days: 1 }), "day")) label = `Tomorrow · ${dt.toFormat("LLLL d")}`
      return {
        key,
        label,
        items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }
    })
}
