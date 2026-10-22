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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth, type AuthError } from "@/hooks/use-auth"

type Mode = "login" | "signup"

/** better-auth's default minimum password length. */
const MIN_PASSWORD_LENGTH = 8

type FieldName = "email" | "password" | "confirmPassword"
/** What to show, and which fields it's about (all of them when omitted). */
type FormError = { message: string; fields?: FieldName[] }

/** better-auth sign-in error → what to show the user. */
function signInErrorMessage(error: AuthError) {
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Incorrect email or password."
  }
  return commonErrorMessage(error)
}

/** better-auth sign-up error → what to show the user. */
function signUpError(error: AuthError): FormError {
  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        message: "An account with this email already exists. Log in instead.",
        fields: ["email"],
      }
    case "INVALID_EMAIL":
      return { message: "Enter a valid email address.", fields: ["email"] }
    case "PASSWORD_TOO_SHORT":
      return {
        message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
        fields: ["password"],
      }
    case "PASSWORD_TOO_LONG":
      return { message: "That password is too long.", fields: ["password"] }
  }
  return { message: commonErrorMessage(error), fields: [] }
}

function commonErrorMessage(error: AuthError) {
  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return "Something went wrong. Please try again."
}

const COPY = {
  login: {
    title: "Welcome back",
    description: "Login with your email and password",
    submit: "Login",
    pending: "Logging in…",
    switchPrompt: "Don't have an account?",
    switchAction: "Sign up",
  },
  signup: {
    title: "Create an account",
    description: "Sign up with your email and a password",
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchAction: "Login",
  },
} as const

/**
 * Email and password login and sign-up, based on the shadcn login-03 block.
 * The card switches between the two. A new account is signed in straight
 * away and goes to onboarding (no profile yet). Password auth is temporary
 * until launch; social login buttons go above the email field (the block's
 * "Or continue with" separator).
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const auth = useAuth()
  const [mode, setMode] = React.useState<Mode>("login")
  const [error, setError] = React.useState<FormError | null>(null)
  const [pending, setPending] = React.useState(false)
  const copy = COPY[mode]
  const invalid = (field: FieldName) =>
    error && (!error.fields || error.fields.includes(field)) ? true : undefined

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login")
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email"))
    const password = String(form.get("password"))

    if (mode === "signup" && password !== form.get("confirmPassword")) {
      setError({
        message: "Passwords don't match.",
        fields: ["confirmPassword"],
      })
      return
    }

    setError(null)
    setPending(true)
    try {
      // On success the session updates and the app leaves this page.
      if (mode === "login") {
        const error = await auth.signIn(email, password)
        if (error) setError({ message: signInErrorMessage(error) })
      } else {
        const error = await auth.signUp(email, password)
        if (error) setError(signUpError(error))
      }
    } catch {
      setError({
        message:
          "Couldn't reach the server. Check your connection and try again.",
        fields: [],
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={invalid("email")}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  aria-invalid={invalid("email")}
                  required
                />
              </Field>
              <Field data-invalid={invalid("password")}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  // A fresh input per mode, so the browser offers the right
                  // autofill (saved vs new password).
                  key={mode}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={
                    mode === "signup" ? MIN_PASSWORD_LENGTH : undefined
                  }
                  aria-invalid={invalid("password")}
                  required
                />
                {mode === "signup" && (
                  <FieldDescription>
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </FieldDescription>
                )}
              </Field>
              {mode === "signup" && (
                <Field data-invalid={invalid("confirmPassword")}>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={invalid("confirmPassword")}
                    required
                  />
                </Field>
              )}
              <Field>
                {error && <FieldError>{error.message}</FieldError>}
                <Button type="submit" disabled={pending}>
                  {pending ? copy.pending : copy.submit}
                </Button>
                <FieldDescription className="text-center">
                  {copy.switchPrompt}{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    {copy.switchAction}
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
