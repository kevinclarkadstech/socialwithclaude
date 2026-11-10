import type { PostView } from '@myapp/shared/domains';
import { createEntityStore } from '../../lib/stores/createEntityStore';

/** Every post the app has loaded, once by id, and the lists showing them (the feed, later profiles and search). */
export const postStore = createEntityStore<PostView>();
