/** What someone just did that they'd want to hear back about. */
export type ReplyExpectedReason = 'message' | 'follow' | 'comment';

type Listener = (reason: ReplyExpectedReason) => void;

const listeners = new Set<Listener>();

/**
 * Moments when someone has just done something they'd want to hear back
 * about: sent a message, followed someone, commented. The notifications
 * domain listens, and offers to turn on push notifications then (when the
 * reason to is obvious), rather than when the app opens.
 */
export const replyExpected = {
  emit(reason: ReplyExpectedReason) {
    for (const listener of listeners) {
      listener(reason);
    }
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
