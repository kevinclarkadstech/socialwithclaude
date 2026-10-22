import * as React from "react"

import { authClient } from "@/lib/auth"

/** A failed sign-in or sign-up: the HTTP status and better-auth's code. */
export type AuthError = { status: number; code?: string }

/**
 * The signed-in session: `pending` while it's being checked, then `user`
 * (null when signed out). Updates when you sign in or out.
 */
export function useSession() {
  const { data, isPending } = authClient.useSession()
  return {
    pending: isPending,
    user: data ? { id: data.user.id, email: data.user.email } : null,
  }
}

/**
 * Sign in, sign up and sign out (email and password for now). Sign-in and
 * sign-up resolve to null on success (the session then updates) or the
 * error; they reject only if the server can't be reached.
 */
export function useAuth() {
  return React.useMemo(
    () => ({
      async signIn(email: string, password: string): Promise<AuthError | null> {
        const { error } = await authClient.signIn.email({ email, password })
        return error ?? null
      },
      async signUp(email: string, password: string): Promise<AuthError | null> {
        // better-auth requires a name; the real one is set in onboarding.
        const name = email.split("@")[0]
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        })
        return error ?? null
      },
      async signOut() {
        await authClient.signOut()
      },
    }),
    []
  )
}
