import { serverConfig } from "../../../../infra/config";

/**
 * Revokes someone's Sign in with Apple tokens, as Apple requires when an
 * account is deleted (https://appleid.apple.com/auth/revoke). Does nothing
 * when Apple sign-in isn't configured. Throws if Apple refuses one.
 */
export async function revokeAppleTokens({ tokens }: { tokens: { refreshToken: string | null; accessToken: string | null }[] }): Promise<void> {
    const { APPLE_CLIENT_ID, APPLE_CLIENT_SECRET } = serverConfig;
    if (!APPLE_CLIENT_ID || !APPLE_CLIENT_SECRET) {
        return;
    }
    for (const { refreshToken, accessToken } of tokens) {
        const token = refreshToken ?? accessToken;
        if (!token) {
            continue;
        }
        const response = await fetch("https://appleid.apple.com/auth/revoke", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: APPLE_CLIENT_ID,
                client_secret: APPLE_CLIENT_SECRET,
                token,
                token_type_hint: refreshToken ? "refresh_token" : "access_token",
            }),
        });
        if (!response.ok) {
            throw new Error(`Apple refused to revoke a token (${response.status})`);
        }
    }
}
