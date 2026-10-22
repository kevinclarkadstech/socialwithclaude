import * as React from "react"
import type { SignUpInput } from "@myapp/shared/types/users"

import { api, apiErrorMessage } from "@/lib/api"

export type CompleteProfileResult = "ok" | "username-taken" | "failed"

/**
 * Onboarding: creates the signed-in user's profile. "ok" also when the
 * profile already exists (finished in another tab).
 */
export function useCompleteProfile() {
  return React.useCallback(
    async (input: SignUpInput): Promise<CompleteProfileResult> => {
      try {
        await api.auth.signUp.mutate(input)
        return "ok"
      } catch (err) {
        switch (apiErrorMessage(err)) {
          case "USERNAME_TAKEN":
            return "username-taken"
          case "PROFILE_ALREADY_EXISTS":
            return "ok"
          default:
            return "failed"
        }
      }
    },
    []
  )
}
