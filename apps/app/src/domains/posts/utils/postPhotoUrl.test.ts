import { describe, expect, it } from 'vitest';
import { config } from '../../../lib/config';
import { feedAspectRatio, postPhotoSrcSet, postPhotoUrl } from './postPhotoUrl';

const media = { path: 'post-media/01JMMMMMMMMMMMMMMMMMMMMMM1/token', width: 960, height: 1280 };

describe('post photo URLs', () => {
  it('points at a size of the published photo', () => {
    expect(postPhotoUrl({ media, size: 640 })).toBe(`${config.mediaUrl}/${media.path}-640`);
  });

  it('lists every size by its actual width (portrait photos are narrower than their size)', () => {
    expect(postPhotoSrcSet(media)).toBe(
      [`${media.path}-320 240w`, `${media.path}-640 480w`, `${media.path}-1280 960w`].map((entry) => `${config.mediaUrl}/${entry}`).join(', '),
    );
  });

  it('shows photos in the feed no taller than 4:5 and no wider than 1.91:1', () => {
    expect(feedAspectRatio({ width: 960, height: 1280 })).toBe(0.8);
    expect(feedAspectRatio({ width: 1280, height: 427 })).toBe(1.91);
    expect(feedAspectRatio({ width: 1280, height: 960 })).toBeCloseTo(1.333, 3);
  });
});
