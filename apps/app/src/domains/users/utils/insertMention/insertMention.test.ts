import { describe, expect, it } from 'vitest';
import { insertMention } from './insertMention';

describe('insertMention', () => {
  it('replaces what was typed with @username and a space', () => {
    expect(insertMention({ text: 'hi @ma', caret: 6, mention: { query: 'ma', start: 3 }, username: 'maya' }))
      .toEqual({ text: 'hi @maya ', caret: 9 });
  });

  it('keeps the text after the caret, without doubling a space', () => {
    expect(insertMention({ text: 'hi @ma there', caret: 6, mention: { query: 'ma', start: 3 }, username: 'maya' }))
      .toEqual({ text: 'hi @maya there', caret: 9 });
    expect(insertMention({ text: '@mathere', caret: 3, mention: { query: 'ma', start: 0 }, username: 'maya' }))
      .toEqual({ text: '@maya there', caret: 6 });
  });
});
