import { describe, expect, it } from 'vitest';
import { describeReportedItem } from './describeReportedItem';

describe('describeReportedItem', () => {
  it('names each kind', () => {
    expect(describeReportedItem({ kind: 'postComment' }).noun).toBe('comment');
    expect(describeReportedItem({ kind: 'chatMessage' }).noun).toBe('message');
  });
});
