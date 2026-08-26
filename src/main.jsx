import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AssetsNav from './AssetsNav.jsx';
import FontSwitcher from './FontSwitcher.jsx';
import AssetsHeaderBridge from './AssetsHeaderBridge.jsx';
import './styles.css';
import './header-left.css';
import './assets-page.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <App />
      <AssetsNav />
      <FontSwitcher />
      <AssetsHeaderBridge />
    </>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
