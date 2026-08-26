import React,{useEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import'./styles/font-switcher.css';

const STORAGE_KEY='muhasebe-ui-font';
const FONTS=[['dm-sans','DM Sans','"DM Sans", "Segoe UI", Arial, sans-serif'],['atkinson','Atkinson Hyperlegible','"Atkinson Hyperlegible Next", "Segoe UI", Arial, sans-serif'],['segoe','Segoe UI','"Segoe UI", Arial, sans-serif'],['system','Sistem UI','system-ui, -apple-system, "Segoe UI", Arial, sans-serif'],['arial','Arial','Arial, Helvetica, sans-serif'],['verdana','Verdana','Verdana, Geneva, sans-serif'],['tahoma','Tahoma','Tahoma, Geneva, sans-serif'],['trebuchet','Trebuchet MS','"Trebuchet MS", Arial, sans-serif'],['calibri','Calibri','Calibri, "Segoe UI", Arial, sans-serif'],['manrope','Manrope','Manrope, "Segoe UI", Arial, sans-serif']];
const getSaved=()=>{try{const id=localStorage.getItem(STORAGE_KEY);return FONTS.some(x=>x[0]===id)?id:'dm-sans'}catch{return'dm-sans'}};
const applyFont=id=>{const font=FONTS.find(x=>x[0]===id)||FONTS[0];document.documentElement.style.setProperty('--app-font',font[2]);document.documentElement.dataset.font=font[0];try{localStorage.setItem(STORAGE_KEY,font[0])}catch{}};
const findReport=actions=>[...(actions?.querySelectorAll('button')||[])].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));

export default function FontSwitcher(){
 const[selected,setSelected]=useState(getSaved),[open,setOpen]=useState(false),[target,setTarget]=useState(null),ref=useRef(null);
 const current=FONTS.find(x=>x[0]===selected)||FONTS[0];
 useEffect(()=>applyFont(selected),[selected]);
 useEffect(()=>{const outside=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',outside);return()=>document.removeEventListener('mousedown',outside)},[]);
 useEffect(()=>{
  let frame;
  const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const actions=document.querySelector('.v7-header .header-actions'),report=findReport(actions);
   if(!actions||!report){setTarget(null);return}
   [...actions.children].forEach(el=>{if(!el.classList.contains('header-font-switcher'))el.style.order=''});
   const native=[...actions.children].filter(el=>!el.classList.contains('header-font-switcher'));
   const idx=native.indexOf(report);
   if(idx<0){setTarget(null);return}
   native.slice(idx).forEach((el,i)=>{el.style.order=String(100+i)});
   setTarget(actions);
  })};
  sync();
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',sync);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',sync);const actions=document.querySelector('.v7-header .header-actions');actions&&[...actions.children].forEach(el=>{el.style.order=''})};
 },[]);
 if(!target)return null;
 return createPortal(<div className="font-switcher header-font-switcher" ref={ref} style={{order:99}}><button type="button" className="btn secondary font-trigger" onClick={()=>setOpen(x=>!x)} title={`Yazı fontu: ${current[1]}`} aria-label={`Yazı fontunu değiştir. Seçili: ${current[1]}`}><span className="font-aa">Aa</span></button>{open&&<div className="font-panel" role="menu" aria-label="Yazı fontları">{FONTS.map(([id,name,stack])=><button key={id} type="button" className={selected===id?'active':''} style={{'--preview-font':stack}} onClick={()=>{setSelected(id);setOpen(false)}}><span>{name}</span>{selected===id&&<b>✓</b>}</button>)}</div>}</div>,target);
}
