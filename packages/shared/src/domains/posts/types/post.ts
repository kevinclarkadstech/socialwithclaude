import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostListingSchema } from "./post-listing";
import { PostMediaSchema } from "./post-media";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { ProfileVisibilitySchema } from "../../users/types/user-settings";

/** What kind of post it is: a plain post, or a listing (which also has listing details). */
export const PostTypeSchema = z.enum(["post", "listing"]);

/** A post as stored (one row of posts). What mutations take and save. */
export const PostSchema = BaseUserCreatedEntitySchema.extend({
    type: PostTypeSchema,
    content: z.string().max(2000),
    numSaves: z.int().min(0),
    numComments: z.int().min(0),
    numShares: z.int().min(0),
    numReactions: z.int().min(0),
});

/** How a post looks to whoever is asking; all false when signed out. */
export const PostViewerSchema = z.object({
    hasSaved: z.boolean(),
    // An approved follower of the creator (for canViewPost).
    followsCreator: z.boolean(),
});

/**
 * A post as it's shown: the post, with its listing details (if it's a
 * listing), its photos (in the order they were added), who wrote it (and who
 * can see their posts, for canViewPost), and how it looks to the viewer.
 * What queries return.
 */
export const PostViewSchema = PostSchema.extend({
    listing: PostListingSchema.optional(),
    media: z.array(PostMediaSchema),
    creator: UserProfileSummarySchema.extend({
        profileVisibility: ProfileVisibilitySchema,
    }),
    viewer: PostViewerSchema,
});

export type PostType = z.infer<typeof PostTypeSchema>;
export type Post = z.infer<typeof PostSchema>;
export type PostViewer = z.infer<typeof PostViewerSchema>;
export type PostView = z.infer<typeof PostViewSchema>;
