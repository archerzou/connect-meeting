import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type RoleName = "Admin" | "Member"

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  emailVerified: boolean
  roles: string[]
}

const adminUsersKey = ["admin-users"] as const

export function useAdminUsers() {
  return useQuery({
    queryKey: adminUsersKey,
    queryFn: async () => {
      const { data } = await api.get<AdminUser[]>("/admin/users")
      return data
    },
  })
}

export function useSetUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: RoleName }) => {
      await api.put(`/admin/users/${id}/role`, { role })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUsersKey }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUsersKey }),
  })
}
