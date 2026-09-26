
import { Hono, type Env } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id"

import { rootLogger, type AppLogger } from "./observability/logs";
import { withSpan } from "./observability";
import { auth } from "./auth";

export type AppHonoEnv = Env & {
    Variables: {
        logger: AppLogger

    },
    Bindings: {};
}

console.log('INITIALIZING SERVER')

const app = new Hono<AppHonoEnv>()
    .use(requestId())
    .use(logger())
    .use("*", async (c, next) => {
        const requestId = c.get('requestId')
        const logger = rootLogger.child({
            requestId,
        });
        rootLogger.info("Root logger");
        logger.info("child logger")
        c.set('logger', logger)
        const start = performance.now();
        await next();

        logger.info(
            {
                method: c.req.method,
                path: c.req.path,
                status: c.res.status,
                durationMs: Math.round(performance.now() - start),
            },
            'request completed'
        );
    })
    .use(
        "/*",
        cors({
            origin: "",
            allowMethods: ["GET", "POST", "OPTIONS"],
            allowHeaders: ["Content-Type", "Authorization"],
            credentials: true,
        }),
    )
    .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
    .get("/api2/ok", (c) => {
        withSpan('/api2/ok', async () => {
            c.get('logger').info({}, "returning OK ")

        });
        return c.text("OK");
    })
    .notFound((c) => c.text("Custom Hono 404: Route Not Found", 404));

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