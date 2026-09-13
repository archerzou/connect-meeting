import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DateTime } from "luxon"
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth"
import { useCreateMeeting, type AgendaItemDto, type ParticipantDto } from "@/api/meetings"
import {
  MEETING_TYPES,
  MEETING_TYPE_LIST,
  ROLE_LABELS,
  type MeetingType,
} from "@/domain/meeting"
import { formatDuration } from "@/lib/duration"
import { fromInputDateTime } from "@/lib/format"
import { getErrorMessage } from "@/lib/problem"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MeetingTypeBadge } from "@/components/meetings/badges"
import { UserPickerDialog } from "@/components/meetings/UserPickerDialog"
import { useUserSearch } from "@/api/users"

const STEPS = ["Basics", "Agenda", "People", "Review"]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
function durationOptions(type: MeetingType): number[] {
  const { minMinutes, maxMinutes } = MEETING_TYPES[type]
  const out: number[] = []
  for (let m = minMinutes; m <= maxMinutes; m += 15) out.push(m)
  return out
}

export default function CreateMeeting() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const createMeeting = useCreateMeeting()
  const { data: directory } = useUserSearch("")

  const [step, setStep] = useState(0)

  // Basics
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<MeetingType>("Standard")
  const [startTime, setStartTime] = useState(
    DateTime.now().plus({ days: 1 }).set({ hour: 10, minute: 0 }).toFormat("yyyy-LL-dd'T'HH:mm")
  )
  const [duration, setDuration] = useState<number>(MEETING_TYPES.Standard.minMinutes)
  const [location, setLocation] = useState("")

  // Agenda
  const [agenda, setAgenda] = useState<AgendaItemDto[]>([])
  const [agendaTitle, setAgendaTitle] = useState("")
  const [agendaMins, setAgendaMins] = useState(15)

  // People (organizer is always first)
  const [participants, setParticipants] = useState<ParticipantDto[]>([
    { userId: user.id, role: "Organizer", response: "Accepted" },
  ])
  const [pickerOpen, setPickerOpen] = useState(false)

  const meta = MEETING_TYPES[type]
  const agendaTotal = agenda.reduce((s, a) => s + a.durationMinutes, 0)
  const agendaRemaining = duration - agendaTotal

  function changeType(next: MeetingType) {
    setType(next)
    setDuration((d) => clamp(d, MEETING_TYPES[next].minMinutes, MEETING_TYPES[next].maxMinutes))
    // Drop participants whose role is no longer allowed for the new type (keep organizer).
    setParticipants((ps) =>
      ps.filter((p) => p.role === "Organizer" || MEETING_TYPES[next].allowedRoles.includes(p.role))
    )
  }

  function addAgenda() {
    if (!agendaTitle.trim()) return
    if (agendaMins > agendaRemaining) {
      toast.error("That item exceeds the remaining meeting time.")
      return
    }
    setAgenda((a) => [...a, { title: agendaTitle.trim(), durationMinutes: agendaMins }])
    setAgendaTitle("")
    setAgendaMins(15)
  }

  function nameOf(id: string) {
    const u = directory?.find((x) => x.id === id)
    if (id === user.id) return `${user.firstName} ${user.lastName} (you)`
    return u ? `${u.firstName} ${u.lastName}` : "Unknown"
  }

  const step1Valid = title.trim().length > 0 && !!startTime && duration >= meta.minMinutes

  async function submit() {
    try {
      const meeting = await createMeeting.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        startTime: fromInputDateTime(startTime),
        durationMinutes: duration,
        location: location.trim(),
        type,
        agendaItems: agenda,
        participants,
      })
      toast.success("Meeting created")
      navigate(`/meetings/${meeting.id}`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New meeting</h1>
        <p className="text-sm text-muted-foreground">Set the details, agenda, and who should attend.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < step && "bg-primary text-primary-foreground",
                i === step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                i > step && "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", i === step ? "font-medium" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          {/* STEP 1 — BASICS */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly team sync" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this meeting about?" />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MEETING_TYPE_LIST.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => changeType(t.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        type === t.value ? "border-primary bg-accent/50" : "hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span className={cn("size-2 rounded-full", t.dot)} />
                        {t.label}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDuration(t.minMinutes)}–{formatDuration(t.maxMinutes)} · up to {t.maxParticipants}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start">Start</Label>
                  <Input id="start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions(type).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {formatDuration(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} meetings run {formatDuration(meta.minMinutes)}–{formatDuration(meta.maxMinutes)}.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 2 / video link" />
              </div>
            </>
          )}

          {/* STEP 2 — AGENDA */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Agenda time budget</span>
                  <span className={cn(agendaRemaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {formatDuration(agendaTotal)} / {formatDuration(duration)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (agendaTotal / duration) * 100)}
                  indicatorClassName={agendaRemaining < 0 ? "bg-destructive" : undefined}
                />
              </div>

              <div className="space-y-2">
                {agenda.length === 0 && (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    No agenda items yet. Add a few to structure the meeting.
                  </p>
                )}
                {agenda.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                    <span className="text-sm text-muted-foreground">{formatDuration(item.durationMinutes)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setAgenda((a) => a.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="ai-title">Agenda item</Label>
                  <Input id="ai-title" value={agendaTitle} onChange={(e) => setAgendaTitle(e.target.value)} placeholder="e.g. Proposal review" />
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Minutes</Label>
                  <Input type="number" min={5} step={5} value={agendaMins} onChange={(e) => setAgendaMins(Number(e.target.value))} />
                </div>
                <Button onClick={addAgenda} disabled={!agendaTitle.trim() || agendaMins > agendaRemaining}>
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 — PEOPLE */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {participants.length}/{meta.maxParticipants} people
                </p>
                <Button size="sm" onClick={() => setPickerOpen(true)}>
                  <Plus className="size-4" /> Add participant
                </Button>
              </div>

              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <div className="flex-1 text-sm font-medium">{nameOf(p.userId)}</div>
                    <span className="text-sm text-muted-foreground">{ROLE_LABELS[p.role]}</span>
                    {p.role === "Organizer" ? (
                      <span className="text-xs text-muted-foreground">Auto-accepted</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setParticipants((ps) => ps.filter((x) => x.userId !== p.userId))}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {meta.description} Organizer &amp; Facilitator are unique per meeting.
              </p>

              <UserPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                meetingType={type}
                existingUserIds={participants.map((p) => p.userId)}
                existingRoles={participants.map((p) => p.role)}
                onAdd={(userId, role) =>
                  setParticipants((ps) => [...ps, { userId, role, response: "Pending" }])
                }
              />
            </>
          )}

          {/* STEP 4 — REVIEW */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{title || "Untitled meeting"}</h3>
                <MeetingTypeBadge type={type} />
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="When" value={DateTime.fromFormat(startTime, "yyyy-LL-dd'T'HH:mm").toFormat("ccc, LLL d · h:mm a")} />
                <Info label="Duration" value={formatDuration(duration)} />
                <Info label="Location" value={location || "—"} />
                <Info label="Participants" value={`${participants.length}`} />
              </dl>
              <div>
                <p className="mb-2 text-sm font-medium">Agenda ({formatDuration(agendaTotal)})</p>
                {agenda.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agenda items.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {agenda.map((a, i) => (
                      <li key={i} className="flex justify-between border-b py-1 last:border-0">
                        <span>{a.title}</span>
                        <span className="text-muted-foreground">{formatDuration(a.durationMinutes)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wizard controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? navigate("/") : setStep((s) => s - 1))}
        >
          <ChevronLeft className="size-4" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !step1Valid}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={createMeeting.isPending}>
            {createMeeting.isPending && <Loader2 className="size-4 animate-spin" />}
            Create meeting
          </Button>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
