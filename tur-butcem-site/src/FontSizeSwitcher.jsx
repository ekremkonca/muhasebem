import React,{useEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import'./styles/font-size-switcher.css';

const STORAGE_KEY='muhasebe-ui-font-scale-v2';
const OPTIONS=[80,85,90,95,100,102.5,105,107.5,110,115,120];
const DEFAULT_SCALE=90;
const getSaved=()=>{try{const n=Number(localStorage.getItem(STORAGE_KEY));return OPTIONS.includes(n)?n:DEFAULT_SCALE}catch{return DEFAULT_SCALE}};
const shouldSkip=el=>!el||el.closest?.('.font-size-switcher,.font-panel')||['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','CIRCLE','LINE','POLYLINE','POLYGON'].includes(el.tagName);
const hasOwnText=el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())||['INPUT','TEXTAREA','SELECT','BUTTON','OPTION','LABEL'].includes(el.tagName);

function clearLegacySizing(root=document){
 root.querySelectorAll?.('[data-font-size-base]').forEach(el=>{
  const original=el.dataset.fontSizeInline||'';
  if(original)el.style.fontSize=original;else el.style.removeProperty('font-size');
  delete el.dataset.fontSizeBase;
  delete el.dataset.fontSizeInline;
 });
}

function applyScale(scale,root=document){
 const multiplier=Number(scale)/100;
 const all=[...(root.querySelectorAll?.('#root *')||[])];
 for(const el of all){
  if(shouldSkip(el)||!hasOwnText(el))continue;
  if(!el.dataset.fontScaleBase){
   const computed=parseFloat(getComputedStyle(el).fontSize);
   if(!Number.isFinite(computed)||computed<=0)continue;
   el.dataset.fontScaleBase=String(computed);
   el.dataset.fontScaleInline=el.style.fontSize||'';
  }
  const base=Number(el.dataset.fontScaleBase);
  el.style.fontSize=`${Math.max(1,base*multiplier).toFixed(2)}px`;
 }
 document.documentElement.dataset.fontScale=String(scale);
 try{localStorage.setItem(STORAGE_KEY,String(scale))}catch{}
}

function resetScaleBases(root=document){
 root.querySelectorAll?.('[data-font-scale-base]').forEach(el=>{
  const original=el.dataset.fontScaleInline||'';
  if(original)el.style.fontSize=original;else el.style.removeProperty('font-size');
  delete el.dataset.fontScaleBase;
  delete el.dataset.fontScaleInline;
 });
}

const findReport=actions=>[...(actions?.querySelectorAll('button')||[])].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));
const labelFor=value=>value===100?'Orijinal':`${value}%`;

export default function FontSizeSwitcher(){
 const[selected,setSelected]=useState(getSaved),[open,setOpen]=useState(false),[target,setTarget]=useState(null),ref=useRef(null),frameRef=useRef(0),observerRef=useRef(null);

 useEffect(()=>{clearLegacySizing();try{localStorage.removeItem('muhasebe-ui-font-offset')}catch{}},[]);

 useEffect(()=>{
  const run=()=>{cancelAnimationFrame(frameRef.current);frameRef.current=requestAnimationFrame(()=>applyScale(selected))};
  run();
  observerRef.current?.disconnect();
  observerRef.current=new MutationObserver(run);
  observerRef.current.observe(document.body,{childList:true,subtree:true});
  const resize=()=>{resetScaleBases();run()};
  window.addEventListener('resize',resize);
  return()=>{cancelAnimationFrame(frameRef.current);observerRef.current?.disconnect();window.removeEventListener('resize',resize)};
 },[selected]);

 useEffect(()=>{const outside=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',outside);return()=>document.removeEventListener('mousedown',outside)},[]);

 useEffect(()=>{
  let frame;
  const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const actions=document.querySelector('.v7-header .header-actions'),report=findReport(actions);
   setTarget(actions&&report?actions:null);
  })};
  sync();
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',sync)};
 },[]);

 if(!target)return null;
 return createPortal(
  <div className="font-switcher header-font-switcher font-size-switcher" ref={ref} style={{order:98}}>
   <button type="button" className="btn secondary font-trigger font-size-trigger" onClick={()=>setOpen(x=>!x)} title={`Yazı ölçeği: ${selected}%`} aria-label={`Yazı boyutunu değiştir. Seçili: ${selected}%`}><span className="font-size-symbol">A↕</span></button>
   {open&&<div className="font-panel font-size-panel" role="menu" aria-label="Yazı boyutu seçenekleri">
    <div className="font-size-panel-head"><strong>Yazı Boyutu</strong><small>Daha hassas ölçekleme</small></div>
    {OPTIONS.map(value=><button key={value} type="button" className={selected===value?'active':''} onClick={()=>{setSelected(value);setOpen(false)}}><span>{labelFor(value)}</span>{selected===value&&<b>✓</b>}</button>)}
   </div>}
  </div>,target
 );
}
