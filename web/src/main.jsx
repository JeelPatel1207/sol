import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './theme.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker for offline PWA support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New update available.');
  },
  onOfflineReady() {
    console.log('[PWA] App ready for offline use.');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
