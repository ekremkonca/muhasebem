import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{navigateTo,SITE_NAV_EVENT}from'./navigation.js';

const LINKS=[
  ['/muhasebe/','Muhasebe'],
  ['/varliklar/','Varlıklar'],
  ['/takvim/','Takvim']
];
const pageKey=()=>{
  const path=(location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(path.startsWith('varliklar'))return'Varlıklar';
  if(path.startsWith('takvim'))return'Takvim';
  return'Muhasebe';
};

export default function CategoryNavBridge(){
  const[active,setActive]=useState(pageKey);
  const[header,setHeader]=useState(null);
  useEffect(()=>{
    const sync=()=>setActive(pageKey());
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(SITE_NAV_EVENT,sync)};
  },[]);
  useEffect(()=>{
    const sync=()=>setHeader(document.querySelector('.v7-header'));
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.getElementById('root'),{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  const go=(event,href)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigateTo(href);
  };
  return header?createPortal(<div className="global-category-nav-host"><nav className="global-category-nav" aria-label="Ana sayfalar">{LINKS.map(([href,label])=><a key={label} href={href} className={active===label?'active':''} aria-current={active===label?'page':undefined} onClick={event=>go(event,href)}>{label}</a>)}</nav></div>,header):null;
}
