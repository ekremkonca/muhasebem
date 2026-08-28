import {useEffect} from 'react';
import {getAuthState} from './api.js';
import {navigateTo,SITE_NAV_EVENT} from './navigation.js';

const LINKS=[
  ['/anasayfa/','Ana Sayfa','anasayfa'],
  ['/muhasebe/','Muhasebe','muhasebe'],
  ['/varliklar/','Varlıklar','varliklar'],
  ['/takvim/','Takvim','takvim'],
  ['/harcamalar/','Harcama Kayıtları','harcamalar']
];

const pageKey=()=>{
  const p=(window.location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(p.startsWith('muhasebe'))return'muhasebe';
  if(p.startsWith('varliklar'))return'varliklar';
  if(p.startsWith('takvim'))return'takvim';
  if(p.startsWith('harcamalar'))return'harcamalar';
  return'anasayfa';
};

const buildNav=()=>{
  const nav=document.createElement('nav');
  nav.className='global-category-nav';
  nav.setAttribute('aria-label','Ana kategoriler');
  for(const[href,label,key]of LINKS){
    const a=document.createElement('a');
    a.href=href;
    a.textContent=label;
    a.dataset.page=key;
    a.addEventListener('pointerenter',()=>{if(key!=='anasayfa')getAuthState().catch(()=>{})},{passive:true});
    a.addEventListener('click',e=>{
      if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      e.preventDefault();
      if(key!=='anasayfa')getAuthState().catch(()=>{});
      navigateTo(href);
    });
    nav.appendChild(a);
  }
  return nav;
};

export default function CategoryNavBridge(){
  useEffect(()=>{
    let frame=0;
    const sync=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const header=document.querySelector('.v7-header');
        if(!header)return;
        let host=document.querySelector('.global-category-nav-host');
        if(!host){
          host=document.createElement('div');
          host.className='global-category-nav-host';
          host.appendChild(buildNav());
        }
        if(host.previousElementSibling!==header)header.insertAdjacentElement('afterend',host);
        const active=pageKey();
        host.querySelectorAll('a[data-page]').forEach(link=>link.classList.toggle('active',link.dataset.page===active));
      });
    };
    sync();
    const observer=new MutationObserver(mutations=>{
      const host=document.querySelector('.global-category-nav-host');
      if(host&&mutations.every(m=>host.contains(m.target)))return;
      sync();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    return()=>{
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('popstate',sync);
      window.removeEventListener(SITE_NAV_EVENT,sync);
      document.querySelector('.global-category-nav-host')?.remove();
    };
  },[]);
  return null;
}
