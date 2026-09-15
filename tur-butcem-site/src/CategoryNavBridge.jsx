import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{navigateTo,SITE_NAV_EVENT}from'./navigation.js';

const LINKS=[
  ['/muhasebe/','Muhasebe','muhasebe'],
  ['/varliklar/','Varlıklar','varliklar'],
  ['/takvim/','Takvim','takvim']
];
const pageKey=()=>{
  const path=(location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(path.startsWith('varliklar'))return'varliklar';
  if(path.startsWith('takvim'))return'takvim';
  return'muhasebe';
};

export default function CategoryNavBridge(){
  const[active,setActive]=useState(pageKey);
  const[header,setHeader]=useState(null);
  useEffect(()=>{
    const syncHeader=()=>setHeader(document.querySelector('.v7-header'));
    syncHeader();
    const observer=new MutationObserver(syncHeader);
    observer.observe(document.getElementById('root'),{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const sync=()=>setActive(pageKey());
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(SITE_NAV_EVENT,sync)};
  },[]);
  return header?createPortal(<div className="global-category-nav-host"><nav className="global-category-nav" aria-label="Ana kategoriler">{LINKS.map(([href,label,key])=><a key={key} href={href} data-page={key} aria-current={active===key?'page':undefined} className={active===key?'active':''} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();window.location.assign(href)}}>{label}</a>)}</nav></div>,header):null;
}
