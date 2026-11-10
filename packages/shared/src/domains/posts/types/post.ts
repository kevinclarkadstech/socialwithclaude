import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostListingSchema } from "./post-listing";
import { PostMediaSchema } from "./post-media";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { ProfileVisibilitySchema } from "../../users/types/user-settings";

/** What kind of post it is: a plain post, or a listing (which also has listing details). */
export const PostTypeSchema = z.enum(["post", "listing"]);

export const PostSchema = BaseUserCreatedEntitySchema.extend({
    type: PostTypeSchema,
    content: z.string().max(2000),
    numSaves: z.int().min(0),
    numComments: z.int().min(0),
    numShares: z.int().min(0),
    numReactions: z.int().min(0),
    listing: PostListingSchema.optional(),
    // Its photos, in order (none for a text-only post).
    media: z.array(PostMediaSchema),
    // Who wrote it, and who may see their posts (for canViewPost).
    creator: UserProfileSummarySchema.extend({
        profileVisibility: ProfileVisibilitySchema,
    }),
    // How the post looks to whoever is asking; false when signed out.
    viewer: z.object({
        hasSaved: z.boolean(),
        // An approved follower of the creator (for canViewPost).
        followsCreator: z.boolean(),
    }),
});

export type PostType = z.infer<typeof PostTypeSchema>;
export type Post = z.infer<typeof PostSchema>;
