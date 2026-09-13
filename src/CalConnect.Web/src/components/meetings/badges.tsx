import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  MEETING_TYPES,
  RESPONSE_META,
  ROLE_LABELS,
  type MeetingType,
  type ParticipantResponse,
  type ParticipantRole,
} from "@/domain/meeting"

export function MeetingTypeBadge({ type }: { type: MeetingType }) {
  const meta = MEETING_TYPES[type]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.chip
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: ParticipantRole }) {
  return (
    <Badge variant={role === "Organizer" ? "default" : "secondary"} className="font-normal">
      {ROLE_LABELS[role]}
    </Badge>
  )
}

export function ResponseBadge({ response }: { response: ParticipantResponse }) {
  const meta = RESPONSE_META[response]
  return (
    <Badge variant={meta.badge} className="gap-1.5 font-normal">
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  )
}
