import React,{useEffect,useRef,useState}from'react';

const ROUTE='#varliklar-fon';

export default function AssetsNav(){
 const[active,setActive]=useState(()=>location.hash===ROUTE),[position,setPosition]=useState(null),buttonRef=useRef(null);
 useEffect(()=>{const sync=()=>setActive(location.hash===ROUTE);window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[]);
 useEffect(()=>{const dashboard=document.querySelector('.main-dashboard.v7-dashboard');if(dashboard)dashboard.hidden=active;return()=>{if(dashboard)dashboard.hidden=false}},[active]);
 useEffect(()=>{let frame;const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const currency=document.querySelector('.v7-header .currency');if(!currency){setPosition(null);return}const r=currency.getBoundingClientRect();setPosition({left:r.left-8,top:r.top,height:r.height})})};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place)}},[]);
 const open=()=>{history.pushState(null,'',`${location.pathname}${location.search}${ROUTE}`);setActive(true);window.scrollTo({top:0,behavior:'auto'})};
 const close=()=>{history.pushState(null,'',`${location.pathname}${location.search}`);setActive(false);window.scrollTo({top:0,behavior:'auto'})};
 return <>{position&&<button ref={buttonRef} type="button" className={`btn secondary assets-nav-button assets-nav-fixed${active?' active':''}`} style={{left:position.left,top:position.top,height:position.height}} onClick={open}>VARLIKLAR / FON</button>}{active&&<main className="assets-fund-page"><section className="assets-fund-shell"><button type="button" className="assets-back" onClick={close}>← Muhasebeye dön</button><div className="assets-fund-heading"><span className="eyebrow">VARLIKLAR / FON</span><h1>Varlıklar / Fon</h1><p>Banka ve yatırım fonu takibi için ayrı çalışma alanı.</p></div><section className="assets-empty-state"><strong>Varlık takibi</strong><span>Fon ve hesap bilgileri bir sonraki adımda eklenecek.</span></section></section></main>}</>;
}
