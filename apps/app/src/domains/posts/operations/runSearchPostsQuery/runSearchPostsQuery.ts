import { searchPostsQuery, type PostType } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { postStore } from '../../postStore';

/**
 * A page of posts (only `type` if given) matching `query`. They go into the
 * post store too, so PostCard can show them by id.
 */
export async function runSearchPostsQuery({ query, type, cursor }: { query: string; type?: PostType; cursor: string | null }) {
  const result = await searchPostsQuery({
    input: { query, type, cursor, limit: 20 },
    context: { logger },
    dependencies: {
      getCallingUser,
      // The API works out what the viewer sees, so viewerId isn't sent.
      searchPostViews: ({ query, type, cursor, limit }) => fromApi(api.posts.search.query({ query, type, cursor, limit })),
    },
  });
  if (result.ok) {
    postStore.setItems(result.value.items);
  }
  return result;
}
