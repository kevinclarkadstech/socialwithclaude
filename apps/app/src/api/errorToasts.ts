type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** Shows a toast for an unexpected failure (see ErrorToastHost). */
export function showErrorToast(message: string) {
  for (const listener of listeners) {
    listener(message);
  }
}

export function onErrorToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
