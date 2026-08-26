import React,{useEffect,useMemo,useState}from'react';
import App from'./App.jsx';
import AssetsNav from'./AssetsNav.jsx';
import AssetsHeaderBridge from'./AssetsHeaderBridge.jsx';
import CalendarView from'./CalendarView.jsx';
import FontSwitcher from'./FontSwitcher.jsx';
import HomePage from'./HomePage.jsx';
import{getAuthState,loadRecords,login,setupPin}from'./api.js';
import'./pages.css';

const cleanPath=value=>{let p=(value||'/').replace(/\/+$/,'')||'/';if(p.endsWith('.html'))p=p.slice(0,-5)||'/';return p};
const go=path=>window.location.assign(path);

function CalendarAuth({configured,onDone}){
 const[pin,setPin]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setError('');if(!/^\d{4,8}$/.test(pin)){setError('PIN 4-8 rakam olmalı.');return}if(!configured&&pin!==confirm){setError('PIN doğrulaması eşleşmiyor.');return}setBusy(true);try{configured?await login(pin):await setupPin(pin);onDone()}catch(err){setError(err.message||'Giriş yapılamadı.')}finally{setBusy(false)}};
 return <div className="auth-shell"><form className="auth-card" onSubmit={submit}><span className="eyebrow">TAKVİM EXTRA</span><h1>{configured?'Giriş':'İlk güvenlik kurulumu'}</h1><p>{configured?'Takvim kayıtlarını görmek için PIN gir.':'4-8 rakamlı PIN oluştur.'}</p><label>PIN<input type="password" inputMode="numeric" pattern="[0-9]*" maxLength="8" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} autoFocus/></label>{!configured&&<label>PIN tekrar<input type="password" inputMode="numeric" pattern="[0-9]*" maxLength="8" value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,''))}/></label>}{error&&<p className="auth-error">{error}</p>}<button className="btn primary auth-submit" disabled={busy}>{busy?'Kontrol ediliyor...':configured?'Giriş yap':'PIN’i oluştur'}</button></form></div>;
}

function TakvimPage(){
 const[state,setState]=useState({loading:true,configured:false,authenticated:false});
 const[rows,setRows]=useState([]),[error,setError]=useState('');
 const load=async()=>{setError('');try{setRows(await loadRecords())}catch(err){setError(err.message||'Takvim kayıtları yüklenemedi.')}};
 useEffect(()=>{getAuthState().then(s=>setState({loading:false,...s})).catch(()=>setState({loading:false,configured:false,authenticated:false}))},[]);
 useEffect(()=>{if(state.authenticated)load()},[state.authenticated]);
 if(state.loading)return <div className="auth-shell"><div className="auth-card"><h2>Yükleniyor...</h2></div></div>;
 if(!state.authenticated)return <CalendarAuth configured={state.configured} onDone={()=>setState(s=>({...s,configured:true,authenticated:true}))}/>;
 return <><header className="v7-header standalone-page-header"><div className="brand"><strong>Takvim <small>EXTRA</small></strong></div><div className="header-actions"><button className="btn secondary" onClick={()=>go('/anasayfa/')}>Ana Sayfa</button><button className="btn secondary" onClick={()=>go('/muhasebe/')}>Muhasebe</button><button className="btn secondary" onClick={()=>go('/varliklar/')}>Varlıklar / Fon</button></div></header><main className="standalone-calendar-page">{error&&<p className="system-error">{error}</p>}<CalendarView rows={rows}/></main></>;
}

function VarliklarPage(){
 useEffect(()=>{
  let activated=false;
  const activate=()=>{
   if(activated)return;
   const button=document.querySelector('.assets-nav-button');
   if(!button)return;
   activated=true;
   button.click();
   setTimeout(()=>history.replaceState(history.state,'','/varliklar/'),0);
  };
  const intercept=e=>{
   if(!e.target.closest?.('.assets-back'))return;
   e.preventDefault();
   e.stopPropagation();
   go('/muhasebe/');
  };
  const observer=new MutationObserver(activate);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true});
  document.addEventListener('click',intercept,true);
  activate();
  return()=>{observer.disconnect();document.removeEventListener('click',intercept,true)};
 },[]);
 return <><App/><AssetsNav/><FontSwitcher/><AssetsHeaderBridge/></>;
}

function MuhasebePage(){return <><App/><FontSwitcher/></>}
function RedirectHome(){useEffect(()=>{window.location.replace('/anasayfa/')},[]);return null}

export default function SiteRouter(){
 const path=useMemo(()=>cleanPath(window.location.pathname),[]);
 if(path==='/anasayfa')return <HomePage/>;
 if(path==='/muhasebe')return <MuhasebePage/>;
 if(path==='/varliklar')return <VarliklarPage/>;
 if(path==='/takvim')return <TakvimPage/>;
 return <RedirectHome/>;
}
