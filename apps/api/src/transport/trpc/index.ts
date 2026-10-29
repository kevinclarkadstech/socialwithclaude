import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { chatsRouter } from "./routers/chats";
import { feedbackRouter } from "./routers/feedback";
import { listingsRouter } from "./routers/listings";
import { mediaRouter } from "./routers/media";
import { postsRouter } from "./routers/posts";
import { searchRouter } from "./routers/search";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    chats: chatsRouter,
    feedback: feedbackRouter,
    listings: listingsRouter,
    media: mediaRouter,
    posts: postsRouter,
    search: searchRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
