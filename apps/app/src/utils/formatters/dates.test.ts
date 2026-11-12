import { describe, expect, it } from 'vitest';
import { timeAgo } from './dates';

const now = new Date('2026-11-06T12:00:00.000Z');

describe('timeAgo', () => {
  it('describes how long ago, in words', () => {
    expect(timeAgo('2026-11-06T11:59:30.000Z', now)).toBe('a few seconds ago');
    expect(timeAgo('2026-11-06T11:55:00.000Z', now)).toBe('5 minutes ago');
    expect(timeAgo('2026-11-06T09:00:00.000Z', now)).toBe('3 hours ago');
    expect(timeAgo('2026-11-05T12:00:00.000Z', now)).toBe('a day ago');
  });
});
