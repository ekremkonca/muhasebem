import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles/styles.css';
import './styles/header-left.css';
import './styles/assets-page.css';
import './styles/dark-mode.css';

const PUBLIC_ASSET_VERSION='20260827-1';
const versioned=path=>`${path}?v=${PUBLIC_ASSET_VERSION}`;

try{
  const theme=localStorage.getItem('muhasebe-theme');
  const mode=localStorage.getItem('muhasebe-color-mode');
  if(theme)document.documentElement.dataset.theme=theme;
  if(mode==='dark'||mode==='light')document.documentElement.dataset.mode=mode;
}catch{}

if (window.location.pathname.startsWith('/varliklar')) {
  const assetsReadable = document.createElement('link');
  assetsReadable.rel = 'stylesheet';
  assetsReadable.href = versioned('/assets-readable-large.css');
  document.head.appendChild(assetsReadable);

  const assetsEditorPremium = document.createElement('link');
  assetsEditorPremium.rel = 'stylesheet';
  assetsEditorPremium.href = versioned('/assets-editor-premium.css');
  document.head.appendChild(assetsEditorPremium);
}

if (window.location.pathname.startsWith('/takvim')) {
  const calendarTheme = document.createElement('link');
  calendarTheme.rel = 'stylesheet';
  calendarTheme.href = versioned('/takvim-luxe.css');
  document.head.appendChild(calendarTheme);

  const calendarThemeEnhance = document.createElement('link');
  calendarThemeEnhance.rel = 'stylesheet';
  calendarThemeEnhance.href = versioned('/takvim-luxe-enhance.css');
  document.head.appendChild(calendarThemeEnhance);

  const calendarGridTheme = document.createElement('link');
  calendarGridTheme.rel = 'stylesheet';
  calendarGridTheme.href = versioned('/takvim-luxe-grid.css');
  document.head.appendChild(calendarGridTheme);

  const calendarEnhanceScript = document.createElement('script');
  calendarEnhanceScript.src = versioned('/takvim-luxe-enhance.js');
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
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => {});
  });
}