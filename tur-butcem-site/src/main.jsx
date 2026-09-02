import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from './SiteRouter.jsx';
import './styles/styles.css';
import './styles/header-left.css';
import './styles/assets-page.css';
import './styles/dark-mode.css';
import './styles/product-redesign.css';
import { SITE_NAV_EVENT } from './navigation.js';

const PUBLIC_ASSET_VERSION='20260827-16';
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

const loadStyle = href => {
  if (document.querySelector(`link[data-lazy-style="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versioned(href);
  link.dataset.lazyStyle = href;
  document.head.appendChild(link);
};
const loadScript = src => {
  if (document.querySelector(`script[data-lazy-script="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = versioned(src);
  script.defer = true;
  script.dataset.lazyScript = src;
  document.head.appendChild(script);
};
const loadPageAssets = () => {
  const path = location.pathname.replace(/\/+$/, '');
  if (path === '/varliklar') {
    ['/assets-readable-large.css','/assets-editor-premium.css','/assets-controls-modern.css'].forEach(loadStyle);
    ['/assets-deposit-live.js','/assets-controls-modern.js'].forEach(loadScript);
  }
  if (path === '/takvim') {
    ['/takvim-luxe.css','/takvim-luxe-enhance.css','/takvim-luxe-grid.css','/takvim-theme-sync.css','/takvim-luxe-dark-readable.css'].forEach(loadStyle);
    loadScript('/takvim-luxe-enhance.js');
  }
};
loadPageAssets();
window.addEventListener(SITE_NAV_EVENT, loadPageAssets);
window.addEventListener('popstate', loadPageAssets);

// Fixed typography normalizes all page-specific layers.
const fixedTypography = document.createElement('link');
fixedTypography.rel = 'stylesheet';
fixedTypography.href = versioned('/fixed-typography.css');
document.head.appendChild(fixedTypography);

// Final interaction layer: data cards and rows react to the selected theme palette.
const interactiveThemeHover = document.createElement('link');
interactiveThemeHover.rel = 'stylesheet';
interactiveThemeHover.href = versioned('/interactive-theme-hover.css');
document.head.appendChild(interactiveThemeHover);

// V8 brand image is mounted as a real IMG so it cannot disappear behind CSS backgrounds.
const headerBrandScript = document.createElement('script');
headerBrandScript.src = versioned('/header-brand-v8.js');
headerBrandScript.defer = true;
document.head.appendChild(headerBrandScript);

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
