import type { Notification } from '@myapp/shared/domains';
import { describe, expect, it } from 'vitest';
import { describeNotification } from './describeNotification';

const base = { id: '01JNNNNNNNNNNNNNNNNNNNNNN1', userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', readAt: null, createdAt: '2026-01-01T00:00:00.000Z' };

describe('describeNotification', () => {
  it('words a warning, with the reason and the note', () => {
    const warning: Notification = { ...base, type: 'warning', data: { reason: 'harassment', note: 'Keep it civil.', kind: 'postComment' } };
    expect(describeNotification(warning).message).toBe(
      'Your comment went against our community guidelines (harassment or bullying). Keep it civil. Repeated problems can get your account banned.',
    );
  });

  it('words each report outcome', () => {
    const resolved = (outcome: 'removed' | 'dismissed' | 'reviewed'): Notification => ({ ...base, type: 'report_resolved', data: { kind: 'post', outcome } });
    expect(describeNotification(resolved('removed')).message).toContain('We removed the post you reported');
    expect(describeNotification(resolved('dismissed')).message).toContain("doesn't go against our community guidelines");
    expect(describeNotification(resolved('reviewed')).message).toContain('took action');
  });
});
