import React,{useEffect}from'react';
import{navigateTo}from'./navigation.js';

const isAssets=()=>Boolean(document.querySelector('.assets-fund-page'));
const openAccountingTool=(title)=>window.dispatchEvent(new CustomEvent('muhasebe:open-header-tool',{detail:title}));

export default function AssetsHeaderBridge(){
 useEffect(()=>{
  let frame;
  const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const active=isAssets();
   const header=document.querySelector('.v7-header');
   const actions=header?.querySelector('.header-actions');
   const mark=header?.querySelector('.brand-mark');
   const title=header?.querySelector('.brand>strong');
   if(header)header.hidden=false;
   if(actions)actions.hidden=false;
   [mark,title].filter(Boolean).forEach(el=>{
    el.style.cursor='pointer';
    el.setAttribute('role','link');
    el.setAttribute('tabindex','0');
    el.setAttribute('title','Muhasebe');
   });
   if(header)header.dataset.assetsActive=active?'1':'0';
  })};
  const observer=new MutationObserver(sync);
  const goHome=e=>{
   const hit=e.target.closest?.('.v7-header .brand-mark,.v7-header .brand>strong');
   if(!hit)return;
   if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;
   e.preventDefault();
   navigateTo('/muhasebe/');
  };
  const routeHeaderTool=e=>{
   if(!isAssets())return;
   const hit=e.target.closest?.('.v7-header .system-shortcut-card,.v7-header .home-header-actions .btn.secondary');
   if(!hit)return;
   const title=hit.getAttribute('title')||hit.textContent.trim();
   if(!title)return;
   e.preventDefault();
   e.stopPropagation();
   openAccountingTool(title.includes('Aylık')?'Aylık rapor':title);
  };
  sync();
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',routeHeaderTool,true);document.addEventListener('keydown',routeHeaderTool,true);
  document.addEventListener('click',goHome);document.addEventListener('keydown',goHome);
  window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);window.addEventListener('assetsviewchange',sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('click',routeHeaderTool,true);document.removeEventListener('keydown',routeHeaderTool,true);document.removeEventListener('click',goHome);document.removeEventListener('keydown',goHome);window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);window.removeEventListener('assetsviewchange',sync);const header=document.querySelector('.v7-header');const actions=header?.querySelector('.header-actions');if(actions)actions.hidden=false};
 },[]);
 return null;
}
