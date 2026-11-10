/**
 * A photo as the app shows it, wherever it comes from: published (its sizes
 * on the media server) or still on this device (a post being sent, its
 * resized file in memory). Grids, carousels and the viewer take these.
 */
export interface DisplayPhoto {
  /** Stays the same for the photo, for React lists. */
  key: string;
  src: string;
  /** Published photos list their sizes so the browser picks one. */
  srcSet?: string;
  width: number;
  height: number;
  /** A ThumbHash shown while it loads. */
  placeholder: string | null;
  caption: string | null;
}
