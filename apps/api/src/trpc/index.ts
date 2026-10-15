import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { postsRouter } from "./routers/posts";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    posts: postsRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
