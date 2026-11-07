import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App/App';
import { refreshCallingUser } from './domains/users/callingUserStore';
import { sessionToken } from './lib/auth/sessionToken';
import { onForeground } from './lib/foreground';
import { logger } from './lib/logger';

const root = createRoot(document.getElementById('root')!);

function render() {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// In the native app, read the saved session token before the first request.
// If it can't be read, start signed out and forget it, so it doesn't fail on every launch.
void sessionToken
  .load()
  .catch(async (error: unknown) => {
    logger.warn("Couldn't read the saved session; starting signed out", { error: String(error) });
    await sessionToken.clear().catch(() => undefined);
  })
  .finally(() => {
    void refreshCallingUser();
    // Picks up changes made on other devices, e.g. this device being signed out.
    onForeground(() => void refreshCallingUser());
    render();
  });
