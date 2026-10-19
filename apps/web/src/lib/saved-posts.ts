/**
 * Saves made in this session, so every card and page showing a post agrees
 * (e.g. saving on a listing's page shows on its card in the grid). Server
 * data is the starting point; this only holds changes made since.
 */
type Listener = () => void;

const savedById = new Map<string, boolean>();
const listeners = new Set<Listener>();

/** The post's saved state if it changed this session, else undefined. */
export function getSavedOverride(postId: string): boolean | undefined {
    return savedById.get(postId);
}

export function setSavedOverride(postId: string, saved: boolean) {
    savedById.set(postId, saved);
    for (const listener of listeners) listener();
}

export function subscribeToSaves(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
