import { describe, expect, it } from 'vitest';
import { activeMention } from './activeMention';

describe('activeMention', () => {
  it('finds an @ at the start of the text', () => {
    expect(activeMention({ text: '@ma', caret: 3 })).toEqual({ query: 'ma', start: 0 });
  });

  it('finds an @ after a space or a new line', () => {
    expect(activeMention({ text: 'hi @mar', caret: 7 })).toEqual({ query: 'mar', start: 3 });
    expect(activeMention({ text: 'hi\n@jo', caret: 6 })).toEqual({ query: 'jo', start: 3 });
  });

  it('only looks up to the caret', () => {
    expect(activeMention({ text: 'hi @maya there', caret: 6 })).toEqual({ query: 'ma', start: 3 });
  });

  it('matches names in any script', () => {
    expect(activeMention({ text: '@José', caret: 5 })).toEqual({ query: 'José', start: 0 });
  });

  it("isn't one inside an email address, after a space, or with nothing typed yet", () => {
    expect(activeMention({ text: 'me@example', caret: 10 })).toBeNull();
    expect(activeMention({ text: '@maya ', caret: 6 })).toBeNull();
    expect(activeMention({ text: 'hi @', caret: 4 })).toBeNull();
  });
});
