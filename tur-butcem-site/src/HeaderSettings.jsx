import React,{useEffect,useRef,useState} from 'react';
import './styles/navigation-settings.css';
export default function HeaderSettings({children}){
 const[open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{const close=e=>{if(e.key==='Escape'||(e.type==='pointerdown'&&!ref.current?.contains(e.target)))setOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close)}},[]);
 return <div className="unified-settings" ref={ref}><button className="icon-btn unified-settings-trigger" type="button" aria-label="Tema ve görünüm araçları" aria-expanded={open} onClick={()=>setOpen(!open)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 3 3-1 1-3 3-1 2-3-2-2 1-3-3-2-3 1-2-3z"/><circle cx="12" cy="11" r="3"/></svg></button><div className="unified-settings-panel" hidden={!open}><strong>Tema ve görünüm</strong>{children}</div></div>
}
