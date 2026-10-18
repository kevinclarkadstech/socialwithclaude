import { createAuthClient } from "better-auth/react";

// No baseURL: requests go to this origin's /api/auth (proxied to the API in dev).
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
