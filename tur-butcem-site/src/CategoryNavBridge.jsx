import React,{useEffect,useState}from'react';
import{createPortal}from'react-dom';
import{navigateTo,SITE_NAV_EVENT}from'./navigation.js';

const NavIcon=({name})=>{
  if(name==='Muhasebe')return <svg className="nav-icon nav-icon-accounting" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 6.5v11M7.7 10.2l6.7-2M7.7 13.1l6.7-2M9.5 17.5c3.9 0 6.4-1.9 6.8-5.1"/></svg>;
  if(name==='Varlıklar')return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11Z"/><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H17"/><path d="M15.5 12h4.5v4h-4.5a2 2 0 0 1 0-4Z"/><circle cx="16" cy="14" r=".5" fill="currentColor" stroke="none"/></svg>;
  if(name==='Rotalar')return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/><circle cx="15" cy="10" r="1.5"/></svg>;
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"/><path d="M7.5 13h2M12 13h2M16.5 13h.1M7.5 17h2M12 17h2"/></svg>;
};

const LINKS=[
  {href:'/muhasebe/',label:'Muhasebe'},
  {href:'/varliklar/',label:'Varlıklar'},
  {href:'/takvim/',label:'Takvim'},
  {href:'/rota/',label:'Rotalar'}
];
const pageKey=()=>{
  const path=(location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(path.startsWith('varliklar'))return'Varlıklar';
  if(path.startsWith('takvim'))return'Takvim';
  if(path.startsWith('rota'))return'Rotalar';
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
  return target?createPortal(<div className="global-category-nav-host"><nav className="global-category-nav" aria-label="Ana sayfalar">{LINKS.map(({href,label})=><a key={label} href={href} className={active===label?'active':''} aria-current={active===label?'page':undefined} onClick={event=>go(event,href)}><NavIcon name={label}/><span className="nav-label">{label}</span></a>)}</nav></div>,target):null;
}
