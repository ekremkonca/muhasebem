import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles/styles.css';
import './styles/header-left.css';
import './styles/assets-page.css';
import './styles/dark-mode.css';

try{
  const theme=localStorage.getItem('muhasebe-theme');
  const mode=localStorage.getItem('muhasebe-color-mode');
  if(theme)document.documentElement.dataset.theme=theme;
  if(mode==='dark'||mode==='light')document.documentElement.dataset.mode=mode;
}catch{}

if (window.location.pathname.startsWith('/takvim')) {
  const calendarTheme = document.createElement('link');
  calendarTheme.rel = 'stylesheet';
  calendarTheme.href = '/takvim-luxe.css';
  document.head.appendChild(calendarTheme);

  const calendarThemeEnhance = document.createElement('link');
  calendarThemeEnhance.rel = 'stylesheet';
  calendarThemeEnhance.href = '/takvim-luxe-enhance.css';
  document.head.appendChild(calendarThemeEnhance);

  const calendarGridTheme = document.createElement('link');
  calendarGridTheme.rel = 'stylesheet';
  calendarGridTheme.href = '/takvim-luxe-grid.css';
  document.head.appendChild(calendarGridTheme);

  const calendarEnhanceScript = document.createElement('script');
  calendarEnhanceScript.src = '/takvim-luxe-enhance.js';
  calendarEnhanceScript.defer = true;
  document.head.appendChild(calendarEnhanceScript);
}

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
