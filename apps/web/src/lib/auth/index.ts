import { createAuthClient } from "better-auth/react";

import { config } from "../config";

// The API is on its own origin (in dev too, like production), so send its
// session cookie with every request.
export const authClient = createAuthClient({
    baseURL: config.apiUrl,
    fetchOptions: { credentials: "include" },
});

export const { signIn, signUp, signOut, useSession } = authClient;
