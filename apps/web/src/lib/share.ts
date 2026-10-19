/** Where a post can be shared from. There's no post page URL yet. */
export function postUrl(postId: string) {
    return `${window.location.origin}/posts/${postId}`;
}

/**
 * Opens the system share sheet when there is one ("shared"), otherwise copies
 * the link ("copied"). Cancelling the share sheet counts as "shared".
 */
export async function sharePost(postId: string, title?: string): Promise<"shared" | "copied"> {
    const url = postUrl(postId);
    if (navigator.share) {
        await navigator.share({ url, title }).catch(() => {});
        return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
}
