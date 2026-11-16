import type { PostView } from '@myapp/shared/domains';
import { SearchPage } from '../../common/components/SearchPage/SearchPage';
import { PostCard, runSearchPostsQuery } from '../../domains/posts';
import type { SearchFn } from '../../lib/api/useSearchResults';

const searchListings: SearchFn<PostView> = ({ query, cursor }) => runSearchPostsQuery({ query, type: 'listing', cursor });

/** The Marketplace's search: listings only, by title, description or post text. */
export function MarketplaceSearchPage() {
  return (
    <SearchPage
      placeholder="Search listings"
      search={searchListings}
      getKey={(post) => post.id}
      renderItem={(post) => <PostCard postId={post.id} />}
      hint="Find listings by their title or description."
      emptyText={(query) => `No listings match "${query}".`}
    />
  );
}
