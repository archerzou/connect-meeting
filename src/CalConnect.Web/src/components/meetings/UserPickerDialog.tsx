import { useMemo, useState } from "react"
import { Search, UserPlus } from "lucide-react"
import { useUserSearch } from "@/api/users"
import {
  ROLE_LABELS,
  selectableRoles,
  MEETING_TYPES,
  type MeetingType,
  type ParticipantRole,
} from "@/domain/meeting"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UserPickerDialog({
  open,
  onOpenChange,
  meetingType,
  existingUserIds,
  existingRoles,
  onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  meetingType: MeetingType
  existingUserIds: string[]
  existingRoles: ParticipantRole[]
  onAdd: (userId: string, role: ParticipantRole) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const { data: users } = useUserSearch(query)

  const roles = useMemo(
    () => selectableRoles(meetingType, existingRoles),
    [meetingType, existingRoles]
  )
  const [role, setRole] = useState<ParticipantRole>(roles[0] ?? "Required")

  const available = (users ?? []).filter((u) => !existingUserIds.includes(u.id))
  const atCapacity = existingUserIds.length >= MEETING_TYPES[meetingType].maxParticipants

  function handleAdd() {
    if (!selected) return
    onAdd(selected, role)
    setSelected(null)
    setQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add participant</DialogTitle>
          <DialogDescription>
            {MEETING_TYPES[meetingType].label} meeting · {existingUserIds.length}/
            {MEETING_TYPES[meetingType].maxParticipants} people
          </DialogDescription>
        </DialogHeader>

        {atCapacity ? (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            This meeting type is at capacity.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search people…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto">
              {available.length === 0 && (
                <p className="px-1 py-4 text-center text-sm text-muted-foreground">No people found.</p>
              )}
              {available.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    selected === u.id ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(u.firstName, u.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as ParticipantRole)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!selected} className="ml-auto">
                <UserPlus className="size-4" /> Add
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
