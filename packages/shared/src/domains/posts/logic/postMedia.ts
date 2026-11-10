import type { PostMedia } from "../types/post-media";

/** The photos in `media` that aren't on the post yet (to publish from their uploads). */
export function newPostMedia({ current, media }: { current: PostMedia[]; media: PostMedia[] }): PostMedia[] {
    return media.filter((item) => !current.some((existing) => existing.id === item.id));
}

/** The photos an edit takes off a post: those it has that aren't in `media` any more. */
export function removedPostMedia({ current, media }: { current: PostMedia[]; media: PostMedia[] }): PostMedia[] {
    return current.filter((existing) => !media.some((item) => item.id === existing.id));
}

/**
 * The post's photos as they'll be saved, from what the app sent: those it
 * has already (with the caption as sent), and new ones that were published.
 * The server's values replace the app's: the post, who and when, and the
 * real dimensions of published photos. Photos that couldn't be published are
 * left out. In the order they were added (ULIDs sort by time).
 */
export function savedPostMedia({ postId, userId, media, current, published, now = new Date().toISOString() }: {
    postId: string;
    userId: string;
    media: PostMedia[];
    current: PostMedia[];
    published: { id: string; width: number; height: number }[];
    now?: string;
}): PostMedia[] {
    const saved: PostMedia[] = [];
    for (const item of media) {
        const caption = item.caption?.trim() || null;
        const existing = current.find((photo) => photo.id === item.id);
        if (existing) {
            saved.push(caption === existing.caption ? existing : { ...existing, caption, updatedBy: userId, updatedAt: now });
            continue;
        }
        const done = published.find((photo) => photo.id === item.id);
        if (done) {
            saved.push({
                ...item,
                postId,
                caption,
                width: done.width,
                height: done.height,
                createdBy: userId,
                updatedBy: userId,
                createdAt: now,
                updatedAt: now,
            });
        }
    }
    return saved.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
