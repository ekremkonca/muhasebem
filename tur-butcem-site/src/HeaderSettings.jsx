import React,{useEffect,useRef,useState} from 'react';
import './styles/navigation-settings.css';
export default function HeaderSettings({children}){
 const[open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{const close=e=>{if(e.key==='Escape'||(e.type==='pointerdown'&&!ref.current?.contains(e.target)))setOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close)}},[]);
 return <div className="unified-settings" ref={ref}><button className="icon-btn unified-settings-trigger" type="button" aria-label="Kur güncellemesi ve araçlar" aria-expanded={open} onClick={()=>setOpen(!open)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.6-2.5L20 8"/><path d="M17.9 15a7 7 0 0 1-11.6 2.5L4 16"/></svg></button><div className="unified-settings-panel" hidden={!open}><strong>Tema ve görünüm</strong>{children}</div></div>
}
