import { currentTermsVersion, type CallingUser, type ProfileVisibility } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import { eq } from "drizzle-orm";
import { db, schema } from "../../../src/data-access/db";
import { getUserProfileAndBlockList } from "../../../src/data-access";
import { appRouter } from "../../../src/transport/trpc";
import { createCallerFactory } from "../../../src/transport/trpc/trpc";
import type { TRPCContext } from "../../../src/transport/trpc/context";
import { createAppFeatureFlagStore } from "../../../src/shared/feature-flags";

const createCaller = createCallerFactory(appRouter);

const silentLogger: AppLogger = {
    info() {},
    warn() {},
    error() {},
    debug() {},
    child: () => silentLogger,
    setBindings() {},
};

const featureFlagStore = createAppFeatureFlagStore({ flagsOrLoader: { usersCanPost: true } });
await featureFlagStore.initialize();

// Usernames and emails unique across every test file in a run.
let next = 0;
const runId = Date.now().toString(36).slice(-4);

/** The API's routers, called as `userId` (null: signed out), with no HTTP, rate limits or sessions in between. */
export function callAs(userId: string | null) {
    // Read fresh on every call, as the API does per request, so blocks and sign-up show at once.
    const getAccountHolder = async (): Promise<CallingUser | null> => {
        if (!userId) {
            return null;
        }
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (!user) {
            return null;
        }
        const { profile, blockList } = await getUserProfileAndBlockList({ userId });
        return {
            userId,
            email: user.email,
            sessionId: `session-${userId}`,
            profile,
            blockList,
            role: user.role,
            deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
            termsAcceptedVersion: user.termsAcceptedVersion,
        };
    };
    // As the API's context: someone whose account is scheduled for deletion counts as signed out, except for the account procedures.
    const getCallingUser = async (): Promise<CallingUser | null> => {
        const holder = await getAccountHolder();
        return holder?.deletionScheduledAt ? null : holder;
    };
    const context = {
        auth: undefined,
        reqHeaders: new Headers(),
        resHeaders: new Headers(),
        getCallingUser,
        getAccountHolder,
        logger: silentLogger,
        errorReportContext: { userId: userId ?? undefined },
        rateLimitKey: `test:${userId}`,
        rateLimiter: { consume: async () => ({ allowed: true as const }) },
        featureFlagStore,
    } as unknown as TRPCContext;
    return createCaller(context);
}

export type TestUser = Awaited<ReturnType<typeof createTestUser>>;

/**
 * A user who has finished sign-up (an account, then auth.signUp), with
 * routers to call as them. `name` is the start of their username.
 */
export async function createTestUser({ name, firstName = null, lastName = null, visibility }: {
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    visibility?: ProfileVisibility;
}) {
    next += 1;
    const username = `${name}_${runId}${next}`.toLowerCase().slice(0, 30);
    const [user] = await db.insert(schema.users).values({ name: username, email: `${username}@example.test`, emailVerified: true }).returning();
    const call = callAs(user!.id);
    await call.auth.signUp({ username, firstName, lastName, about: null, acceptedTermsVersion: currentTermsVersion });
    if (visibility) {
        await call.users.updateMySettings({ profileVisibility: visibility });
    }
    return { userId: user!.id, username, call };
}
