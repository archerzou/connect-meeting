import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/store/auth"

// All requests go through the Vite proxy (/api -> http://localhost:5000).
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
})

// Attach the access token.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401 (once per request), then retry the original call.
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState()
  if (!refreshToken) return null
  try {
    const res = await axios.post("/api/users/refresh-token", { refreshToken })
    const { accessToken, refreshToken: newRefresh } = res.data as {
      accessToken: string
      refreshToken: string
    }
    setTokens(accessToken, newRefresh)
    return accessToken
  } catch {
    clear()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isAuthCall = original?.url?.includes("/users/login") || original?.url?.includes("/users/refresh-token")

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }
    return Promise.reject(error)
  }
)
