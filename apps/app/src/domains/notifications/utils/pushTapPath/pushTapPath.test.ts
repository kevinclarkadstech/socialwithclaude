import { describe, expect, it } from 'vitest';
import { pushTapPath } from './pushTapPath';

describe('pushTapPath', () => {
  it("takes the app route from a push's data", () => {
    expect(pushTapPath({ path: '/chats/01JCHAT' })).toBe('/chats/01JCHAT');
    expect(pushTapPath({ path: '/feed/posts/01JPOST' })).toBe('/feed/posts/01JPOST');
  });

  it('ignores anything that is not one of the app routes', () => {
    expect(pushTapPath({ path: 'https://example.com' })).toBeNull();
    expect(pushTapPath({ path: '//example.com/x' })).toBeNull();
    expect(pushTapPath({ path: 'javascript:alert(1)' })).toBeNull();
    expect(pushTapPath({})).toBeNull();
    expect(pushTapPath(null)).toBeNull();
  });
});
