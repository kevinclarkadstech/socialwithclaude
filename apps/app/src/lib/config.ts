/** Where the API runs. Set VITE_API_URL to point the app somewhere else. */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  /**
   * The web address shared links point to. Set VITE_PUBLIC_URL for native
   * builds, where the app's own origin (capacitor://localhost) means nothing to others.
   */
  publicUrl: import.meta.env.VITE_PUBLIC_URL ?? window.location.origin,
};
