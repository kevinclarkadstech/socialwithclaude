import { initTRPC } from "@trpc/server";

import type { TRPCContext } from "../context";

/** The tRPC instance: procedures, routers and middleware are all built from it. */
export const t = initTRPC.context<TRPCContext>().create({
    /**
     * Unexpected errors (a thrown exception, a failed query) can carry SQL,
     * query params or other users' data in their message and stack. The
     * client gets a generic message instead; onError logs the original.
     */
    errorFormatter: ({ shape, error }) => {
        if (error.code !== "INTERNAL_SERVER_ERROR") {
            return shape;
        }
        return {
            ...shape,
            message: "Something went wrong",
            data: { ...shape.data, stack: undefined },
        };
    },
});
