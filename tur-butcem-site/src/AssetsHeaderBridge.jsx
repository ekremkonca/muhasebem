import React,{useEffect}from'react';

const isAssets=()=>Boolean(document.querySelector('.assets-fund-page'));

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
   if(actions)actions.hidden=active;
   [mark,title].filter(Boolean).forEach(el=>{
    el.style.cursor='pointer';
    el.setAttribute('role','link');
    el.setAttribute('tabindex','0');
    el.setAttribute('title',active?'Muhasebe ana sayfasına dön':'Ana sayfa');
   });
  })};
  const goHome=e=>{
   const hit=e.target.closest?.('.v7-header .brand-mark,.v7-header .brand>strong');
   if(!hit)return;
   if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;
   e.preventDefault();
   if(isAssets()){
    const back=document.querySelector('.assets-back');
    if(back){back.click();return}
   }
   history.pushState(null,'',`${location.pathname}${location.search}`);
   window.dispatchEvent(new Event('popstate'));
   window.dispatchEvent(new Event('assetsviewchange'));
   window.scrollTo({top:0,behavior:'auto'});
  };
  sync();
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  document.addEventListener('click',goHome);document.addEventListener('keydown',goHome);
  window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);window.addEventListener('assetsviewchange',sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('click',goHome);document.removeEventListener('keydown',goHome);window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);window.removeEventListener('assetsviewchange',sync);const header=document.querySelector('.v7-header');const actions=header?.querySelector('.header-actions');if(actions)actions.hidden=false};
 },[]);
 return null;
}
