import{errorResponse,getDb,json,requireSession}from'../_lib.js';

const CATALOG={
 USDTRY:{query:'USDTRY=X',label:'USD / TL'},EURTRY:{query:'EURTRY=X',label:'EUR / TL'},GBPTRY:{query:'GBPTRY=X',label:'GBP / TL'},GOLD:{query:'GC=F',label:'Ons Altın'},
 BTCUSD:{query:'BTC-USD',label:'Bitcoin'},ETHUSD:{query:'ETH-USD',label:'Ethereum'},SOLUSD:{query:'SOL-USD',label:'Solana'},BNBUSD:{query:'BNB-USD',label:'BNB'},
 XU100:{query:'%5EXU100',label:'BIST 100'},BRENT:{query:'BZ=F',label:'Brent Petrol'}
};
const quote=async(symbol)=>{
 const meta=CATALOG[symbol];
 const response=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${meta.query}?range=5d&interval=1d`,{headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});
 if(!response.ok)throw new Error(`${symbol} HTTP ${response.status}`);
 const result=(await response.json())?.chart?.result?.[0];
 const values=(result?.indicators?.quote?.[0]?.close||[]).filter(value=>Number.isFinite(Number(value))).map(Number);
 const price=Number(result?.meta?.regularMarketPrice??values.at(-1));
 const previous=Number(result?.meta?.chartPreviousClose??values.at(-2));
 if(!Number.isFinite(price))throw new Error(`${symbol} fiyatı bulunamadı`);
 return{symbol,label:meta.label,price,changePercent:Number.isFinite(previous)&&previous?((price/previous)-1)*100:0,currency:result?.meta?.currency||'',marketTime:result?.meta?.regularMarketTime||null};
};
export async function onRequestGet(context){try{const db=await getDb(context);await requireSession(context,db);const url=new URL(context.request.url);const requested=[...new Set((url.searchParams.get('symbols')||'').split(',').map(value=>value.trim().toUpperCase()).filter(value=>CATALOG[value]))].slice(0,10);if(!requested.length)return json({quotes:[],fetchedAt:new Date().toISOString()});const settled=await Promise.allSettled(requested.map(quote));const quotes=settled.filter(item=>item.status==='fulfilled').map(item=>item.value);if(!quotes.length)throw new Error('Piyasa kaynaklarına ulaşılamadı.');return json({quotes,fetchedAt:new Date().toISOString(),partial:quotes.length!==requested.length},200,{'cache-control':'private, max-age=30'})}catch(error){return errorResponse(error,'Canlı piyasa verileri alınamadı.')}}
