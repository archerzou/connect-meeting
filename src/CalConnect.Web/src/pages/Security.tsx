import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useRevokeSessions } from "@/api/auth"
import { getErrorMessage } from "@/lib/problem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Security() {
  const navigate = useNavigate()
  const revoke = useRevokeSessions()
  const [open, setOpen] = useState(false)

  async function doRevoke() {
    try {
      await revoke.mutateAsync()
      toast.success("Signed out of all devices")
      navigate("/login")
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">Manage your active sessions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-primary" /> Active sessions
          </CardTitle>
          <CardDescription>
            Signing out everywhere revokes all refresh tokens. You'll need to sign in again on every
            device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <LogOut className="size-4" /> Sign out of all devices
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out everywhere?</DialogTitle>
            <DialogDescription>
              This revokes every refresh token for your account and signs you out here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doRevoke} disabled={revoke.isPending}>
              {revoke.isPending && <Loader2 className="size-4 animate-spin" />}
              Sign out everywhere
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
