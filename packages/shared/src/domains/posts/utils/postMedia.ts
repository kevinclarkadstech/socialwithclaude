import type { PostMedia } from "../types/post-media";

/** A photo as creating or editing a post takes it: the model's own fields the app sets (its order is its place in the list). */
export type PostMediaFields = Pick<PostMedia, "id" | "caption" | "width" | "height" | "placeholder">;

/** A photo as a post's row stores it (who and when are added when saving). */
export type PostMediaRow = Pick<PostMedia, "id" | "position" | "caption" | "width" | "height" | "placeholder">;

/** Whether a post has something in it: text, or at least one photo. */
export function hasPostContent({ content, media }: { content: string; media: unknown[] }): boolean {
    return content.trim().length > 0 || media.length > 0;
}

/** Whether every photo appears once. */
export function hasUniqueMedia(media: Pick<PostMedia, "id">[]): boolean {
    return new Set(media.map((item) => item.id)).size === media.length;
}

/** The photos in `media` that aren't on the post yet (to publish from their uploads). */
export function newPostMedia<T extends Pick<PostMedia, "id">>({ current, media }: { current: Pick<PostMedia, "id">[]; media: T[] }): T[] {
    return media.filter((item) => !current.some((existing) => existing.id === item.id));
}

/** The photos an edit takes off a post: those it has that aren't in `media` any more. */
export function removedPostMedia<T extends Pick<PostMedia, "id">>({ current, media }: { current: T[]; media: Pick<PostMedia, "id">[] }): T[] {
    return current.filter((existing) => !media.some((item) => item.id === existing.id));
}

/**
 * The post's photos as they'll be saved: those in `media` that are on the
 * post already or were just published (with their real dimensions), in the
 * order given, numbered from 0. Photos that couldn't be published are left
 * out. Blank captions are none.
 */
export function postMediaRows({ media, current, published }: {
    media: PostMediaFields[];
    current: Pick<PostMedia, "id" | "width" | "height">[];
    published: Pick<PostMedia, "id" | "width" | "height">[];
}): PostMediaRow[] {
    const rows: PostMediaRow[] = [];
    for (const item of media) {
        const saved = current.find((existing) => existing.id === item.id) ?? published.find((done) => done.id === item.id);
        if (saved) {
            rows.push({
                id: item.id,
                position: rows.length,
                caption: item.caption?.trim() || null,
                width: saved.width,
                height: saved.height,
                placeholder: item.placeholder,
            });
        }
    }
    return rows;
}
