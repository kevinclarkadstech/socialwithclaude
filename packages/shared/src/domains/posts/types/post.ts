import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostListingSchema } from "./post-listing";

export const PostSchema = BaseUserCreatedEntitySchema.extend({
    content: z.string().max(2000),
    numSaves: z.int().min(0),
    numComments: z.int().min(0),
    numShares: z.int().min(0),
    numReactions: z.int().min(0),
    listing: PostListingSchema.optional(),
});

export type Post = z.infer<typeof PostSchema>;
