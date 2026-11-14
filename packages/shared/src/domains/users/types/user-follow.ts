import z from "zod";
import { UserProfileSummarySchema } from "./user-profile-summary";

export const UserFollowStatusSchema = z.enum(["pending", "accepted", "denied"]);

/**
 * `followerId` follows (or asked to follow) `followingId`. Pending until
 * accepted or denied when the profile is followers-only.
 */
export const UserFollowSchema = z.object({
    followerId: z.ulid(),
    followingId: z.ulid(),
    status: UserFollowStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type UserFollowStatus = z.infer<typeof UserFollowStatusSchema>;
export type UserFollow = z.infer<typeof UserFollowSchema>;

/** A follow (e.g. a pending request) with who's following, to show them. */
export const UserFollowViewSchema = UserFollowSchema.extend({
    follower: UserProfileSummarySchema,
});

export type UserFollowView = z.infer<typeof UserFollowViewSchema>;

/**
 * How a follow looks to the follower. A denied request still shows as
 * "requested": denial is silent.
 */
export const ViewerFollowStatusSchema = z.enum(["none", "requested", "following"]);

export type ViewerFollowStatus = z.infer<typeof ViewerFollowStatusSchema>;

/** How a follow with `status` (null for none) looks to the follower: none, requested (pending or denied) or following. */
export function toViewerFollowStatus(status: UserFollowStatus | null): ViewerFollowStatus {
    if (status === null) {
        return "none";
    }
    return status === "accepted" ? "following" : "requested";
}
