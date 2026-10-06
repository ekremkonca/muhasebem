import React,{useEffect,useMemo,useState}from'react';

export const MARKET_CATALOG=[
 ['BTCUSDT','Bitcoin / Tether'],['GBPTRY','GBP / TL'],['USDTRY','USD / TL'],
 ['EURTRY','EUR / TL'],['XAUUSD','Ons Altın / USD']
];
const SYMBOLS=MARKET_CATALOG.map(([id])=>id);
const number=(value,digits=2)=>Number(value).toLocaleString('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const digits=value=>Math.abs(Number(value))>=1000?2:Math.abs(Number(value))>=10?3:4;

export default function MarketTicker(){
 const[quotes,setQuotes]=useState({}),[status,setStatus]=useState('loading');
 useEffect(()=>{
  let timer,cancelled=false;
  const load=async()=>{try{setStatus(current=>Object.keys(quotes).length?current:'loading');const response=await fetch(`/api/markets?symbols=${encodeURIComponent(SYMBOLS.join(','))}`,{cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json?.error||'Piyasa verisi alınamadı.');if(cancelled)return;setQuotes(current=>({...current,...Object.fromEntries((json.quotes||[]).map(item=>[item.symbol,item]))}));setStatus('live')}catch{if(!cancelled)setStatus(current=>Object.keys(quotes).length?'stale':'error')}};
  load();timer=setInterval(load,60000);return()=>{cancelled=true;clearInterval(timer)};
 },[]);
 const items=useMemo(()=>SYMBOLS.map(id=>{const meta=MARKET_CATALOG.find(([key])=>key===id);return{id,label:meta?.[1]||id,...quotes[id]}}),[quotes]);
 const copies=[0,1];
 return <section className="market-ticker-host native-market" aria-label="Canlı piyasa bandı">
  <div className="market-ticker-toolbar"><span className={`market-live-state ${status}`}><i/>{status==='live'?'CANLI':status==='error'?'BAĞLANTI':'GÜNCELLENİYOR'}</span></div>
  <div className="native-market-viewport"><div className="native-market-track" style={{'--market-width':`${Math.max(920,items.length*230)}px`,'--market-speed':`${Math.max(28,items.length*6)}s`}}>{copies.map(copy=><div className="native-market-copy" key={copy}>{items.map(item=>{const change=Number(item.changePercent);const ready=Number.isFinite(Number(item.price));return <article className="native-market-card" key={`${copy}-${item.id}`}><div><strong>{item.symbol}</strong><small>{item.label}</small></div><div className="native-market-value"><b>{ready?number(item.price,digits(item.price)):'—'}</b><span className={change>0?'up':change<0?'down':'flat'}>{ready?`${change>0?'+':''}${number(change,2)}%`:'Bekleniyor'}</span></div></article>})}</div>)}</div></div>
 </section>
}
