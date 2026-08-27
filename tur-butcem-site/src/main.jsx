import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles/styles.css';
import './styles/header-left.css';
import './styles/assets-page.css';
import './styles/dark-mode.css';

const PUBLIC_ASSET_VERSION='20260827-5';
const versioned=path=>`${path}?v=${PUBLIC_ASSET_VERSION}`;

try{
  const theme=localStorage.getItem('muhasebe-theme');
  const mode=localStorage.getItem('muhasebe-color-mode');
  if(theme)document.documentElement.dataset.theme=theme;
  if(mode==='dark'||mode==='light')document.documentElement.dataset.mode=mode;

  // Font size switching was removed. Clear all legacy preferences so the
  // fixed typography system is the only source of text sizing.
  localStorage.removeItem('muhasebe-ui-font-offset');
  localStorage.removeItem('muhasebe-ui-font-scale-v2');
  delete document.documentElement.dataset.fontOffset;
  delete document.documentElement.dataset.fontScale;
  document.documentElement.style.removeProperty('--app-font-offset');
}catch{}

// Asset styles are scoped to the assets page/editor and are loaded for every SPA entry.
// This keeps /varliklar visually identical whether opened directly or reached from another page.
for (const href of ['/assets-readable-large.css','/assets-editor-premium.css','/assets-controls-modern.css']) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versioned(href);
  document.head.appendChild(link);
}

const depositLiveScript = document.createElement('script');
depositLiveScript.src = versioned('/assets-deposit-live.js');
depositLiveScript.defer = true;
document.head.appendChild(depositLiveScript);

const assetsControlsScript = document.createElement('script');
assetsControlsScript.src = versioned('/assets-controls-modern.js');
assetsControlsScript.defer = true;
document.head.appendChild(assetsControlsScript);

// Calendar assets are intentionally loaded for every SPA entry point.
// Their CSS is scoped to .standalone-calendar-page, so they do not affect other pages.
for (const href of ['/takvim-luxe.css','/takvim-luxe-enhance.css','/takvim-luxe-grid.css']) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versioned(href);
  document.head.appendChild(link);
}

// Fixed typography is loaded last so it consistently normalizes all page-specific layers.
const fixedTypography = document.createElement('link');
fixedTypography.rel = 'stylesheet';
fixedTypography.href = versioned('/fixed-typography.css');
document.head.appendChild(fixedTypography);

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
