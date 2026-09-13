import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import { AppLayout } from "@/components/layout/AppLayout"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import VerifyEmail from "@/pages/VerifyEmail"
import Dashboard from "@/pages/Dashboard"
import CreateMeeting from "@/pages/CreateMeeting"
import MeetingDetail from "@/pages/MeetingDetail"
import Profile from "@/pages/Profile"
import Security from "@/pages/Security"

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/meetings/new" element={<CreateMeeting />} />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/security" element={<Security />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
