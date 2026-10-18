import * as React from "react"
import { cn } from "cn"

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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth"

/** better-auth error → what to show the user. */
function signInErrorMessage(error: { status: number; code?: string }) {
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Incorrect email or password."
  }
  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return "Something went wrong. Please try again."
}

/**
 * Email and password login, based on the shadcn login-03 block. Password
 * login is temporary until launch; social login buttons go above the email
 * field (the block's "Or continue with" separator).
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setError(null)
    setPending(true)
    try {
      const { error } = await signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      })
      // On success the session updates and the app leaves the login page.
      if (error) setError(signInErrorMessage(error))
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  aria-invalid={error ? true : undefined}
                  required
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                  required
                />
              </Field>
              <Field>
                {error && <FieldError>{error}</FieldError>}
                <Button type="submit" disabled={pending}>
                  {pending ? "Logging in…" : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
