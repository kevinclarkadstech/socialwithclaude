import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { currentTermsVersion } from "@myapp/shared/domains";
import { db, schema } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome, valueOf } from "./harness/outcome/outcome";

const termsOf = async (userId: string) =>
    (await db.select({ version: schema.users.termsAcceptedVersion, at: schema.users.termsAcceptedAt }).from(schema.users).where(eq(schema.users.id, userId)))[0]!;

describe("agreeing to the terms", () => {
    it("is needed to finish sign-up, and recorded with its version", async () => {
        const [user] = await db.insert(schema.users).values({ name: "newbie", email: `newbie_${Date.now()}@example.test`, emailVerified: true }).returning();
        const call = callAs(user!.id);
        const username = `newbie_${Date.now().toString(36)}`;
        // Without agreeing (an old app, or a hand-made request), sign-up is refused.
        const withoutTerms = { username, firstName: null, lastName: null, about: null } as Parameters<typeof call.auth.signUp>[0];
        expect(await outcome(call.auth.signUp(withoutTerms))).toBe("BAD_REQUEST");
        expect(await outcome(call.auth.signUp({ ...withoutTerms, acceptedTermsVersion: "yes" }))).toBe("BAD_REQUEST");

        await valueOf(call.auth.signUp({ ...withoutTerms, acceptedTermsVersion: currentTermsVersion }));
        const recorded = await termsOf(user!.id);
        expect(recorded.version).toBe(currentTermsVersion);
        expect(recorded.at).toBeInstanceOf(Date);
        expect((await valueOf(call.users.me({})))?.termsAcceptedVersion).toBe(currentTermsVersion);
    });

    it("can be given again when the terms change", async () => {
        const sam = await createTestUser({ name: "agreeable" });
        await db.update(schema.users).set({ termsAcceptedVersion: "0.9" }).where(eq(schema.users.id, sam.userId));
        expect(await valueOf(sam.call.auth.acceptTerms({ version: currentTermsVersion }))).toEqual({ termsAcceptedVersion: currentTermsVersion });
        expect((await termsOf(sam.userId)).version).toBe(currentTermsVersion);
        expect(await outcome(callAs(null).auth.acceptTerms({ version: currentTermsVersion }))).toBe("UNAUTHORIZED");
    });
});
