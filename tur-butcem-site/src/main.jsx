import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles.css';
import './header-left.css';
import './assets-page.css';
import './dark-mode.css';

try{
  const theme=localStorage.getItem('muhasebe-theme');
  const mode=localStorage.getItem('muhasebe-color-mode');
  if(theme)document.documentElement.dataset.theme=theme;
  if(mode==='dark'||mode==='light')document.documentElement.dataset.mode=mode;
}catch{}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SiteRouter />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
