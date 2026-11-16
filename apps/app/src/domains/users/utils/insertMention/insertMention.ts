import type { ActiveMention } from '../activeMention/activeMention';

/**
 * `text` with the mention being typed (from its "@" to `caret`) replaced by
 * "@username ", and where the caret goes: just after that space.
 */
export function insertMention({ text, caret, mention, username }: {
  text: string;
  caret: number;
  mention: ActiveMention;
  username: string;
}): { text: string; caret: number } {
  const inserted = `@${username} `;
  // Don't double the space if one already follows.
  const after = text.slice(caret).replace(/^ /, '');
  return { text: text.slice(0, mention.start) + inserted + after, caret: mention.start + inserted.length };
}
