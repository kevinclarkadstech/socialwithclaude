import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { PostListingSchema } from "./post-listing";

export const PostSchema = z.object({
    content: z.string().max(2000),
    popularity: z.number().min(0), // basically numUpvotes - numDownvotes + numFavorites
    numFavorites: z.number().min(0),
    numUpVotes: z.number().min(0),
    numDownVotes: z.number().min(0),
    numComments: z.number().min(0),
    numShares: z.number().min(0),
    numReactions: z.number().min(0),
    listing: PostListingSchema.optional(),
}).and(BaseUserCreatedEntitySchema);

export type Post = z.infer<typeof PostSchema>;