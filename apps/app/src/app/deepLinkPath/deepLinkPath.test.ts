import { describe, expect, it } from 'vitest';
import { deepLinkPath } from './deepLinkPath';

const publicUrl = 'https://app.example.com';

describe('deepLinkPath', () => {
  it("takes the route from a link to the app's web address", () => {
    expect(deepLinkPath({ url: 'https://app.example.com/profile/sam', publicUrl })).toBe('/profile/sam');
    expect(deepLinkPath({ url: 'https://app.example.com/feed/posts/01JPOST?x=1#top', publicUrl })).toBe('/feed/posts/01JPOST?x=1#top');
    expect(deepLinkPath({ url: 'https://app.example.com', publicUrl })).toBe('/');
  });

  it('ignores links to anywhere else', () => {
    expect(deepLinkPath({ url: 'https://example.com/profile/sam', publicUrl })).toBeNull();
    expect(deepLinkPath({ url: 'http://app.example.com/profile/sam', publicUrl })).toBeNull();
    expect(deepLinkPath({ url: 'https://app.example.com.evil.test/profile/sam', publicUrl })).toBeNull();
    expect(deepLinkPath({ url: 'not a link', publicUrl })).toBeNull();
  });
});
