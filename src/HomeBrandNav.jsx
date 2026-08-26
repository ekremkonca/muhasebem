import React,{useEffect,useState}from'react';
import'./home-brand-nav.css';

const ROUTE='#varliklar-fon';
const isAssets=()=>location.hash===ROUTE;
const goHome=()=>{history.pushState(null,'',`${location.pathname}${location.search}`);window.dispatchEvent(new Event('popstate'));window.scrollTo({top:0,behavior:'auto'})};

function TempleIcon(){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 18h14M6 18V10h12v8M3 10h18L12 3z"/><path d="M9 10v8m3-8v8m3-8v8"/></svg>}

export default function HomeBrandNav(){
 const[assets,setAssets]=useState(isAssets);
 useEffect(()=>{const sync=()=>setAssets(isAssets());window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[]);
 useEffect(()=>{const click=e=>{const hit=e.target.closest?.('.v7-header .brand-mark,.v7-header .brand>strong');if(!hit)return;e.preventDefault();goHome()};const key=e=>{if(!['Enter',' '].includes(e.key))return;const hit=e.target.closest?.('.v7-header .brand-mark,.v7-header .brand>strong');if(!hit)return;e.preventDefault();goHome()};const decorate=()=>document.querySelectorAll('.v7-header .brand-mark,.v7-header .brand>strong').forEach(el=>{el.setAttribute('role','link');el.setAttribute('tabindex','0');el.setAttribute('title','Ana sayfaya dön')});decorate();const observer=new MutationObserver(decorate);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',click);document.addEventListener('keydown',key);return()=>{observer.disconnect();document.removeEventListener('click',click);document.removeEventListener('keydown',key)}},[]);
 return assets?<button type="button" className="assets-home-brand" onClick={goHome} title="Muhasebe ana sayfasına dön"><span className="assets-home-mark"><TempleIcon/></span><strong>Muhasebe <small>V7</small></strong></button>:null;
}
