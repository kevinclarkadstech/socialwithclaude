import * as React from "react"
import { cn } from "cn"
import { signUpInput, USERNAME_PATTERN } from "@myapp/shared/types/users"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { useCompleteProfile } from "@/hooks/use-complete-profile"

type FieldErrors = Partial<
  Record<"username" | "firstName" | "lastName" | "bio", string>
>

/** Empty optional fields are left out rather than saved as "". */
function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim()
  return text === "" ? undefined : text
}

/**
 * Profile details for a signed-in user who hasn't onboarded yet. Calls
 * `onComplete` once the profile exists.
 */
export function OnboardingForm({
  email,
  onComplete,
  className,
  ...props
}: React.ComponentProps<"div"> & { email: string; onComplete: () => void }) {
  const completeProfile = useCompleteProfile()
  const { signOut } = useAuth()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const parsed = signUpInput.safeParse({
      username: String(form.get("username") ?? "").trim(),
      firstName: optional(form.get("firstName")),
      lastName: optional(form.get("lastName")),
      bio: optional(form.get("bio")),
    })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        errors[key] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setPending(true)
    const result = await completeProfile(parsed.data)
    setPending(false)
    if (result === "ok") onComplete()
    else if (result === "username-taken") {
      setFieldErrors({ username: "That username is taken." })
    } else setFormError("Something went wrong. Please try again.")
  }

  const invalid = (name: keyof FieldErrors) =>
    fieldErrors[name] ? true : undefined

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your profile</CardTitle>
          <CardDescription>
            Choose a username and tell people a bit about yourself
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={invalid("username")}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={30}
                  pattern={USERNAME_PATTERN}
                  aria-invalid={invalid("username")}
                  required
                />
                {fieldErrors.username ? (
                  <FieldError>{fieldErrors.username}</FieldError>
                ) : (
                  <FieldDescription>
                    Letters, numbers and underscores.
                  </FieldDescription>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={invalid("firstName")}>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    maxLength={50}
                    aria-invalid={invalid("firstName")}
                  />
                  <FieldError>{fieldErrors.firstName}</FieldError>
                </Field>
                <Field data-invalid={invalid("lastName")}>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    maxLength={50}
                    aria-invalid={invalid("lastName")}
                  />
                  <FieldError>{fieldErrors.lastName}</FieldError>
                </Field>
              </div>
              <Field data-invalid={invalid("bio")}>
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <Textarea
                  id="bio"
                  name="bio"
                  maxLength={500}
                  aria-invalid={invalid("bio")}
                />
                <FieldError>{fieldErrors.bio}</FieldError>
              </Field>
              <Field>
                {formError && <FieldError>{formError}</FieldError>}
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Continue"}
                </Button>
                <FieldDescription className="text-center">
                  Signed in as {email}.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-primary"
                    onClick={() => signOut()}
                  >
                    Sign out
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
