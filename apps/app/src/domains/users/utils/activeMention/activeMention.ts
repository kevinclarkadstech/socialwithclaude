/** The "@…" being typed: what's after the "@" and where the "@" is. */
export interface ActiveMention {
  query: string;
  start: number;
}

// Letters (any script, for names), digits and underscores: what a username or name prefix can hold.
const MENTION_BEFORE_CARET = /(?:^|\s)@([\p{L}\p{N}_]{1,30})$/u;

/**
 * The mention being typed at `caret`, if there is one: an "@" at the start
 * of the text or after a space, followed by at least one letter, digit or
 * underscore up to the caret. "me@example.com" isn't one.
 */
export function activeMention({ text, caret }: { text: string; caret: number }): ActiveMention | null {
  const match = MENTION_BEFORE_CARET.exec(text.slice(0, caret));
  if (!match) {
    return null;
  }
  const query = match[1];
  return { query, start: caret - query.length - 1 };
}
