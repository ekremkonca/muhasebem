import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles/styles.css';
import './styles/header-left.css';
import './styles/assets-page.css';
import './styles/dark-mode.css';

const PUBLIC_ASSET_VERSION='20260827-3';
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

// Deposit accrual runs for every SPA entry point so /varliklar works
// correctly even when reached without a full browser reload.
const depositLiveScript = document.createElement('script');
depositLiveScript.src = versioned('/assets-deposit-live.js');
depositLiveScript.defer = true;
document.head.appendChild(depositLiveScript);

// Calendar assets are intentionally loaded for every SPA entry point.
// Their CSS is scoped to .standalone-calendar-page, so they do not affect other pages.
// This prevents the old base calendar from appearing when navigating to /takvim
// without a full browser reload.
for (const href of ['/takvim-luxe.css','/takvim-luxe-enhance.css','/takvim-luxe-grid.css']) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versioned(href);
  document.head.appendChild(link);
}

const calendarEnhanceScript = document.createElement('script');
calendarEnhanceScript.src = versioned('/takvim-luxe-enhance.js');
calendarEnhanceScript.defer = true;
document.head.appendChild(calendarEnhanceScript);

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
