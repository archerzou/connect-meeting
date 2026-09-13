import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface DirectoryUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["user-search", query],
    queryFn: async () => {
      const { data } = await api.get<DirectoryUser[]>("/users", {
        params: query.trim() ? { search: query.trim() } : undefined,
      })
      return data
    },
  })
}

/** Resolve a set of user ids to their names (for avatars / participant rows). */
export function useDirectory(ids: string[]) {
  const sorted = [...new Set(ids)].sort()
  return useQuery({
    queryKey: ["directory", sorted],
    enabled: sorted.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        sorted.map(async (id) => {
          try {
            const { data } = await api.get<DirectoryUser>(`/users/${id}`)
            return [id, data] as const
          } catch {
            return [id, null] as const
          }
        })
      )
      const map: Record<string, DirectoryUser> = {}
      for (const [id, user] of entries) {
        if (user) map[id] = user
      }
      return map
    },
  })
}
