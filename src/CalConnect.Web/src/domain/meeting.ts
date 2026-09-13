// Domain model mirrored from the CalConnect backend (Meetings/*).
// Using union types + const maps instead of TS enums (erasableSyntaxOnly).

export type MeetingType = "Standard" | "Workshop" | "DecisionMaking"
export type ParticipantRole =
  | "Organizer"
  | "Required"
  | "Optional"
  | "Facilitator"
  | "DecisionMaker"
export type ParticipantResponse = "Pending" | "Accepted" | "Declined" | "Tentative"

// Numeric values matching the backend enum ordinals — used when talking to the real API.
export const MeetingTypeValue: Record<MeetingType, number> = {
  Standard: 0,
  Workshop: 1,
  DecisionMaking: 2,
}
export const ParticipantRoleValue: Record<ParticipantRole, number> = {
  Organizer: 0,
  Required: 1,
  Optional: 2,
  Facilitator: 3,
  DecisionMaker: 4,
}
export const ParticipantResponseValue: Record<ParticipantResponse, number> = {
  Pending: 0,
  Accepted: 1,
  Declined: 2,
  Tentative: 3,
}

export interface MeetingTypeMeta {
  value: MeetingType
  label: string
  description: string
  minMinutes: number
  maxMinutes: number
  maxParticipants: number
  /** Roles that may be added to this meeting type (mirrors Meeting.CanAddParticipantWithRole). */
  allowedRoles: ParticipantRole[]
  /** Tailwind classes for chips/badges. */
  dot: string
  chip: string
}

// Policies from MeetingPolicyService + Meeting.CanAddParticipantWithRole.
export const MEETING_TYPES: Record<MeetingType, MeetingTypeMeta> = {
  Standard: {
    value: "Standard",
    label: "Standard",
    description: "General-purpose meeting. All roles allowed.",
    minMinutes: 15,
    maxMinutes: 120,
    maxParticipants: 20,
    allowedRoles: ["Organizer", "Required", "Optional", "Facilitator", "DecisionMaker"],
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Workshop: {
    value: "Workshop",
    label: "Workshop",
    description: "Collaborative session. Decision-makers are not allowed.",
    minMinutes: 60,
    maxMinutes: 240,
    maxParticipants: 30,
    allowedRoles: ["Organizer", "Required", "Optional", "Facilitator"],
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DecisionMaking: {
    value: "DecisionMaking",
    label: "Decision-making",
    description: "Only decision-makers (plus organizer / facilitator).",
    minMinutes: 30,
    maxMinutes: 90,
    maxParticipants: 10,
    // Backend only allows DecisionMaker in this type; Organizer/Facilitator are still
    // needed to run the meeting, so we surface those unique roles too.
    allowedRoles: ["Organizer", "Facilitator", "DecisionMaker"],
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
  },
}

export const MEETING_TYPE_LIST = Object.values(MEETING_TYPES)

// Organizer and Facilitator are unique per meeting.
export const UNIQUE_ROLES: ParticipantRole[] = ["Organizer", "Facilitator"]

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  Organizer: "Organizer",
  Required: "Required",
  Optional: "Optional",
  Facilitator: "Facilitator",
  DecisionMaker: "Decision-maker",
}

export const RESPONSE_META: Record<
  ParticipantResponse,
  { label: string; badge: "success" | "destructive" | "warning" | "muted"; dot: string }
> = {
  Accepted: { label: "Accepted", badge: "success", dot: "bg-success" },
  Declined: { label: "Declined", badge: "destructive", dot: "bg-destructive" },
  Tentative: { label: "Tentative", badge: "warning", dot: "bg-warning" },
  Pending: { label: "Pending", badge: "muted", dot: "bg-muted-foreground/50" },
}

/** Roles selectable given the type + who's already added (unique-role + capacity aware). */
export function selectableRoles(
  type: MeetingType,
  existingRoles: ParticipantRole[]
): ParticipantRole[] {
  const meta = MEETING_TYPES[type]
  return meta.allowedRoles.filter(
    (role) => !(UNIQUE_ROLES.includes(role) && existingRoles.includes(role))
  )
}
