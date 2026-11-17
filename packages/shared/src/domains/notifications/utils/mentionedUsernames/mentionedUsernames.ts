/** "@sam_k" in text, not part of an email or a longer word; usernames are 3–30 letters, numbers and underscores. */
const mention = /(?<![a-z0-9_@.])@([a-z0-9_]{3,30})(?![a-z0-9_])/gi;

/** The usernames @-mentioned in `text`, lowercase, each once, in order of first mention. */
export function mentionedUsernames(text: string): string[] {
    return [...new Set([...text.matchAll(mention)].map((match) => match[1]!.toLowerCase()))];
}

/** The usernames mentioned in `after` that weren't in `before`: who an edit newly mentions. */
export function newlyMentionedUsernames({ before, after }: { before: string; after: string }): string[] {
    const already = new Set(mentionedUsernames(before));
    return mentionedUsernames(after).filter((username) => !already.has(username));
}

/** The usernames mentioned in `before` that aren't in `after`: who an edit no longer mentions. */
export function noLongerMentionedUsernames({ before, after }: { before: string; after: string }): string[] {
    return newlyMentionedUsernames({ before: after, after: before });
}
