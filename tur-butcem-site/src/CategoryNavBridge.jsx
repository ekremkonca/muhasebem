import React,{useEffect,useState}from'react';
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
  const[active,setActive]=useState(pageKey),[open,setOpen]=useState(false);
  useEffect(()=>{
    const sync=()=>setActive(pageKey());
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    document.body.dataset.sidebarOpen='0';
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(SITE_NAV_EVENT,sync);delete document.body.dataset.sidebarOpen};
  },[]);
  const toggle=()=>{setOpen(value=>{const next=!value;document.body.dataset.sidebarOpen=next?'1':'0';return next})};
  return <><button type="button" className="sidebar-menu-toggle" aria-label={open?'Sol paneli kapat':'Sol paneli aç'} aria-expanded={open} onClick={toggle}><span/><span/><span/></button><div className={`global-category-nav-host${open?' sidebar-open':''}`}><nav className="global-category-nav" aria-label="Ana kategoriler">{LINKS.map(([href,label,key])=><a key={key} href={href} data-page={key} aria-current={active===key?'page':undefined} className={active===key?'active':''} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();window.location.assign(href)}}>{label}</a>)}</nav></div></>;
}
