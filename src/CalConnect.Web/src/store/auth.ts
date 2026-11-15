import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  emailVerified: boolean
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "calconnect-auth" }
  )
)

/** Decode the `sub` (user id) and claims out of a JWT without a library. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// The API issues role claims with `ClaimTypes.Role`, which serializes to this URI.
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

/** Read the role names out of an access token (handles single value or array). */
export function rolesFromToken(token: string | null): string[] {
  if (!token) return []
  const claims = decodeJwt(token)
  if (!claims) return []
  const raw = claims[ROLE_CLAIM] ?? claims["role"] ?? claims["roles"]
  if (Array.isArray(raw)) return raw.filter((r): r is string => typeof r === "string")
  if (typeof raw === "string") return [raw]
  return []
}

/** Whether the signed-in user currently holds the Admin role. */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => rolesFromToken(s.accessToken).includes("Admin"))
}
