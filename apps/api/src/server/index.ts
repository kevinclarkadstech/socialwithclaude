
import { Hono, type Env } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id"

import { rootLogger, type AppLogger } from "./observability/logs";
import { withSpan } from "./observability";
import { createAuthInstance } from "./auth";
import { serverConfig } from "./config";
import { createAppFeatureFlagStore, type AppFeatureFlagStore } from "./shared/feature-flags";
import { db } from "./data-access";
import { followUser, getUserIdByUsername, unfollowUser } from "./data-access/resolvers";

type Auth = ReturnType<typeof createAuthInstance>;

export type AppHonoEnv = Env & {
    Variables: {
        logger: AppLogger;
        featureFlagStore: AppFeatureFlagStore;
        auth: Auth;
        user: Auth["$Infer"]["Session"]["user"] | null
        session: Auth["$Infer"]["Session"]["session"] | null
    },
    Bindings: {};
}

console.log('INITIALIZING SERVER')

const auth = createAuthInstance(db);

const app = new Hono<AppHonoEnv>()
    .use(requestId())
    .use(logger())
    .use("*", async (c, next) => {
        const featureFlagStore = createAppFeatureFlagStore({
            flagsOrLoader: {
                usersCanPost: true,
                userSignup: false,
            }
        });
        await featureFlagStore.initialize();
        c.set('featureFlagStore', featureFlagStore);
        c.set('auth', auth);
        const requestId = c.get('requestId')
        const logger = rootLogger.child({
            requestId,
        });
        rootLogger.info("Root logger");
        logger.info("child logger")
        c.set('logger', logger)
        const start = performance.now();
        await next();

        logger.info('request completed', {
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            durationMs: Math.round(performance.now() - start),
        });
    })
    .use(
        "/*",
        cors({
            origin: serverConfig.BETTER_AUTH_URL,
            allowMethods: ["GET", "POST", "OPTIONS"],
            allowHeaders: ["Content-Type", "Authorization"],
            credentials: true,
        }),
    )
    .use("*", async (c, next) => {
        const auth = c.get('auth');
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        c.set("user", session?.user ?? null);
        c.set("session", session?.session ?? null);
        return next();
    })
    .on(["POST", "GET"], "/api/auth/*", (c) => c.get('auth').handler(c.req.raw))
    .get("/api/me", (c) => {
        const user = c.get("user");
        if (!user) return c.body(null, 401);
        return c.json(user);
    })
    .post("/api/users/:username/follow", async (c) => {
        const user = c.get("user");
        if (!user) return c.body(null, 401);

        const targetUserId = await getUserIdByUsername(db, c.req.param("username"));
        if (!targetUserId) return c.body(null, 404);
        if (targetUserId === user.id) return c.json({ error: "Cannot follow yourself" }, 400);

        await followUser(db, user.id, targetUserId);
        return c.body(null, 204);
    })
    .delete("/api/users/:username/follow", async (c) => {
        const user = c.get("user");
        if (!user) return c.body(null, 401);

        const targetUserId = await getUserIdByUsername(db, c.req.param("username"));
        if (!targetUserId) return c.body(null, 404);

        await unfollowUser(db, user.id, targetUserId);
        return c.body(null, 204);
    })
    .get("/api2/ok", (c) => {
        withSpan('/api2/ok', async () => {
            c.get('logger').info(`Is user signup enabled? ${c.get('featureFlagStore').isEnabled('userSignup')}`)
            c.get('logger').info("returning OK ")
            if (serverConfig.DATABASE_URL) {
                c.get('logger').error("Error with config", { why: "serverConfig has a db url", fix: "remove db url from config" })
            }
        });
        return c.text("OK");
    })
    .all('*', (c) => {
        console.log('IN AALL')
        return c.text('Custom 404 - Not Found', 404);
    })
    .notFound((c) => c.text("Custom Hono 404: Route Not Found", 404))
    .onError((err, c) => {
        c.get('logger').error(err.message, { err });

        return c.json({ statusCode: 500, message: "Internal Server Error" }, 500);
    });

export default app;

// app.use(
//   "/trpc/*",
//   trpcServer({
//     router: appRouter,
//     createContext: (_opts, context) => {
//       return createContext({ context });
//     },
//   }),
// );