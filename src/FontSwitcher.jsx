import React,{useEffect,useRef,useState}from'react';
import'./font-switcher.css';

const STORAGE_KEY='muhasebe-ui-font';
const FONTS=[
 ['dm-sans','DM Sans','"DM Sans", "Segoe UI", Arial, sans-serif'],
 ['atkinson','Atkinson Hyperlegible','"Atkinson Hyperlegible Next", "Segoe UI", Arial, sans-serif'],
 ['segoe','Segoe UI','"Segoe UI", Arial, sans-serif'],
 ['system','Sistem UI','system-ui, -apple-system, "Segoe UI", Arial, sans-serif'],
 ['arial','Arial','Arial, Helvetica, sans-serif'],
 ['verdana','Verdana','Verdana, Geneva, sans-serif'],
 ['tahoma','Tahoma','Tahoma, Geneva, sans-serif'],
 ['trebuchet','Trebuchet MS','"Trebuchet MS", Arial, sans-serif'],
 ['calibri','Calibri','Calibri, "Segoe UI", Arial, sans-serif'],
 ['manrope','Manrope','Manrope, "Segoe UI", Arial, sans-serif']
];

const getInitial=()=>{try{const saved=localStorage.getItem(STORAGE_KEY);return FONTS.some(([id])=>id===saved)?saved:'dm-sans'}catch{return'dm-sans'}};
const findReportButton=()=>[...document.querySelectorAll('.v7-header button')].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));

export default function FontSwitcher(){
 const[selected,setSelected]=useState(getInitial),[open,setOpen]=useState(false),[position,setPosition]=useState(null),ref=useRef(null),targetRef=useRef(null);
 const current=FONTS.find(x=>x[0]===selected)||FONTS[0];
 useEffect(()=>{document.documentElement.style.setProperty('--app-font',current[2]);document.documentElement.dataset.font=selected;try{localStorage.setItem(STORAGE_KEY,selected)}catch{}},[selected]);
 useEffect(()=>{const close=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 useEffect(()=>{let frame;const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const assets=location.hash==='#varliklar-fon',report=findReportButton(),header=document.querySelector('.v7-header');if(targetRef.current&&targetRef.current!==report)targetRef.current.style.marginLeft='';if(assets){if(report)report.style.marginLeft='';targetRef.current=null;const target=document.querySelector('.assets-page-title');if(!target||target.offsetParent===null){setPosition(null);setOpen(false);return}const r=target.getBoundingClientRect();setPosition({left:r.right+46,top:r.top+Math.max(0,(r.height-38)/2),height:38,mode:'assets'});return}targetRef.current=report||null;if(!report||!header||header.hidden||report.offsetParent===null){if(report)report.style.marginLeft='';setPosition(null);setOpen(false);return}if(report.style.marginLeft!=='46px')report.style.marginLeft='46px';const r=report.getBoundingClientRect();setPosition({left:r.left-8,top:r.top,height:r.height,mode:'main'})})};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});window.addEventListener('hashchange',place);window.addEventListener('popstate',place);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place);window.removeEventListener('hashchange',place);window.removeEventListener('popstate',place);if(targetRef.current)targetRef.current.style.marginLeft=''}},[]);
 if(!position)return null;
 return <div className={`font-switcher${position.mode==='assets'?' assets-font-mode':''}`} ref={ref} style={{left:position.left,top:position.top,height:position.height}}><button type="button" className="btn secondary font-trigger" onClick={()=>setOpen(x=>!x)} title={`Yazı fontu: ${current[1]}`} aria-label={`Yazı fontunu değiştir. Seçili: ${current[1]}`}><span className="font-aa">Aa</span></button>{open&&<div className="font-panel" role="menu" aria-label="Yazı fontları">{FONTS.map(([id,name,stack])=><button key={id} type="button" className={selected===id?'active':''} style={{'--preview-font':stack}} onClick={()=>{setSelected(id);setOpen(false)}}><span>{name}</span>{selected===id&&<b>✓</b>}</button>)}</div>}</div>;
}
