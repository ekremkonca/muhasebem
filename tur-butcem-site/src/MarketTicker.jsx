import React,{useEffect,useMemo,useState}from'react';

export const MARKET_CATALOG=[
 ['USDTRY','USD / TL'],['EURTRY','EUR / TL'],['GBPTRY','GBP / TL'],['GOLD','Ons Altın'],
 ['BTCUSD','Bitcoin'],['ETHUSD','Ethereum'],['SOLUSD','Solana'],['BNBUSD','BNB'],
 ['XU100','BIST 100'],['BRENT','Brent Petrol']
];
const STORAGE_KEY='muhasebe-market-symbols-v2';
const DEFAULT_SYMBOLS=['USDTRY','EURTRY','BTCUSD','ETHUSD'];
const allowed=new Set(MARKET_CATALOG.map(([id])=>id));
const initialSymbols=()=>{try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(Array.isArray(saved)){const clean=[...new Set(saved.filter(id=>allowed.has(id)))];if(clean.length)return clean}}catch{}return DEFAULT_SYMBOLS};
const number=(value,digits=2)=>Number(value).toLocaleString('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const digits=value=>Math.abs(Number(value))>=1000?2:Math.abs(Number(value))>=10?3:4;

export default function MarketTicker(){
 const[symbols,setSymbols]=useState(initialSymbols),[quotes,setQuotes]=useState({}),[open,setOpen]=useState(false),[status,setStatus]=useState('loading'),[updatedAt,setUpdatedAt]=useState('');
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(symbols))}catch{}},[symbols]);
 useEffect(()=>{
  let timer,cancelled=false;
  const load=async()=>{try{setStatus(current=>Object.keys(quotes).length?current:'loading');const response=await fetch(`/api/markets?symbols=${encodeURIComponent(symbols.join(','))}`,{cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json?.error||'Piyasa verisi alınamadı.');if(cancelled)return;setQuotes(current=>({...current,...Object.fromEntries((json.quotes||[]).map(item=>[item.symbol,item]))}));setUpdatedAt(json.fetchedAt||new Date().toISOString());setStatus('live')}catch{if(!cancelled)setStatus(current=>Object.keys(quotes).length?'stale':'error')}};
  load();timer=setInterval(load,60000);return()=>{cancelled=true;clearInterval(timer)};
 },[symbols.join(',')]);
 const items=useMemo(()=>symbols.map(id=>{const meta=MARKET_CATALOG.find(([key])=>key===id);return{id,label:meta?.[1]||id,...quotes[id]}}),[symbols,quotes]);
 const add=id=>{if(!allowed.has(id)||symbols.includes(id)||symbols.length>=10)return;setSymbols(current=>[...current,id])};
 const remove=id=>setSymbols(current=>current.filter(item=>item!==id));
 const copies=[0,1];
 return <section className="market-ticker-host native-market" aria-label="Canlı piyasa bandı">
  <div className="market-ticker-toolbar"><span className={`market-live-state ${status}`}><i/>{status==='live'?'CANLI':status==='error'?'BAĞLANTI':'GÜNCELLENİYOR'}</span><button type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}>＋ Ekle / Kaldır <b>{symbols.length}/10</b></button></div>
  <div className="native-market-viewport"><div className="native-market-track" style={{'--market-width':`${Math.max(920,items.length*230)}px`,'--market-speed':`${Math.max(28,items.length*6)}s`}}>{copies.map(copy=><div className="native-market-copy" key={copy}>{items.map(item=>{const change=Number(item.changePercent);const ready=Number.isFinite(Number(item.price));return <article className="native-market-card" key={`${copy}-${item.id}`}><div><strong>{item.symbol}</strong><small>{item.label}</small></div><div className="native-market-value"><b>{ready?number(item.price,digits(item.price)):'—'}</b><span className={change>0?'up':change<0?'down':'flat'}>{ready?`${change>0?'+':''}${number(change,2)}%`:'Bekleniyor'}</span></div></article>})}</div>)}</div></div>
  {open&&<div className="market-ticker-settings native-market-settings"><header><div><strong>Piyasa bandını düzenle <em>{symbols.length}/10</em></strong><small>Eklemek veya kaldırmak için ürüne dokun.</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Kapat">×</button></header><div className="native-market-picker">{MARKET_CATALOG.map(([id,label])=>{const selected=symbols.includes(id);return <button type="button" key={id} className={selected?'selected':''} onClick={()=>selected?remove(id):add(id)} disabled={!selected&&symbols.length>=10}><span><b>{id}</b><small>{label}</small></span><strong>{selected?'Kaldır':'Ekle'}</strong></button>})}</div><footer><span>{updatedAt?`Son güncelleme ${new Date(updatedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}`:'Veri bekleniyor'}</span><button type="button" onClick={()=>setSymbols(DEFAULT_SYMBOLS)}>Varsayılanlar</button></footer></div>}
 </section>
}
