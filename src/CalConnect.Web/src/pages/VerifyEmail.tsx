import { Link, useSearchParams } from "react-router-dom"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useVerifyEmail } from "@/api/auth"
import { AuthShell } from "@/components/layout/AuthShell"
import { Button } from "@/components/ui/button"

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get("token")
  const { isLoading, isSuccess, isError } = useVerifyEmail(token)

  return (
    <AuthShell title="Email verification">
      <div className="flex flex-col items-center gap-4 text-center">
        {!token && (
          <>
            <XCircle className="size-12 text-destructive" />
            <p className="text-sm text-muted-foreground">No verification token found in the link.</p>
            <Button asChild className="w-full">
              <Link to="/register">Back to sign up</Link>
            </Button>
          </>
        )}

        {token && isLoading && (
          <>
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}

        {token && isSuccess && (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your email is verified. You can now sign in.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </>
        )}

        {token && isError && (
          <>
            <XCircle className="size-12 text-destructive" />
            <p className="text-sm text-muted-foreground">
              This link is invalid or has expired. Verification links are valid for 24 hours.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/register">Create a new account</Link>
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  )
}
