import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Dev-only: exposes window.__seedStudyOS() in the browser console
if (import.meta.env.DEV) {
  import('./lib/seedData');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
