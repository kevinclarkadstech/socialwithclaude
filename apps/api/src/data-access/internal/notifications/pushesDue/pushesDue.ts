type PushesDueListener = (args: { inSeconds: number }) => Promise<void>;

let listener: PushesDueListener | null = null;

/**
 * Sets what's told when pushes become due: on Workers, a delayed message on
 * the push queue, so delivery runs then (nothing runs between requests to
 * look). A long-running server sets none: its loop looks every few seconds.
 * The listener must not throw.
 */
export function setPushesDueListener(newListener: PushesDueListener | null): void {
    listener = newListener;
}

/**
 * Says pushes will be due in `inSeconds`: called by the resolvers that save
 * notifications and chat messages, after their transaction. Private to the
 * resolvers, like notificationDeliverAt.
 */
export async function pushesDue({ inSeconds }: { inSeconds: number }): Promise<void> {
    await listener?.({ inSeconds });
}

