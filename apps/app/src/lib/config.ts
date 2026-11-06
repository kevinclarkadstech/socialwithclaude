/** Where the API runs. Set VITE_API_URL to point the app somewhere else. */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
};
