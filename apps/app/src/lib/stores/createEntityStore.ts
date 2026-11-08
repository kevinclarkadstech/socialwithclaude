/** One list of entities (a feed, a post's comments...): ids only, in order. */
export interface EntityList {
  ids: string[];
  nextCursor: string | null;
  /** False until the first page has loaded. */
  hasLoaded: boolean;
  isLoading: boolean;
  /** Why the first page failed to load, if it did. */
  error: unknown;
}

const emptyList: EntityList = { ids: [], nextCursor: null, hasLoaded: false, isLoading: false, error: null };

/**
 * A normalized store: every entity loaded, stored once by id, and the lists
 * that show them. A change to an entity (a save, a vote, an edit) replaces it
 * once, and every list showing it updates. Objects are replaced, never
 * mutated, so components re-render only when what they read changes.
 */
export function createEntityStore<T extends { id: string }>() {
  let items = new Map<string, T>();
  let lists = new Map<string, EntityList>();
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getItem: (id: string): T | undefined => items.get(id),
    getList: (key: string): EntityList => lists.get(key) ?? emptyList,

    /** Adds or replaces items; the newest copy from the API wins. */
    setItems(loaded: T[]) {
      if (loaded.length === 0) {
        return;
      }
      items = new Map(items);
      for (const item of loaded) {
        items.set(item.id, item);
      }
      notify();
    },

    /** Changes one item. Returns it as it was, to undo the change. */
    updateItem(id: string, update: (item: T) => T): T | undefined {
      const previous = items.get(id);
      if (!previous) {
        return undefined;
      }
      items = new Map(items).set(id, update(previous));
      notify();
      return previous;
    },

    /** Changes every item `update` changes (it returns the same item to leave one alone). */
    updateAll(update: (item: T) => T) {
      let changed = false;
      const next = new Map<string, T>();
      for (const [id, item] of items) {
        const updated = update(item);
        changed ||= updated !== item;
        next.set(id, updated);
      }
      if (changed) {
        items = next;
        notify();
      }
    },

    /** Puts an item back as it was, e.g. when a change fails. */
    restoreItem(item: T) {
      items = new Map(items).set(item.id, item);
      notify();
    },

    /** Removes an item, and its id from every list (e.g. after deleting it). */
    removeItem(id: string) {
      items = new Map(items);
      items.delete(id);
      lists = new Map(
        [...lists].map(([key, list]) => [key, list.ids.includes(id) ? { ...list, ids: list.ids.filter((other) => other !== id) } : list]),
      );
      notify();
    },

    updateList(key: string, update: (list: EntityList) => EntityList) {
      lists = new Map(lists).set(key, update(store.getList(key)));
      notify();
    },

    /** Forgets everything, e.g. on sign-in or sign-out, when what the viewer sees changes. */
    reset() {
      items = new Map();
      lists = new Map();
      notify();
    },
  };
  return store;
}

export type EntityStore<T extends { id: string }> = ReturnType<typeof createEntityStore<T>>;
