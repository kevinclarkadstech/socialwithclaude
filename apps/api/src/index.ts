
import { Hono, type Context, type Env } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import {
    contextStorage,
} from 'hono/context-storage';
import type { AppLogger } from "@myapp/shared/observability";
import { rootLogger } from "./observability/logs";
import { withSpan } from "./observability";
import { createAuthInstance } from "./auth";
import { serverConfig } from "./config";
import { createAppFeatureFlagStore, type AppFeatureFlagStore } from "./shared/feature-flags";
import { trpcServer } from "@hono/trpc-server";
import { db } from "./data-access";
import { appRouter, createContext } from "./trpc";

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
    .use(contextStorage())
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
    .use(
        "/api/trpc/*",
        trpcServer({
            endpoint: "/api/trpc",
            router: appRouter,
            createContext: (opts, c) => createContext(opts, c as Context<AppHonoEnv>),
            onError: ({ error, path, ctx }) => {
                if (error.code !== "INTERNAL_SERVER_ERROR") return;
                (ctx?.logger ?? rootLogger).error(error.message, { err: error, path });
            },
        }),
    )
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

export type { AppRouter } from "./trpc";