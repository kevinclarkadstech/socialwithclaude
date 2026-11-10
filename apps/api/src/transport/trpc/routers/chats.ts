import {
    ClearChatMutationInputSchema,
    DeleteChatMessageMutationInputSchema,
    GetChatMessagesQueryInputSchema,
    GetMyChatsQueryInputSchema,
    GetOrCreateDirectChatMutationInputSchema,
    MarkChatReadMutationInputSchema,
    SendChatMessageMutationInputSchema,
    UpdateChatMessageMutationInputSchema,
    clearChatMutation,
    deleteChatMessageMutation,
    getChatMessagesQuery,
    getMyChatsQuery,
    getOrCreateDirectChatMutation,
    markChatReadMutation,
    sendChatMessageMutation,
    updateChatMessageMutation,
} from "@myapp/shared/domains";

import {
    clearChat,
    createChatMessage,
    createDirectChat,
    deleteChatMessage,
    getChatMembers,
    getChatMessageViewById,
    getChatMessageViews,
    getUserChats,
    getUserProfileByUsername,
    markChatRead,
    updateChatMessage,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const chatsRouter = router({
    getOrCreateDirectChat: procedure.input(GetOrCreateDirectChatMutationInputSchema).mutation(({ ctx, input }) =>
        getOrCreateDirectChatMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserProfileByUsername, createDirectChat },
        }),
    ),

    getMyChats: procedure.input(GetMyChatsQueryInputSchema).query(({ ctx, input }) =>
        getMyChatsQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserChats },
        }),
    ),

    getMessages: procedure.input(GetChatMessagesQueryInputSchema).query(({ ctx, input }) =>
        getChatMessagesQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMembers, getChatMessageViews },
        }),
    ),

    sendMessage: procedure.input(SendChatMessageMutationInputSchema).mutation(({ ctx, input }) =>
        sendChatMessageMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMembers, getChatMessageViewById, createChatMessage },
        }),
    ),

    editMessage: procedure.input(UpdateChatMessageMutationInputSchema).mutation(({ ctx, input }) =>
        updateChatMessageMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMessageViewById, updateChatMessage },
        }),
    ),

    deleteMessage: procedure.input(DeleteChatMessageMutationInputSchema).mutation(({ ctx, input }) =>
        deleteChatMessageMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMessageViewById, deleteChatMessage },
        }),
    ),

    markRead: procedure.input(MarkChatReadMutationInputSchema).mutation(({ ctx, input }) =>
        markChatReadMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMembers, markChatRead },
        }),
    ),

    deleteChat: procedure.input(ClearChatMutationInputSchema).mutation(({ ctx, input }) =>
        clearChatMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMembers, clearChat },
        }),
    ),
});
