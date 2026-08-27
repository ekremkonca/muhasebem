import React,{useEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import'./styles/font-size-switcher.css';

const STORAGE_KEY='muhasebe-ui-font-offset';
const VALUES=[0,1,2,3,5,7,8,9,10,13];
const getSaved=()=>{try{const n=Number(localStorage.getItem(STORAGE_KEY));return VALUES.includes(n)?n:0}catch{return 0}};
const shouldSkip=el=>!el||el.closest?.('.font-size-switcher,.font-panel')||['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','CIRCLE','LINE','POLYLINE','POLYGON'].includes(el.tagName);
const hasOwnText=el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())||['INPUT','TEXTAREA','SELECT','BUTTON','OPTION','LABEL'].includes(el.tagName);

function restoreManaged(root=document){
 root.querySelectorAll?.('[data-font-size-base]').forEach(el=>{
  const original=el.dataset.fontSizeInline||'';
  if(original)el.style.fontSize=original;else el.style.removeProperty('font-size');
  delete el.dataset.fontSizeBase;
  delete el.dataset.fontSizeInline;
 });
}

function applyOffset(offset,root=document){
 const all=[...(root.querySelectorAll?.('#root *')||[])];
 for(const el of all){
  if(shouldSkip(el)||!hasOwnText(el))continue;
  if(!el.dataset.fontSizeBase){
   const computed=parseFloat(getComputedStyle(el).fontSize);
   if(!Number.isFinite(computed)||computed<=0)continue;
   el.dataset.fontSizeBase=String(computed);
   el.dataset.fontSizeInline=el.style.fontSize||'';
  }
  const base=Number(el.dataset.fontSizeBase);
  el.style.fontSize=`${Math.max(1,base+offset)}px`;
 }
 document.documentElement.dataset.fontOffset=String(offset);
 document.documentElement.style.setProperty('--app-font-offset',`${offset}px`);
 try{localStorage.setItem(STORAGE_KEY,String(offset))}catch{}
}

const findReport=actions=>[...(actions?.querySelectorAll('button')||[])].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));

export default function FontSizeSwitcher(){
 const[selected,setSelected]=useState(getSaved),[open,setOpen]=useState(false),[target,setTarget]=useState(null),ref=useRef(null),frameRef=useRef(0),observerRef=useRef(null);

 useEffect(()=>{
  const run=()=>{cancelAnimationFrame(frameRef.current);frameRef.current=requestAnimationFrame(()=>applyOffset(selected))};
  run();
  observerRef.current?.disconnect();
  observerRef.current=new MutationObserver(run);
  observerRef.current.observe(document.body,{childList:true,subtree:true});
  const resize=()=>{restoreManaged();run()};
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
   <button type="button" className="btn secondary font-trigger font-size-trigger" onClick={()=>setOpen(x=>!x)} title={`Yazı boyutu: ${selected?`+${selected}px`:'Normal'}`} aria-label={`Yazı boyutunu değiştir. Seçili: ${selected?`+${selected}px`:'Normal'}`}><span className="font-size-symbol">A↕</span></button>
   {open&&<div className="font-panel font-size-panel" role="menu" aria-label="Yazı boyutu seçenekleri">
    <div className="font-size-panel-head"><strong>Yazı Boyutu</strong><small>Tüm sayfalara uygula</small></div>
    {VALUES.map(value=><button key={value} type="button" className={selected===value?'active':''} onClick={()=>{setSelected(value);setOpen(false)}}><span>{value===0?'Normal':`+${value} px`}</span>{selected===value&&<b>✓</b>}</button>)}
   </div>}
  </div>,target
 );
}
