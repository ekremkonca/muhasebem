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

export default function FontSwitcher(){
 const[selected,setSelected]=useState(getInitial),[open,setOpen]=useState(false),ref=useRef(null);
 const current=FONTS.find(x=>x[0]===selected)||FONTS[0];
 useEffect(()=>{document.documentElement.style.setProperty('--app-font',current[2]);document.documentElement.dataset.font=selected;try{localStorage.setItem(STORAGE_KEY,selected)}catch{}},[selected]);
 useEffect(()=>{const close=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 return <div className="font-switcher" ref={ref}><button type="button" className="btn secondary font-trigger" onClick={()=>setOpen(x=>!x)} title="Yazı fontunu değiştir"><span className="font-aa">Aa</span><span className="font-name">{current[1]}</span><span className="font-caret">⌄</span></button>{open&&<div className="font-panel" role="menu" aria-label="Yazı fontları">{FONTS.map(([id,name,stack])=><button key={id} type="button" className={selected===id?'active':''} style={{fontFamily:stack}} onClick={()=>{setSelected(id);setOpen(false)}}><span>{name}</span>{selected===id&&<b>✓</b>}</button>)}</div>}</div>;
}
