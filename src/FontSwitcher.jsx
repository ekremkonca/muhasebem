import React,{useEffect,useRef,useState}from'react';
import'./font-switcher.css';

const STORAGE_KEY='muhasebe-ui-font';
const FONTS=[
 ['manrope','Manrope','Manrope, "Segoe UI", Arial, sans-serif'],
 ['inter','Inter','Inter, "Segoe UI", Arial, sans-serif'],
 ['segoe','Segoe UI','"Segoe UI", Arial, sans-serif'],
 ['arial','Arial','Arial, Helvetica, sans-serif'],
 ['helvetica','Helvetica','Helvetica, Arial, sans-serif'],
 ['verdana','Verdana','Verdana, Geneva, sans-serif'],
 ['tahoma','Tahoma','Tahoma, Geneva, sans-serif'],
 ['trebuchet','Trebuchet MS','"Trebuchet MS", Arial, sans-serif'],
 ['calibri','Calibri','Calibri, "Segoe UI", sans-serif'],
 ['century','Century Gothic','"Century Gothic", Arial, sans-serif'],
 ['franklin','Franklin Gothic','"Franklin Gothic Medium", Arial, sans-serif'],
 ['georgia','Georgia','Georgia, "Times New Roman", serif'],
 ['times','Times New Roman','"Times New Roman", Times, serif'],
 ['garamond','Garamond','Garamond, Georgia, serif'],
 ['cambria','Cambria','Cambria, Georgia, serif'],
 ['palatino','Palatino','"Palatino Linotype", Palatino, serif'],
 ['book','Book Antiqua','"Book Antiqua", Palatino, serif'],
 ['courier','Courier New','"Courier New", Courier, monospace']
];

const getInitial=()=>{try{return localStorage.getItem(STORAGE_KEY)||'manrope'}catch{return'manrope'}};
const findReportButton=()=>[...document.querySelectorAll('.v7-header button')].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));

export default function FontSwitcher(){
 const[selected,setSelected]=useState(getInitial),[open,setOpen]=useState(false),[position,setPosition]=useState(null),ref=useRef(null);
 const current=FONTS.find(x=>x[0]===selected)||FONTS[0];
 useEffect(()=>{document.documentElement.style.setProperty('--app-font',current[2]);document.documentElement.dataset.font=selected;try{localStorage.setItem(STORAGE_KEY,selected)}catch{}},[selected]);
 useEffect(()=>{const close=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 useEffect(()=>{let frame;const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const target=findReportButton(),header=document.querySelector('.v7-header');if(!target||!header||header.hidden||location.hash==='#varliklar-fon'||target.offsetParent===null){setPosition(null);setOpen(false);return}const r=target.getBoundingClientRect();setPosition({left:r.left,top:r.top,height:r.height})})};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','style','class']});window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});window.addEventListener('hashchange',place);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place);window.removeEventListener('hashchange',place)}},[]);
 if(!position)return null;
 return <div className="font-switcher" ref={ref} style={{left:position.left,top:position.top,height:position.height}}><button type="button" className="btn secondary font-trigger" onClick={()=>setOpen(x=>!x)} title="Yazı fontunu değiştir"><span className="font-aa">Aa</span><span className="font-name">{current[1]}</span><span className="font-caret">⌄</span></button>{open&&<div className="font-panel" role="menu" aria-label="Yazı fontları">{FONTS.map(([id,name,stack])=><button key={id} type="button" className={selected===id?'active':''} style={{'--preview-font':stack}} onClick={()=>{setSelected(id);setOpen(false)}}><span>{name}</span>{selected===id&&<b>✓</b>}</button>)}</div>}</div>;
}
