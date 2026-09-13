import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AxiosError } from "axios"
import { api } from "@/lib/api"
import { minutesToTimeSpan } from "@/lib/duration"
import type {
  MeetingType,
  ParticipantResponse,
  ParticipantRole,
} from "@/domain/meeting"

// DTOs returned by / sent to the backend (shapes mirror the API response records).
export interface AgendaItemDto {
  title: string
  durationMinutes: number
}

export interface ParticipantDto {
  userId: string
  role: ParticipantRole
  response: ParticipantResponse
}

export interface MeetingDto {
  id: string
  title: string
  description: string
  startTime: string
  durationMinutes: number
  location: string
  type: MeetingType
  agendaItems: AgendaItemDto[]
  participants: ParticipantDto[]
}

/** Shape produced by the Create Meeting wizard (organizer included in participants). */
export type CreateMeetingInput = Omit<MeetingDto, "id">

const KEY = ["meetings"] as const

export function useMeetings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<MeetingDto[]>("/meetings")
      return data
    },
  })
}

export function useSearchMeetings(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ["meeting-search", q],
    enabled: q.length > 0,
    queryFn: async () => {
      const { data } = await api.get<MeetingDto[]>("/meetings", { params: { search: q } })
      return data
    },
  })
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ["meeting", id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const { data } = await api.get<MeetingDto>(`/meetings/${id}`)
        return data
      } catch (e) {
        if (e instanceof AxiosError && e.response?.status === 404) return null
        throw e
      }
    },
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      // The backend adds the organizer itself, so send only the other participants.
      const organizer = input.participants.find((p) => p.role === "Organizer")
      const payload = {
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        duration: minutesToTimeSpan(input.durationMinutes),
        location: input.location,
        type: input.type,
        organizerId: organizer?.userId,
        participants: input.participants
          .filter((p) => p.role !== "Organizer")
          .map((p) => ({ userId: p.userId, role: p.role })),
        agendaItems: input.agendaItems.map((a) => ({
          title: a.title,
          duration: minutesToTimeSpan(a.durationMinutes),
        })),
      }
      const { data } = await api.post<string>("/meetings", payload)
      return { id: data }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export interface UpdateMeetingInput {
  title: string
  description: string
  location: string
  durationMinutes: number
  startTime: string
}

export function useUpdateMeeting(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateMeetingInput) => {
      await api.put(`/meetings/${id}`, {
        id,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        duration: minutesToTimeSpan(input.durationMinutes),
        location: input.location,
        agendaItems: [],
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ["meeting", id] })
    },
  })
}

export function useRescheduleMeeting(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (newStartTime: string) => {
      await api.patch(`/meetings/${id}/reschedule`, { id, newStartTime })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ["meeting", id] })
    },
  })
}

export function useCancelMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meetings/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useInviteParticipant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (participant: { userId: string; role: ParticipantRole }) => {
      await api.post(`/meetings/${id}/participants`, {
        userId: participant.userId,
        role: participant.role,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", id] }),
  })
}

export function useRemoveParticipant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/meetings/${id}/participants/${userId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", id] }),
  })
}

export function useUpdateParticipantResponse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { userId: string; response: ParticipantResponse }) => {
      await api.put(
        `/meetings/${id}/participants/${args.userId}/response`,
        null,
        { params: { response: args.response } }
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", id] }),
  })
}
