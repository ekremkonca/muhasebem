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
  const[open,setOpen]=useState(false);
  useEffect(()=>{
    const sync=()=>setActive(pageKey());
    window.addEventListener('popstate',sync);
    window.addEventListener(SITE_NAV_EVENT,sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener(SITE_NAV_EVENT,sync)};
  },[]);
  const go=(event,href)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setOpen(false);navigateTo(href);
  };
  const icon=(name)=><svg viewBox="0 0 24 24" aria-hidden="true"><path d={name==='muhasebe'?'M4 5h16v14H4zM4 9h16M8 5v14':name==='varliklar'?'M4 19V9m5 10V5m5 14v-7m5 7V3':'M7 3v3m10-3v3M4 10h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return createPortal(<>
    <button className="gentelella-menu-toggle" type="button" onClick={()=>setOpen(value=>!value)} aria-label="Menüyü aç veya kapat"><span/><span/><span/></button>
    <aside className={`gentelella-sidebar${open?' is-open':''}`} aria-label="Ana menü">
      <a className="gentelella-brand" href="/muhasebe/" onClick={event=>go(event,'/muhasebe/')}><img src="/ek-logo-clean.png" alt="EK"/><span>REHBERLİK<br/><b>MUHASEBE</b></span></a>
      <div className="gentelella-profile"><i>EK</i><div><strong>Ekrem Konca</strong><small><em/> Çevrimiçi</small></div></div>
      <nav className="gentelella-menu"> <span>ANA MENÜ</span>{LINKS.map(([href,label,key])=><a key={key} href={href} className={active===key?'active':''} onClick={event=>go(event,href)}>{icon(key)}<b>{label}</b>{active===key&&<i/>}</a>)}</nav>
      <nav className="gentelella-menu gentelella-tools"><span>ARAÇLAR</span><button type="button" onClick={()=>document.querySelector('.theme-icon-trigger')?.click()}>{icon('varliklar')}<b>Tema ve görünüm</b></button><button type="button" onClick={()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}>{icon('takvim')}<b>Sayfa sonu</b></button></nav>
      <footer><small>EK MUHASEBE</small><b>v10 · Canlı kayıtlar</b></footer>
    </aside>
    {open&&<button className="gentelella-scrim" type="button" onClick={()=>setOpen(false)} aria-label="Menüyü kapat"/>}
  </>,document.body);
}
