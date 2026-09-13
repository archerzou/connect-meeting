import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AxiosError } from "axios"
import { Loader2 } from "lucide-react"
import { useLogin } from "@/api/auth"
import { getErrorMessage } from "@/lib/problem"
import { AuthShell } from "@/components/layout/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type FormValues = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await login.mutateAsync(values)
      navigate("/")
    } catch (e) {
      // The API returns a distinct error when the email isn't verified.
      const msg = getErrorMessage(e)
      if (e instanceof AxiosError && /verif/i.test(msg)) {
        setError("Please verify your email before signing in. Check your inbox for the link.")
      } else {
        setError(msg)
      }
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your CalConnect account"
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
