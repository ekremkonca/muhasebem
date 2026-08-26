import React,{useEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import'./font-switcher.css';

const STORAGE_KEY='muhasebe-ui-font';
const FONTS=[['dm-sans','DM Sans','"DM Sans", "Segoe UI", Arial, sans-serif'],['atkinson','Atkinson Hyperlegible','"Atkinson Hyperlegible Next", "Segoe UI", Arial, sans-serif'],['segoe','Segoe UI','"Segoe UI", Arial, sans-serif'],['system','Sistem UI','system-ui, -apple-system, "Segoe UI", Arial, sans-serif'],['arial','Arial','Arial, Helvetica, sans-serif'],['verdana','Verdana','Verdana, Geneva, sans-serif'],['tahoma','Tahoma','Tahoma, Geneva, sans-serif'],['trebuchet','Trebuchet MS','"Trebuchet MS", Arial, sans-serif'],['calibri','Calibri','Calibri, "Segoe UI", Arial, sans-serif'],['manrope','Manrope','Manrope, "Segoe UI", Arial, sans-serif']];
const getInitial=()=>{try{const saved=localStorage.getItem(STORAGE_KEY);return FONTS.some(([id])=>id===saved)?saved:'dm-sans'}catch{return'dm-sans'}};
const findReportButton=()=>[...document.querySelectorAll('.v7-header button')].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));
const isAssets=()=>Boolean(document.querySelector('.assets-fund-page'));

export default function FontSwitcher(){
 const[selected,setSelected]=useState(getInitial),[open,setOpen]=useState(false),[slot,setSlot]=useState(null),ref=useRef(null);
 const current=FONTS.find(x=>x[0]===selected)||FONTS[0];
 useEffect(()=>{document.documentElement.style.setProperty('--app-font',current[2]);document.documentElement.dataset.font=selected;try{localStorage.setItem(STORAGE_KEY,selected)}catch{}},[selected]);
 useEffect(()=>{const close=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 useEffect(()=>{let mount=null,frame;const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(isAssets()){mount?.remove();mount=null;setSlot(null);setOpen(false);return}const report=findReportButton(),header=document.querySelector('.v7-header');if(!report||!header||header.hidden||report.offsetParent===null){mount?.remove();mount=null;setSlot(null);setOpen(false);return}if(mount?.isConnected&&mount.nextSibling===report){setSlot(mount);return}mount?.remove();mount=document.createElement('span');mount.className='font-switcher-slot';report.parentElement?.insertBefore(mount,report);setSlot(mount)})};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});window.addEventListener('resize',place);window.addEventListener('hashchange',place);window.addEventListener('popstate',place);window.addEventListener('assetsviewchange',place);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('hashchange',place);window.removeEventListener('popstate',place);window.removeEventListener('assetsviewchange',place);mount?.remove()}},[]);
 if(!slot)return null;
 return createPortal(<div className="font-switcher" ref={ref}><button type="button" className="btn secondary font-trigger" onClick={()=>setOpen(x=>!x)} title={`Yazı fontu: ${current[1]}`} aria-label={`Yazı fontunu değiştir. Seçili: ${current[1]}`}><span className="font-aa">Aa</span></button>{open&&<div className="font-panel" role="menu" aria-label="Yazı fontları">{FONTS.map(([id,name,stack])=><button key={id} type="button" className={selected===id?'active':''} style={{'--preview-font':stack}} onClick={()=>{setSelected(id);setOpen(false)}}><span>{name}</span>{selected===id&&<b>✓</b>}</button>)}</div>}</div>,slot);
}
