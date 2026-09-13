import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { DateTime } from "luxon"
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth"
import {
  useCancelMeeting,
  useInviteParticipant,
  useMeeting,
  useRemoveParticipant,
  useRescheduleMeeting,
  useUpdateMeeting,
  useUpdateParticipantResponse,
} from "@/api/meetings"
import { useDirectory } from "@/api/users"
import {
  MEETING_TYPES,
  type ParticipantResponse,
} from "@/domain/meeting"
import { formatDuration } from "@/lib/duration"
import { fmtDateTimeRange, fromInputDateTime, initials, toInputDateTime } from "@/lib/format"
import { getErrorMessage } from "@/lib/problem"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MeetingTypeBadge, ResponseBadge, RoleBadge } from "@/components/meetings/badges"
import { UserPickerDialog } from "@/components/meetings/UserPickerDialog"

const RSVP_OPTIONS: { value: ParticipantResponse; label: string }[] = [
  { value: "Accepted", label: "Accept" },
  { value: "Tentative", label: "Tentative" },
  { value: "Declined", label: "Decline" },
]

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data: meeting, isLoading } = useMeeting(id)
  const directory = useDirectory(meeting?.participants.map((p) => p.userId) ?? [])

  const reschedule = useRescheduleMeeting(id!)
  const cancel = useCancelMeeting()
  const update = useUpdateMeeting(id!)
  const invite = useInviteParticipant(id!)
  const remove = useRemoveParticipant(id!)
  const rsvp = useUpdateParticipantResponse(id!)

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading meeting…</p>
  }
  if (!meeting) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Meeting not found.</p>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="size-4" /> Back to calendar</Link>
        </Button>
      </div>
    )
  }

  const meta = MEETING_TYPES[meeting.type]
  const nameOf = (uid: string) => {
    const u = directory.data?.[uid]
    return u ? `${u.firstName} ${u.lastName}` : "Unknown user"
  }
  const myParticipation = meeting.participants.find((p) => p.userId === currentUserId)

  // Agenda timeline with cumulative start times
  let cursor = DateTime.fromISO(meeting.startTime)
  const timeline = meeting.agendaItems.map((a) => {
    const at = cursor
    cursor = cursor.plus({ minutes: a.durationMinutes })
    return { ...a, at: at.toFormat("h:mm a") }
  })

  async function doReschedule(newStart: string) {
    try {
      await reschedule.mutateAsync(fromInputDateTime(newStart))
      toast.success("Meeting rescheduled")
      setRescheduleOpen(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }
  async function doCancel() {
    try {
      await cancel.mutateAsync(meeting!.id)
      toast.success("Meeting cancelled")
      navigate("/")
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }
  async function setMyResponse(response: ParticipantResponse) {
    try {
      await rsvp.mutateAsync({ userId: currentUserId!, response })
      toast.success("Response updated")
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/"><ArrowLeft className="size-4" /> Calendar</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
            <MeetingTypeBadge type={meeting.type} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" />
              {fmtDateTimeRange(meeting.startTime, meeting.durationMinutes)}
            </span>
            {meeting.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {meeting.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
            <CalendarClock className="size-4" /> Reschedule
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setCancelOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Cancel meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {meeting.description && (
        <p className="max-w-2xl text-sm text-muted-foreground">{meeting.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Agenda */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Agenda
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatDuration(meeting.agendaItems.reduce((s, a) => s + a.durationMinutes, 0))}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agenda items.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-16 shrink-0 pt-0.5 text-right text-xs font-medium text-muted-foreground">
                      {item.at}
                    </div>
                    <div className="relative flex-1 border-l pl-4">
                      <span className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(item.durationMinutes)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Participants
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {meeting.participants.length}/{meta.maxParticipants}
              </span>
            </CardTitle>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" /> Invite
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {meeting.participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-lg px-1 py-2">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {directory.data?.[p.userId]
                      ? initials(directory.data[p.userId].firstName, directory.data[p.userId].lastName)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {nameOf(p.userId)}
                    {p.userId === currentUserId && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                </div>
                <RoleBadge role={p.role} />
                <ResponseBadge response={p.response} />
                {p.role !== "Organizer" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() => remove.mutate(p.userId)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Your response */}
      {myParticipation && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <span className="font-medium">Your response</span>
              <span className="ml-2 text-muted-foreground">
                You're attending as {myParticipation.role.toLowerCase()}.
              </span>
            </div>
            <div className="flex gap-2">
              {RSVP_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={myParticipation.response === opt.value ? "default" : "outline"}
                  onClick={() => setMyResponse(opt.value)}
                  disabled={rsvp.isPending}
                  className={cn(
                    myParticipation.response === opt.value &&
                      opt.value === "Declined" &&
                      "bg-destructive hover:bg-destructive/90"
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        defaultValue={toInputDateTime(meeting.startTime)}
        pending={reschedule.isPending}
        onConfirm={doReschedule}
      />
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        meeting={meeting}
        pending={update.isPending}
        onSave={async (patch) => {
          try {
            await update.mutateAsync({ ...patch, startTime: meeting.startTime })
            toast.success("Meeting updated")
            setEditOpen(false)
          } catch (e) {
            toast.error(getErrorMessage(e))
          }
        }}
      />
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this meeting?</DialogTitle>
            <DialogDescription>
              "{meeting.title}" will be permanently removed. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep meeting</Button>
            <Button variant="destructive" onClick={doCancel} disabled={cancel.isPending}>
              {cancel.isPending && <Loader2 className="size-4 animate-spin" />}
              Cancel meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UserPickerDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        meetingType={meeting.type}
        existingUserIds={meeting.participants.map((p) => p.userId)}
        existingRoles={meeting.participants.map((p) => p.role)}
        onAdd={(userId, role) =>
          invite.mutate(
            { userId, role },
            {
              onSuccess: () => toast.success("Participant added"),
              onError: (e) => toast.error(getErrorMessage(e)),
            }
          )
        }
      />
    </div>
  )
}

function RescheduleDialog({
  open,
  onOpenChange,
  defaultValue,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultValue: string
  pending: boolean
  onConfirm: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule meeting</DialogTitle>
          <DialogDescription>Pick a new start time. Duration stays the same.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="new-start">New start</Label>
          <Input
            id="new-start"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(value)} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({
  open,
  onOpenChange,
  meeting,
  pending,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  meeting: { title: string; description: string; location: string; type: import("@/domain/meeting").MeetingType; durationMinutes: number }
  pending: boolean
  onSave: (patch: { title: string; description: string; location: string; durationMinutes: number }) => void
}) {
  const meta = MEETING_TYPES[meeting.type]
  const [title, setTitle] = useState(meeting.title)
  const [description, setDescription] = useState(meeting.description)
  const [location, setLocation] = useState(meeting.location)
  const [duration, setDuration] = useState(meeting.durationMinutes)

  const options: number[] = []
  for (let m = meta.minMinutes; m <= meta.maxMinutes; m += 15) options.push(m)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-desc">Description</Label>
            <Textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-loc">Location</Label>
              <Input id="e-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-dur">Duration (min)</Label>
              <select
                id="e-dur"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {options.map((m) => (
                  <option key={m} value={m}>{formatDuration(m)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onSave({ title, description, location, durationMinutes: duration })}
            disabled={pending || !title.trim()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
