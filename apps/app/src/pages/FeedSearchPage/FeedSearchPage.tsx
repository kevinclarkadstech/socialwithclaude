import type { PostView } from '@myapp/shared/domains';
import { SearchPage } from '../../common/components/SearchPage/SearchPage';
import { PostCard, runSearchPostsQuery } from '../../domains/posts';
import { PeopleSearchSection } from '../../domains/users';
import type { SearchFn } from '../../lib/api/useSearchResults';

const searchPosts: SearchFn<PostView> = ({ query, cursor }) => runSearchPostsQuery({ query, cursor });

/** The Feed's search: matching people first, then posts and listings by what they say. */
export function FeedSearchPage() {
  return (
    <SearchPage
      placeholder="Search people and posts"
      search={searchPosts}
      getKey={(post) => post.id}
      renderItem={(post) => <PostCard postId={post.id} />}
      renderHeader={(query) => <PeopleSearchSection query={query} />}
      hint="Find people by name or username, and posts by what they say."
      emptyText={(query) => `No posts match "${query}".`}
    />
  );
}
