
import { Hono, type Context, type Env } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { contextStorage } from "hono/context-storage";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import type { AppLogger } from "@myapp/shared/observability";
import { rootLogger } from "./observability/logs";
import { createAuthInstance } from "./auth";
import { nativeAppOrigins, serverConfig } from "./config";
import { createAppFeatureFlagStore, type AppFeatureFlagStore } from "./shared/feature-flags";
import { trpcServer } from "@hono/trpc-server";
import { db, isDatabaseReachable } from "./data-access/db";
import { cache } from "./cache";
import { createCacheRateLimiter, limitAuthRequestsMiddleware, type RateLimiter } from "./rate-limiting";
import { appRouter, createContext } from "./transport/trpc";
import { trpcOnErrorFunction } from "./error-handling";
import { assertCanNotify } from "./notifications";

type Auth = ReturnType<typeof createAuthInstance>;

export type AppHonoEnv = Env & {
    Variables: {
        logger: AppLogger;
        featureFlagStore: AppFeatureFlagStore;
        auth: Auth;
        user: Auth["$Infer"]["Session"]["user"] | null
        session: Auth["$Infer"]["Session"]["session"] | null
        /** The caller's IP address, from CLIENT_IP_HEADER ("unknown" without one). */
        clientIp: string;
        rateLimiter: RateLimiter;
    },
    Bindings: object;
}

// Fail at startup, not on the first sign-in, when notifications can't be sent (e.g. no email provider in production).
assertCanNotify();

const auth = createAuthInstance(db);

// Flags are fixed for now, so they're loaded once; a loader (e.g. from a flag service) would plug in here.
const featureFlagStore = createAppFeatureFlagStore({ flagsOrLoader: { usersCanPost: true } });
const featureFlagsLoaded = featureFlagStore.initialize();

// Where rate limits are counted. On Cloudflare Workers this would be built per request from the
// rate-limit bindings in c.env instead (see rate-limiting/types/index.ts); nothing else changes.
const rateLimiter = createCacheRateLimiter({ cache });

const app = new Hono<AppHonoEnv>()
    .use(contextStorage())
    .use(requestId())
    .use("*", async (c, next) => {
        await featureFlagsLoaded;
        c.set("featureFlagStore", featureFlagStore);
        c.set("auth", auth);
        c.set("clientIp", clientIp(c.req.header(serverConfig.CLIENT_IP_HEADER)));
        c.set("rateLimiter", rateLimiter);
        const logger = rootLogger.child({ requestId: c.get("requestId") });
        c.set("logger", logger);
        const start = performance.now();
        await next();
        logger.info("Request completed", {
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            durationMs: Math.round(performance.now() - start),
        });
    })
    // The API only serves JSON: nothing in it should run, load or be framed.
    .use(secureHeaders({
        contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
        xFrameOptions: "DENY",
    }))
    .use(
        "/*",
        cors({
            origin: [serverConfig.WEB_APP_URL, ...nativeAppOrigins],
            allowMethods: ["GET", "POST", "OPTIONS"],
            allowHeaders: ["Content-Type", "Authorization"],
            // The native app reads its session token from this header after signing in.
            exposeHeaders: ["set-auth-token"],
            credentials: true,
        }),
    )
    // Requests are small JSON: photos go straight to storage, not through the API.
    .use("/api/*", bodyLimit({
        maxSize: 100 * 1024,
        onError: (c) => c.json({ message: "Request is too large" }, 413),
    }))
    // Liveness: the process is up.
    .get("/api/health", (c) => c.json({ ok: true }))
    // Readiness: it can serve requests. The database is required; without the cache, rate limiting is off.
    .get("/api/ready", async (c) => {
        const [database, cacheReachable] = await Promise.all([isDatabaseReachable(), cache.isReachable()]);
        return c.json({ ok: database, database, cache: cacheReachable }, database ? 200 : 503);
    })
    .use("/api/auth/*", limitAuthRequestsMiddleware)
    .on(["POST", "GET"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw))
    // Only tRPC needs the caller; better-auth reads its own session.
    .use("/api/trpc/*", async (c, next) => {
        const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
        c.set("user", session?.user ?? null);
        c.set("session", session?.session ?? null);
        await next();
    })
    .use(
        "/api/trpc/*",
        trpcServer({
            endpoint: "/api/trpc",
            router: appRouter,
            createContext: (opts, c) => createContext(opts, c as Context<AppHonoEnv>),
            onError: trpcOnErrorFunction,
        }),
    )
    .notFound((c) => c.json({ message: "Not found" }, 404))
    .onError((err, c) => {
        c.get("logger").error(err.message, { err });
        return c.json({ message: "Something went wrong" }, 500);
    });

/** The first address in the header (a proxy chain lists the original caller first). */
function clientIp(header: string | undefined): string {
    return header?.split(",")[0]?.trim() || "unknown";
}

export default app;

export type { AppRouter } from "./transport/trpc";