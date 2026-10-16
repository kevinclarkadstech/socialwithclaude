import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { listingsRouter } from "./routers/listings";
import { mediaRouter } from "./routers/media";
import { postsRouter } from "./routers/posts";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    listings: listingsRouter,
    media: mediaRouter,
    posts: postsRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
