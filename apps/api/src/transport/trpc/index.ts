import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { chatsRouter } from "./routers/chats";
import { feedbackRouter } from "./routers/feedback";
import { postListingsRouter } from "./routers/post-listings";
import { mediaRouter } from "./routers/media";
import { postsRouter } from "./routers/posts";
import { searchRouter } from "./routers/search";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    chats: chatsRouter,
    feedback: feedbackRouter,
    media: mediaRouter,
    posts: postsRouter,
    postListings: postListingsRouter,
    search: searchRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
