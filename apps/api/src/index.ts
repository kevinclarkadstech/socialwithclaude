
import { Hono, type Context, type Env } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { contextStorage } from "hono/context-storage";
import type { AppLogger } from "@myapp/shared/observability";
import { rootLogger } from "./observability/logs";
import { createAuthInstance } from "./auth";
import { nativeAppOrigins, serverConfig } from "./config";
import { createAppFeatureFlagStore, type AppFeatureFlagStore } from "./shared/feature-flags";
import { trpcServer } from "@hono/trpc-server";
import { db } from "./data-access/db";
import { appRouter, createContext } from "./transport/trpc";
import { trpcOnErrorFunction } from "./error-handling";

type Auth = ReturnType<typeof createAuthInstance>;

export type AppHonoEnv = Env & {
    Variables: {
        logger: AppLogger;
        featureFlagStore: AppFeatureFlagStore;
        auth: Auth;
        user: Auth["$Infer"]["Session"]["user"] | null
        session: Auth["$Infer"]["Session"]["session"] | null
    },
    Bindings: object;
}

const auth = createAuthInstance(db);

// Flags are fixed for now, so they're loaded once; a loader (e.g. from a flag service) would plug in here.
const featureFlagStore = createAppFeatureFlagStore({ flagsOrLoader: { usersCanPost: true } });
const featureFlagsLoaded = featureFlagStore.initialize();

const app = new Hono<AppHonoEnv>()
    .use(contextStorage())
    .use(requestId())
    .use("*", async (c, next) => {
        await featureFlagsLoaded;
        c.set("featureFlagStore", featureFlagStore);
        c.set("auth", auth);
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
    .get("/api/health", (c) => c.json({ ok: true }))
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

export default app;

export type { AppRouter } from "./transport/trpc";