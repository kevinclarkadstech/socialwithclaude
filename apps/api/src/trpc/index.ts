import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
