import React,{useEffect,useMemo,useRef,useState}from'react';

const relativeTime=value=>{
 const diff=Math.max(0,Date.now()-new Date(value).getTime()),minutes=Math.floor(diff/60000);
 if(minutes<1)return'Şimdi';if(minutes<60)return`${minutes} dk önce`;
 const hours=Math.floor(minutes/60);if(hours<24)return`${hours} sa önce`;
 return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short'}).format(new Date(value));
};
const clockTime=value=>new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(value);

function TradingViewWidget({script,config,className=''}){
 const host=useRef(null);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  node.replaceChildren();
  const container=document.createElement('div');container.className='tradingview-widget-container';container.style.height='100%';container.style.width='100%';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.height='100%';widget.style.width='100%';container.appendChild(widget);
  const loader=document.createElement('script');loader.src=`https://s3.tradingview.com/external-embedding/${script}`;loader.async=true;loader.type='text/javascript';loader.textContent=JSON.stringify(config);container.appendChild(loader);node.appendChild(container);
  return()=>node.replaceChildren();
 },[script,JSON.stringify(config)]);
 return <div ref={host} className={`tradingview-host ${className}`}/>;
}

function useColorMode(){
 const[mode,setMode]=useState(()=>document.documentElement.dataset.mode==='dark'?'dark':'light');
 useEffect(()=>{const observer=new MutationObserver(()=>setMode(document.documentElement.dataset.mode==='dark'?'dark':'light'));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-mode']});return()=>observer.disconnect()},[]);
 return mode;
}

export default function HomeDashboard(){
 const[news,setNews]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[updatedAt,setUpdatedAt]=useState(null),[now,setNow]=useState(new Date()),mode=useColorMode();
 const refresh=async()=>{setError('');try{const response=await fetch(`/api/news?_=${Date.now()}`,{cache:'no-store'}),json=await response.json();if(!response.ok)throw new Error(json?.error||'Haber akışı alınamadı.');setNews(Array.isArray(json.items)?json.items:[]);setUpdatedAt(json.updatedAt||new Date().toISOString())}catch(err){setError(err.message||'Haber akışı alınamadı.')}finally{setLoading(false)}};
 useEffect(()=>{refresh();const newsTimer=setInterval(refresh,60*1000),clockTimer=setInterval(()=>setNow(new Date()),1000);return()=>{clearInterval(newsTimer);clearInterval(clockTimer)}},[]);
 const visible=useMemo(()=>news.filter(item=>filter==='all'||item.region===filter).slice(0,30),[news,filter]);
 const tvTheme=mode==='dark'?'dark':'light';
 const tickerConfig={symbols:[{proName:'BIST:XU100',title:'BIST 100'},{proName:'FX_IDC:USDTRY',title:'USD/TRY'},{proName:'OANDA:XAUUSD',title:'ALTIN'},{proName:'BINANCE:BTCUSDT',title:'BITCOIN'},{proName:'FOREXCOM:SPXUSD',title:'S&P 500'},{proName:'NASDAQ:NDX',title:'NASDAQ 100'}],showSymbolLogo:true,isTransparent:true,displayMode:'adaptive',colorTheme:tvTheme,locale:'tr'};
 const overviewConfig={colorTheme:tvTheme,dateRange:'1D',showChart:true,locale:'tr',largeChartUrl:'',isTransparent:true,showSymbolLogo:true,showFloatingTooltip:false,width:'100%',height:'100%',tabs:[{title:'Türkiye',symbols:[{s:'BIST:XU100',d:'BIST 100'},{s:'BIST:XU030',d:'BIST 30'},{s:'FX_IDC:USDTRY',d:'Dolar / TL'},{s:'FX_IDC:EURTRY',d:'Euro / TL'},{s:'FX_IDC:XAUTRYG',d:'Gram Altın'}]},{title:'ABD',symbols:[{s:'FOREXCOM:SPXUSD',d:'S&P 500'},{s:'NASDAQ:NDX',d:'Nasdaq 100'},{s:'DJ:DJI',d:'Dow Jones'},{s:'NASDAQ:AAPL',d:'Apple'},{s:'NASDAQ:NVDA',d:'Nvidia'}]},{title:'Kripto',symbols:[{s:'BINANCE:BTCUSDT',d:'Bitcoin'},{s:'BINANCE:ETHUSDT',d:'Ethereum'},{s:'BINANCE:SOLUSDT',d:'Solana'},{s:'BINANCE:XRPUSDT',d:'XRP'}]},{title:'Emtia',symbols:[{s:'OANDA:XAUUSD',d:'Ons Altın'},{s:'OANDA:XAGUSD',d:'Gümüş'},{s:'TVC:USOIL',d:'WTI Petrol'},{s:'TVC:UKOIL',d:'Brent Petrol'}]}]};
 return <main className="home-market-dashboard">
  <section className="market-welcome"><div><span className="live-kicker"><i/> CANLI EKONOMİ MASASI</span><h1>Piyasalar ve son dakika haberleri</h1><p>Türkiye ve dünyadan güvenilir ekonomi kaynakları, tek ekranda ve otomatik yenilenen akışta.</p></div><div className="market-clock"><span>İstanbul</span><strong>{clockTime(now)}</strong><small>{new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'2-digit',month:'long'}).format(now)}</small></div></section>
  <section className="home-ticker-card" aria-label="Canlı piyasa şeridi"><TradingViewWidget script="embed-widget-ticker-tape.js" config={tickerConfig}/></section>
  <div className="market-dashboard-grid">
   <section className="news-panel"><header className="news-panel-head"><div><span className="section-eyebrow">SON DAKİKA</span><h2>Ekonomi Haber Akışı</h2><small>{updatedAt?`Son kontrol ${relativeTime(updatedAt)}`:'Akış hazırlanıyor'}</small></div><button type="button" onClick={refresh} disabled={loading} aria-label="Haberleri yenile">{loading?'Yükleniyor…':'↻ Yenile'}</button></header>
    <div className="news-filters" role="tablist" aria-label="Haber bölgesi"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Tümü</button><button className={filter==='tr'?'active':''} onClick={()=>setFilter('tr')}>Türkiye</button><button className={filter==='world'?'active':''} onClick={()=>setFilter('world')}>Dünya</button><button className={filter==='forum'?'active':''} onClick={()=>setFilter('forum')}>Forumlar</button></div>
    {error&&<div className="news-error">{error} Otomatik olarak tekrar denenecek.</div>}
    <div className="breaking-news-list">{visible.map((item,index)=><a href={item.url} target="_blank" rel="noreferrer" className="breaking-news-row" key={item.id}><span className={`news-rank ${item.region==='forum'?'community':index<3?'hot':''}`}>{item.region==='forum'?'FORUM':index<3?'SON':'•'}</span><span className="news-copy"><strong>{item.title}</strong><small><b>{item.source}</b><time dateTime={item.publishedAt}>{relativeTime(item.publishedAt)}</time></small></span><span className="news-open">↗</span></a>)}{!loading&&!visible.length&&<div className="news-empty">Şu anda bu bölümde yeni haber bulunmuyor.</div>}{loading&&!news.length&&Array.from({length:8},(_,i)=><div className="news-skeleton" key={i}/>)}</div>
   </section>
   <aside className="market-sidebar"><header><div><span className="section-eyebrow">TRADINGVIEW</span><h2>Canlı Piyasalar</h2></div><span className="market-live"><i/> OTOMATİK</span></header><a className="bist-tradingview-link" href="https://tr.tradingview.com/symbols/BIST-XU100/" target="_blank" rel="noreferrer"><span><b>BIST 100 · TradingView</b><small>Son kapanış ve piyasa açılışındaki canlı veri</small></span><strong>TradingView'de aç ↗</strong></a><div className="market-overview-host"><TradingViewWidget script="embed-widget-market-overview.js" config={overviewConfig}/></div><p className="market-disclaimer">Widget verileri doğrudan TradingView’den gelir ve piyasa açıldığında otomatik güncellenir. BIST fiyatı, TradingView’in üçüncü taraf gösterim lisansı nedeniyle yalnızca TradingView bağlantısında görüntülenebilir.</p></aside>
  </div>
 </main>;
}
