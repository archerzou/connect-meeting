import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAuthStore, decodeJwt, type AuthUser } from "@/store/auth"

interface TokenResponse {
  accessToken: string
  refreshToken: string
}

interface UserResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  emailVerified: boolean
}

async function fetchUser(id: string): Promise<AuthUser> {
  const { data } = await api.get<UserResponse>(`/users/${id}`)
  return data
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: {
      email: string
      firstName: string
      lastName: string
      password: string
    }) => {
      const { data } = await api.post("/users/register", payload)
      return data
    },
  })
}

export function useLogin() {
  const { setTokens, setUser } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post<TokenResponse>("/users/login", payload)
      setTokens(data.accessToken, data.refreshToken)
      const claims = decodeJwt(data.accessToken)
      const userId = (claims?.sub as string) ?? ""
      if (userId) {
        const user = await fetchUser(userId)
        setUser(user)
      }
      return data
    },
  })
}

export function useVerifyEmail(token: string | null) {
  return useQuery({
    queryKey: ["verify-email", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      await api.get(`/users/verify-email`, { params: { token } })
      return true
    },
  })
}

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: () => fetchUser(userId!),
  })
}

export function useUpdateProfile() {
  const { setUser, user } = useAuthStore()
  return useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string; email: string }) => {
      const id = user!.id
      await api.put(`/users/${id}`, { id, ...payload })
      const updated = { ...user!, ...payload }
      setUser(updated)
      return updated
    },
  })
}

export function useRevokeSessions() {
  const { user, clear } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${user!.id}/refresh-tokens`)
    },
    onSuccess: () => clear(),
  })
}
