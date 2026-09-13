import { useDirectory } from "@/api/users"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function ParticipantAvatars({
  userIds,
  max = 4,
  size = "sm",
}: {
  userIds: string[]
  max?: number
  size?: "sm" | "md"
}) {
  const { data: dir } = useDirectory(userIds)
  const shown = userIds.slice(0, max)
  const extra = userIds.length - shown.length
  const dim = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs"

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((id) => {
        const u = dir?.[id]
        return (
          <Avatar key={id} className={cn(dim, "ring-2 ring-card")}>
            <AvatarFallback>{u ? initials(u.firstName, u.lastName) : "?"}</AvatarFallback>
          </Avatar>
        )
      })}
      {extra > 0 && (
        <div
          className={cn(
            dim,
            "flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-card"
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
