import { expect } from "bun:test";
import type { PostMedia } from "../domains/posts/types/post-media";
import { mockCaller, mockPost, now, userId2 } from "./fixtures";

/** Photos and their keys, for tests of posts' photos (by the default mockCaller and mockPost). */
const { userId } = mockCaller();
const post = mockPost();

export const mediaId = "01JMMMMMMMMMMMMMMMMMMMMMM1";
export const secondMediaId = "01JMMMMMMMMMMMMMMMMMMMMMM2";

/** Where a photo's file of one size is stored. */
export const postPhotoKey = (id: string, size: number, postId = post.id) => `${userId}/${postId}/${id}-${size}`;

/** A photo as the app sends it: its own guesses for who, when, the post and the size, which the server replaces. */
export const photoFromApp = (id: string, caption: string | null = null): PostMedia => ({
    id,
    postId: "01JXXXXXXXXXXXXXXXXXXXXXX9",
    caption,
    width: 10,
    height: 10,
    placeholder: null,
    createdBy: userId2,
    updatedBy: userId2,
    createdAt: "2000-01-01T00:00:00.000Z",
    updatedAt: "2000-01-01T00:00:00.000Z",
});

/** What the server saves for a new photo. */
export const savedPhoto = (id: string, caption: string | null, width: number, height: number) =>
    expect.objectContaining({ id, postId: post.id, caption, width, height, createdBy: userId, updatedBy: userId });

/** A photo already on the post. */
export function photoOnPost(id: string): PostMedia {
    return {
        id,
        postId: post.id,
        caption: null,
        width: 1280,
        height: 960,
        placeholder: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
    };
}
