import { describe, expect, it } from "bun:test";
import type { NotificationView } from "../../types/notification";
import { describeNotification } from './describeNotification';

const base = { id: '01JNNNNNNNNNNNNNNNNNNNNNN1', userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', readAt: null, createdAt: '2026-01-01T00:00:00.000Z', commentPhoto: null };
const sam = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA2', username: 'sam_k', firstName: null, lastName: null, updatedAt: '2026-01-01T00:00:00.000Z' };
const postId = '01JBBBBBBBBBBBBBBBBBBBBBB1';

describe('describeNotification', () => {
    it('words a warning, with the reason and the note, and opens nothing', () => {
        const warning: NotificationView = { ...base, actorId: null, actor: null, type: 'warning', data: { reason: 'harassment', note: 'Keep it civil.', kind: 'postComment' } };
        expect(describeNotification(warning)).toEqual({
            title: 'Warning from our team',
            message: 'Your comment went against our community guidelines (harassment or bullying). Keep it civil. Repeated problems can get your account banned.',
            target: null,
        });
    });

    it('words each report outcome', () => {
        const resolved = (outcome: 'removed' | 'dismissed' | 'reviewed'): NotificationView => ({ ...base, actorId: null, actor: null, type: 'report_resolved', data: { kind: 'post', outcome } });
        expect(describeNotification(resolved('removed')).message).toContain('We removed the post you reported');
        expect(describeNotification(resolved('dismissed')).message).toContain("doesn't go against our community guidelines");
        expect(describeNotification(resolved('reviewed')).message).toContain('took action');
    });

    it('names who did it and opens what it is about', () => {
        const from = { ...base, actorId: sam.userId, actor: sam };
        expect(describeNotification({ ...from, type: 'followed', data: {} })).toEqual({ title: '@sam_k', message: 'started following you.', target: '/profile/sam_k' });
        expect(describeNotification({ ...from, type: 'follow_requested', data: {} }).target).toBe('/settings');
        expect(describeNotification({ ...from, type: 'commented', data: { postId, postCommentId: '01JCCCCCCCCCCCCCCCCCCCCCC1', excerpt: 'Nice!' } }))
            .toEqual({ title: '@sam_k', message: 'commented on your post: “Nice!”', target: `/feed/posts/${postId}` });
        expect(describeNotification({ ...from, type: 'mentioned', data: { postId, postCommentId: null } }).message).toBe('mentioned you in a post.');
        expect(describeNotification({ ...from, type: 'commented', data: { postId, postCommentId: '01JCCCCCCCCCCCCCCCCCCCCCC1', excerpt: '' } }).message).toBe('commented on your post.');
    });
});
