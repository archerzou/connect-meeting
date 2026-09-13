import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { LayoutDashboard, Plus, ShieldCheck, User as UserIcon, LogOut, CalendarRange } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/format"
import { HeaderSearch } from "@/components/layout/HeaderSearch"

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/meetings/new", label: "New meeting", icon: Plus, end: false },
  { to: "/profile", label: "Profile", icon: UserIcon, end: false },
  { to: "/security", label: "Security", icon: ShieldCheck, end: false },
]

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  function logout() {
    clear()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card px-4 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarRange className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CalConnect</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="truncate px-2 text-xs text-muted-foreground">
          {user?.email}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur md:px-6">
          {/* Logo on mobile (sidebar is hidden). */}
          <NavLink to="/" className="flex items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarRange className="size-4" />
            </div>
          </NavLink>

          {/* Global search */}
          <div className="flex flex-1 justify-center px-2 md:px-4">
            <HeaderSearch />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent">
                <Avatar className="size-8">
                  <AvatarFallback>{initials(user?.firstName, user?.lastName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user?.firstName} {user?.lastName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserIcon /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/security")}>
                <ShieldCheck /> Security
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
