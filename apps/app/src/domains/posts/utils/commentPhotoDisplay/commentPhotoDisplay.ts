import type { PostCommentPhoto } from '@myapp/shared/domains';
import type { DisplayPhoto } from '../../../../lib/photos/displayPhoto';
import { postPhotoSrcSet, postPhotoUrl } from '../postPhotoUrl/postPhotoUrl';

/** A comment photo's address: its files sit in the comment's folder, the way a post photo's sit in the post's. */
function address(photo: Pick<PostCommentPhoto, 'id' | 'postCommentId' | 'createdBy'>) {
  return { id: photo.id, postId: photo.postCommentId, createdBy: photo.createdBy };
}

/** A comment's photo as the app shows it (in the thread, and full screen in the viewer). */
export function commentPhotoDisplay(photo: PostCommentPhoto): DisplayPhoto {
  return {
    key: photo.id,
    src: postPhotoUrl({ media: address(photo), size: 640 }),
    srcSet: postPhotoSrcSet({ ...address(photo), width: photo.width, height: photo.height }),
    width: photo.width,
    height: photo.height,
    placeholder: photo.placeholder,
    caption: null,
  };
}

/** The smallest size of a comment's photo, for thumbnails (e.g. on a notification). */
export function commentPhotoThumbnailUrl(photo: Pick<PostCommentPhoto, 'id' | 'postCommentId' | 'createdBy'>): string {
  return postPhotoUrl({ media: address(photo), size: 320 });
}
