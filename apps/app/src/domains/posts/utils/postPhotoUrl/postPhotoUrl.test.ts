import { describe, expect, it } from 'vitest';
import { config } from '../../../../lib/config';
import { feedAspectRatio, postPhotoSrcSet, postPhotoUrl } from './postPhotoUrl';

const media = { id: '01JMMMMMMMMMMMMMMMMMMMMMM1', postId: '01JBBBBBBBBBBBBBBBBBBBBBB1', createdBy: '01JAAAAAAAAAAAAAAAAAAAAAA1', width: 960, height: 1280 };
const base = `${media.createdBy}/${media.postId}/${media.id}`;

describe('post photo URLs', () => {
  it('points at a size of the published photo, under its creator and post', () => {
    expect(postPhotoUrl({ media, size: 640 })).toBe(`${config.mediaUrl}/${base}-640`);
  });

  it('lists every size by its actual width (portrait photos are narrower than their size)', () => {
    expect(postPhotoSrcSet(media)).toBe(
      [`${base}-320 240w`, `${base}-640 480w`, `${base}-1280 960w`].map((entry) => `${config.mediaUrl}/${entry}`).join(', '),
    );
  });

  it('shows photos in the feed no taller than 4:5 and no wider than 1.91:1', () => {
    expect(feedAspectRatio({ width: 960, height: 1280 })).toBe(0.8);
    expect(feedAspectRatio({ width: 1280, height: 427 })).toBe(1.91);
    expect(feedAspectRatio({ width: 1280, height: 960 })).toBeCloseTo(1.333, 3);
  });
});
