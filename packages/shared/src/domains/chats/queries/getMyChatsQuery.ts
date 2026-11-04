import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatSchema, type Chat } from "../types/chat";

export const GetMyChatsQueryInputSchema = PageInputSchema;

export type GetMyChatsQueryInput = z.infer<typeof GetMyChatsQueryInputSchema>;

export const GetMyChatsQueryOutputSchema = z.object({
    items: z.array(ChatSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyChatsQueryOutput = z.infer<typeof GetMyChatsQueryOutputSchema>;

/** The caller's chats, newest first. */
export const getMyChatsQuery: Query<{ input: GetMyChatsQueryInput, output: GetMyChatsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserChats: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<Chat>>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    return succeed(await dependencies.getUserChats({ ...input, userId: allowed.value.userId }));
}
