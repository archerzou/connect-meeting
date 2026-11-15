import { useState } from "react"
import { Loader2, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import {
  useAdminUsers,
  useDeleteUser,
  useSetUserRole,
  type AdminUser,
  type RoleName,
} from "@/api/people"
import { useAuthStore } from "@/store/auth"
import { getErrorMessage } from "@/lib/problem"
import { initials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES: RoleName[] = ["Admin", "Member"]

function primaryRole(user: AdminUser): RoleName {
  return user.roles.includes("Admin") ? "Admin" : "Member"
}

export default function People() {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data: users, isLoading } = useAdminUsers()
  const setRole = useSetUserRole()
  const deleteUser = useDeleteUser()
  const [toRemove, setToRemove] = useState<AdminUser | null>(null)

  async function changeRole(user: AdminUser, role: RoleName) {
    if (role === primaryRole(user)) return
    try {
      await setRole.mutateAsync({ id: user.id, role })
      toast.success(`${user.firstName} is now ${role}`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  async function confirmRemove() {
    if (!toRemove) return
    try {
      await deleteUser.mutateAsync(toRemove.id)
      toast.success(`Removed ${toRemove.firstName} ${toRemove.lastName}`)
      setToRemove(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">
          {users?.length ?? 0} {users?.length === 1 ? "person" : "people"} · manage roles and access
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(0,1fr)_120px_160px_64px] items-center gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Person</span>
          <span>Status</span>
          <span>Role</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading people…
          </div>
        )}

        {!isLoading && (users?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">No people found.</p>
          </div>
        )}

        <div className="divide-y">
          {users?.map((user) => {
            const isSelf = user.id === currentUserId
            const role = primaryRole(user)
            return (
              <div
                key={user.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_160px_64px] items-center gap-4 px-4 py-3"
              >
                {/* Person */}
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      {isSelf && (
                        <Badge variant="muted" className="shrink-0">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  {user.emailVerified ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                </div>

                {/* Role */}
                <div>
                  <Select
                    value={role}
                    onValueChange={(v) => changeRole(user, v as RoleName)}
                    disabled={isSelf || setRole.isPending}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isSelf}
                    onClick={() => setToRemove(user)}
                    aria-label={`Remove ${user.firstName} ${user.lastName}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Dialog open={!!toRemove} onOpenChange={(open) => !open && setToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove person?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {toRemove?.firstName} {toRemove?.lastName}
              </span>{" "}
              ({toRemove?.email}) and revokes their access. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={deleteUser.isPending}>
              {deleteUser.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
