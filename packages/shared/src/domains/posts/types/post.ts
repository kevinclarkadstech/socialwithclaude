import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostListingSchema } from "./post-listing";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";

export const PostSchema = BaseUserCreatedEntitySchema.extend({
    content: z.string().max(2000),
    numSaves: z.int().min(0),
    numComments: z.int().min(0),
    numShares: z.int().min(0),
    numReactions: z.int().min(0),
    listing: PostListingSchema.optional(),
    creator: UserProfileSummarySchema,
    // How the post looks to whoever is asking; false when signed out.
    viewer: z.object({
        hasSaved: z.boolean(),
    }),
});

export type Post = z.infer<typeof PostSchema>;
