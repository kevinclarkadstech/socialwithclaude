import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { chatsRouter } from "./routers/chats";
import { feedbackRouter } from "./routers/feedback";
import { moderationRouter } from "./routers/moderation";
import { postCommentsRouter } from "./routers/post-comments";
import { postListingsRouter } from "./routers/post-listings";
import { postsRouter } from "./routers/posts";
import { usersRouter } from "./routers/users";

export const appRouter = router({
    auth: authRouter,
    chats: chatsRouter,
    feedback: feedbackRouter,
    moderation: moderationRouter,
    posts: postsRouter,
    postComments: postCommentsRouter,
    postListings: postListingsRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from "./context";
