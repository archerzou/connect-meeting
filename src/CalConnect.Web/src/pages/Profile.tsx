import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth"
import { useUpdateProfile } from "@/api/auth"
import { getErrorMessage } from "@/lib/problem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/format"

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
})
type FormValues = z.infer<typeof schema>

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const update = useUpdateProfile()
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync(values)
      setSaved(true)
      toast.success("Profile updated")
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <Avatar className="size-12">
              <AvatarFallback className="text-base">
                {initials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{user?.firstName} {user?.lastName}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-normal">
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-3.5" /> Email verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning-foreground">
                    <AlertCircle className="size-3.5" /> Email not verified
                  </span>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={update.isPending || !isDirty}>
                {update.isPending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
              {saved && !isDirty && <span className="text-sm text-success">Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
