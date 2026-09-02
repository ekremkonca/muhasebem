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
  const[active,setActive]=useState(pageKey);
  useEffect(()=>{
    const sync=()=>setActive(pageKey());
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(SITE_NAV_EVENT,sync)};
  },[]);
  return <div className="global-category-nav-host"><nav className="global-category-nav" aria-label="Ana kategoriler">{LINKS.map(([href,label,key])=><a key={key} href={href} data-page={key} className={active===key?'active':''} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigateTo(href)}}>{label}</a>)}</nav></div>;
}
