/** A photo as the full-screen viewer shows it. */
export interface ViewerPhoto {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  caption: string | null;
  /** A ThumbHash shown while it loads. */
  placeholder: string | null;
}

interface PhotoViewerState {
  photos: ViewerPhoto[];
  /** The photo it opened on. */
  index: number;
  isOpen: boolean;
}

let state: PhotoViewerState = { photos: [], index: 0, isOpen: false };
const listeners = new Set<() => void>();

function set(next: PhotoViewerState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

/** The one full-screen photo viewer (PhotoViewer, in the app shell): what it shows. */
export const photoViewerStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => state,
};

/** Shows `photos` full screen, starting at `index`: swipe (or arrow keys) between them. */
export function openPhotoViewer({ photos, index = 0 }: { photos: ViewerPhoto[]; index?: number }) {
  set({ photos, index, isOpen: true });
}

export function closePhotoViewer() {
  set({ ...state, isOpen: false });
}
