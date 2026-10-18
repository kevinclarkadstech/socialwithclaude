import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials, type PersonSummary } from "@/lib/people"

/** Profile photo, or initials when there isn't one. */
export function UserAvatar({
  person,
  size,
  className,
}: {
  person: PersonSummary
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
      <AvatarFallback>{initials(person)}</AvatarFallback>
    </Avatar>
  )
}
