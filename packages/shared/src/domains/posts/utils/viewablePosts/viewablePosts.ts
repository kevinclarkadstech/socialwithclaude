import type { CallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { canViewPost } from "../../authorization/canViewPost/canViewPost";

/** The posts in `posts` the caller can see (see canViewPost). */
export function viewablePosts<P extends Pick<PostView, "createdBy" | "creator" | "viewer">>({ caller, posts }: {
    caller: CallingUser | null;
    posts: P[];
}): P[] {
    return posts.filter((post) => canViewPost({ caller, post }).ok);
}
