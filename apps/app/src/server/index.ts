
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

console.log('INITIALIZING SERVER')

console.log(process.env.DATABASE_URL)

const app = new Hono();

app.use(logger());
app.use(
    "/*",
    cors({
        origin: "",
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    }),
);

// app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// app.use(
//   "/trpc/*",
//   trpcServer({
//     router: appRouter,
//     createContext: (_opts, context) => {
//       return createContext({ context });
//     },
//   }),
// );

app.get("/", (c) => {
    return c.text("OK");
});

app.notFound((c) => c.text("Custom Hono 404: Route Not Found", 404));

export default app;
