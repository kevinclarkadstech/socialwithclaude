import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { currentTermsVersion } from "@myapp/shared/domains";
import { db, schema } from "../src/data-access/db";
import { callAs, createTestUser } from "./harness/createTestUser/createTestUser";
import { outcome } from "./harness/outcome/outcome";

/** Someone signed in for the first time, before finishing sign-up. */
async function newAccount(name: string) {
    const [user] = await db.insert(schema.users).values({ name, email: `${name}_${Date.now()}@example.test`, emailVerified: true }).returning();
    return { userId: user!.id, call: callAs(user!.id), username: `${name}_${Date.now().toString(36)}`.slice(0, 30) };
}

const thisYear = new Date().getUTCFullYear();
const userRow = async (userId: string) => (await db.select().from(schema.users).where(eq(schema.users.id, userId)))[0];

describe("the age check at sign-up", () => {
    it("refuses someone under 13, and deletes their account with everything they entered", async () => {
        const kid = await newAccount("kiddo");
        const signingUp = kid.call.auth.signUp({
            username: kid.username, firstName: "Kid", lastName: null, about: null,
            acceptedTermsVersion: currentTermsVersion, birthYear: thisYear - 11, birthMonth: 1,
        });
        expect(await outcome(signingUp)).toBe("BAD_REQUEST");
        expect(await userRow(kid.userId)).toBeUndefined();
        expect(await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.username, kid.username))).toEqual([]);
    });

    it("saves the birth month and year of someone 13 or older", async () => {
        const teen = await newAccount("teen");
        const signingUp = teen.call.auth.signUp({
            username: teen.username, firstName: null, lastName: null, about: null,
            acceptedTermsVersion: currentTermsVersion, birthYear: thisYear - 14, birthMonth: 1,
        });
        expect(await outcome(signingUp)).toBe("OK");
        expect(await userRow(teen.userId)).toMatchObject({ birthYear: thisYear - 14, birthMonth: 1 });
    });

    it("lets someone delete their account only while sign-up isn't finished", async () => {
        const unfinished = await newAccount("unfinished");
        expect(await outcome(unfinished.call.auth.deleteUnfinishedAccount({}))).toBe("OK");
        expect(await userRow(unfinished.userId)).toBeUndefined();

        const member = await createTestUser({ name: "member" });
        expect(await outcome(member.call.auth.deleteUnfinishedAccount({}))).toBe("CONFLICT");
        expect(await userRow(member.userId)).toBeDefined();
    });
});
