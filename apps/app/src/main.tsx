import React from 'react';
import { createRoot } from 'react-dom/client';
import { sessionToken } from './api/sessionToken';
import { App } from './App';

const container = document.getElementById('root');
const root = createRoot(container!);

// In the native app, read the saved session token before the first request.
void sessionToken.load().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
