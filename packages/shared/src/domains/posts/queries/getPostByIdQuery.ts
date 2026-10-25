import { Query } from "../../../types/query";
import { succeed, fail } from "../../../types/result";
import { Post } from "../types/post";

export const getPostByIdQuery: Query<{ input: { id: string }, output: Post | null }, { fetchPostById: (postId: string) => Promise<Post | null> }> = async ({ input, dependencies }) => {
    try {
        const post = await dependencies.fetchPostById(input.id);
        return succeed(post)
    } catch (error) {
        return fail({ type: 'unexpected' })
    }
}