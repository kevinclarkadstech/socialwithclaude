import {
    SearchChatsQueryInputSchema,
    searchChatsQuery,
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
    getChatQuery,
    GetChatQueryInputSchema,
    getOrCreateDirectChatMutation,
    markChatReadMutation,
    sendChatMessageMutation,
    updateChatMessageMutation,
    SaveChatMessageMutationInputSchema,
    UnsaveChatMessageMutationInputSchema,
    saveChatMessageMutation,
    unsaveChatMessageMutation,
} from "@myapp/shared/domains";

import {
    clearChat,
    createChatMessage,
    createDirectChat,
    deleteChatMessage,
    getChatMembers,
    getChatMessageViewById,
    getChatMessageViews,
    getUserChatViews,
    getChatViewById,
    getUserProfileByUsername,
    markChatRead,
    updateChatMessage,
    createUserSave,
    deleteUserSave,
    searchChatMessages,
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
            dependencies: { getCallingUser: ctx.getCallingUser, getUserChatViews },
        }),
    ),

    getChat: procedure.input(GetChatQueryInputSchema).query(({ ctx, input }) =>
        getChatQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getChatMembers, getChatViewById },
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

    saveMessage: procedure.input(SaveChatMessageMutationInputSchema).mutation(({ ctx, input }) =>
        saveChatMessageMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getChatMessageViewById,
                getChatMembers,
                saveChatMessage: ({ userId, chatMessageId }) => createUserSave({ userId, type: "chatMessage", id: chatMessageId }),
            },
        }),
    ),

    unsaveMessage: procedure.input(UnsaveChatMessageMutationInputSchema).mutation(({ ctx, input }) =>
        unsaveChatMessageMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                unsaveChatMessage: ({ userId, chatMessageId }) => deleteUserSave({ userId, type: "chatMessage", id: chatMessageId }),
            },
        }),
    ),

    /** Messages in the caller's chats that contain the query. */
    search: procedure.input(SearchChatsQueryInputSchema).query(({ ctx, input }) =>
        searchChatsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, searchChatMessages } }),
    ),
});
