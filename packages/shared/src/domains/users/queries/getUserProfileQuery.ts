import z from "zod";
import type { Query } from "../../../types/query";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import type { GetCallingUser } from "../types/calling-user";
import { ViewerFollowStatusSchema, type UserFollow, type ViewerFollowStatus } from "../types/user-follow";
import { UserProfileSchema, type UserProfile } from "../types/user-profile";

export const GetUserProfileQueryInputSchema = UserProfileSchema.pick({ username: true });

export type GetUserProfileQueryInput = z.infer<typeof GetUserProfileQueryInputSchema>;

export const GetUserProfileQueryOutputSchema = UserProfileSchema.extend({
    // How the profile looks to whoever is asking; "none" when signed out or for your own profile.
    viewer: z.object({
        followStatus: ViewerFollowStatusSchema,
    }),
});

export type GetUserProfileQueryOutput = z.infer<typeof GetUserProfileQueryOutputSchema>;

function toViewerFollowStatus(follow: UserFollow | null): ViewerFollowStatus {
    if (!follow) {
        return "none";
    }
    return follow.status === "accepted" ? "following" : "requested";
}

export const getUserProfileQuery: Query<{ input: GetUserProfileQueryInput, output: GetUserProfileQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    getUserFollow: (args: { followerId: string; followingId: string }) => Promise<UserFollow | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const profile = await dependencies.getUserProfileByUsername(input);
    if (!profile) {
        logger.info("User not found", { username: input.username });
        return fail(notFoundError("User not found"));
    }

    const caller = await dependencies.getCallingUser();
    const follow = caller && caller.userId !== profile.userId
        ? await dependencies.getUserFollow({ followerId: caller.userId, followingId: profile.userId })
        : null;

    return succeed({ ...profile, viewer: { followStatus: toViewerFollowStatus(follow) } });
}
