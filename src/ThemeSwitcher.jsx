import React,{useEffect,useRef,useState}from'react';
import'./styles/themes.css';
import'./styles/neon-calendar-fix.css';
import'./styles/privacy.css';

const THEMES=[
 ['emerald','Zümrüt','#00a86b'],
 ['ocean','Okyanus','#008cff'],
 ['royal','Kraliyet','#315cff'],
 ['violet','Mor Neon','#8b5cf6'],
 ['fuchsia','Fuşya','#e83e8c'],
 ['coral','Mercan','#ff6b4a'],
 ['sunset','Günbatımı','#ff8a00'],
 ['neon','Gece Neon','#00b8df']
];
const THEME_KEY='muhasebe-theme';
const MODE_KEY='muhasebe-color-mode';
const PRIVACY_KEY='muhasebe-balances-hidden';
const THEME_EVENT='muhasebe:theme-change';
const MODE_EVENT='muhasebe:mode-change';
const MONEY_RE=/-?(?:(?:₺|\$|€|£)\s*\d[\d.\u00a0\u202f ]*(?:,\d{1,6})?|\d[\d.\u00a0\u202f ]*(?:,\d{1,6})?\s*(?:TL|₺|\$|€|£))/gi;
let privacyObserver=null;
const originals=new Map();

const getInitialTheme=()=>{try{const saved=localStorage.getItem(THEME_KEY);return THEMES.some(([id])=>id===saved)?saved:'emerald'}catch{return'emerald'}};
const getInitialMode=()=>{try{return localStorage.getItem(MODE_KEY)==='dark'?'dark':'light'}catch{return'light'}};
const skipped=node=>Boolean(node?.parentElement?.closest('script,style,input,textarea,select,option,.privacy-trigger'));
const hasMoney=text=>{MONEY_RE.lastIndex=0;return MONEY_RE.test(text||'')};
const maskText=node=>{if(!node||node.nodeType!==Node.TEXT_NODE||skipped(node)||!hasMoney(node.data))return;originals.set(node,node.data);MONEY_RE.lastIndex=0;node.data=node.data.replace(MONEY_RE,'••••')};
const maskTree=root=>{if(!root)return;if(root.nodeType===Node.TEXT_NODE){maskText(root);return}const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))maskText(node)};
const startPrivacy=()=>{document.documentElement.dataset.balances='hidden';maskTree(document.body);privacyObserver?.disconnect();privacyObserver=new MutationObserver(mutations=>{privacyObserver?.disconnect();for(const mutation of mutations){if(mutation.type==='characterData'){const node=mutation.target;if(hasMoney(node.data)){originals.set(node,node.data);maskText(node)}}else{mutation.addedNodes.forEach(maskTree)}}privacyObserver?.observe(document.body,{subtree:true,childList:true,characterData:true})});privacyObserver.observe(document.body,{subtree:true,childList:true,characterData:true})};
const stopPrivacy=()=>{privacyObserver?.disconnect();privacyObserver=null;document.documentElement.dataset.balances='visible';for(const[node,value]of originals){if(node.isConnected)node.data=value}originals.clear()};

function EyeIcon({hidden}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{hidden?<><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.6 4.2 9.5 6-.5 1-1.5 2.5-3 3.8"/><path d="M6.2 6.3C4.4 7.6 3.2 9.4 2.5 11c.9 1.8 4.3 6 9.5 6 1.2 0 2.3-.2 3.3-.6"/></>:<><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></>}</svg>}
function ModeIcon({dark}){return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{dark?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>:<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8z"/>}</svg>}

export default function ThemeSwitcher(){
 const[theme,setTheme]=useState(getInitialTheme),[mode,setMode]=useState(getInitialMode),[open,setOpen]=useState(false),[hidden,setHidden]=useState(()=>{try{return localStorage.getItem(PRIVACY_KEY)==='1'}catch{return false}}),ref=useRef();
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem(THEME_KEY,theme)}catch{}window.dispatchEvent(new CustomEvent(THEME_EVENT,{detail:theme}))},[theme]);
 useEffect(()=>{document.documentElement.dataset.mode=mode;try{localStorage.setItem(MODE_KEY,mode)}catch{}window.dispatchEvent(new CustomEvent(MODE_EVENT,{detail:mode}))},[mode]);
 useEffect(()=>{const onTheme=e=>e.detail&&e.detail!==theme&&setTheme(e.detail);const onMode=e=>e.detail&&e.detail!==mode&&setMode(e.detail);window.addEventListener(THEME_EVENT,onTheme);window.addEventListener(MODE_EVENT,onMode);return()=>{window.removeEventListener(THEME_EVENT,onTheme);window.removeEventListener(MODE_EVENT,onMode)}},[theme,mode]);
 useEffect(()=>{const close=e=>!ref.current?.contains(e.target)&&setOpen(false);document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 useEffect(()=>{try{localStorage.setItem(PRIVACY_KEY,hidden?'1':'0')}catch{}hidden?startPrivacy():stopPrivacy();return()=>{privacyObserver?.disconnect()}},[hidden]);
 const current=THEMES.find(x=>x[0]===theme)||THEMES[0],dark=mode==='dark';
 return <div className="theme-menu" ref={ref}><button className="theme-trigger" type="button" onClick={()=>setOpen(x=>!x)}><i style={{'--theme-dot':current[2]}}/>{current[1]}<span>⌄</span></button><button className={`mode-trigger${dark?' active':''}`} type="button" onClick={()=>setMode(dark?'light':'dark')} title={dark?'Açık moda geç':'Gece moduna geç'} aria-pressed={dark}><ModeIcon dark={dark}/><span>{dark?'Açık Mod':'Gece Modu'}</span></button><button className={`privacy-trigger${hidden?' active':''}`} type="button" onClick={()=>setHidden(x=>!x)} title={hidden?'Bakiyeleri göster':'Bakiyeleri gizle'} aria-label={hidden?'Bakiyeleri göster':'Bakiyeleri gizle'} aria-pressed={hidden}><EyeIcon hidden={hidden}/></button>{open&&<div className="theme-panel">{THEMES.map(([id,name,color])=><button key={id} type="button" className={theme===id?'active':''} onClick={()=>{setTheme(id);setOpen(false)}}><i style={{'--theme-dot':color}}/>{name}</button>)}</div>}</div>
}
