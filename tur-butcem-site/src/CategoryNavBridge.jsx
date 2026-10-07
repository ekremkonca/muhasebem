import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{navigateTo,SITE_NAV_EVENT}from'./navigation.js';

const LINKS=[
  ['/muhasebe/','Muhasebe'],
  ['/varliklar/','Varlıklar'],
  ['/takvim/','Takvim']
  ,['/takip/','Takip']
];
const pageKey=()=>{
  const path=(location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(path.startsWith('varliklar'))return'Varlıklar';
  if(path.startsWith('takvim'))return'Takvim';
  if(path.startsWith('takip'))return'Takip';
  return'Muhasebe';
};

export default function CategoryNavBridge(){
  const[active,setActive]=useState(pageKey);
  const[header,setHeader]=useState(null);
  const[mobile,setMobile]=useState(()=>window.matchMedia('(max-width:760px)').matches);
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
  useEffect(()=>{
    const query=window.matchMedia('(max-width:760px)');
    const sync=()=>setMobile(query.matches);
    sync();
    query.addEventListener('change',sync);
    return()=>query.removeEventListener('change',sync);
  },[]);
  const go=(event,href)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigateTo(href);
  };
  const target=mobile?document.body:header;
  return target?createPortal(<div className="global-category-nav-host"><nav className="global-category-nav" aria-label="Ana sayfalar">{LINKS.map(([href,label])=><a key={label} href={href} className={active===label?'active':''} aria-current={active===label?'page':undefined} onClick={event=>go(event,href)}>{label}</a>)}</nav></div>,target):null;
}
