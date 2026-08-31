import React,{useEffect,useMemo,useState}from'react';

const relativeTime=value=>{
 const diff=Math.max(0,Date.now()-new Date(value).getTime()),minutes=Math.floor(diff/60000);
 if(minutes<1)return'Şimdi';if(minutes<60)return`${minutes} dk önce`;
 const hours=Math.floor(minutes/60);if(hours<24)return`${hours} sa önce`;
 return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short'}).format(new Date(value));
};
const clockTime=value=>new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(value);

export default function HomeDashboard(){
 const[news,setNews]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[updatedAt,setUpdatedAt]=useState(null),[now,setNow]=useState(new Date());
 const refresh=async()=>{setLoading(true);setError('');try{const response=await fetch(`/api/news?_=${Date.now()}`,{cache:'no-store'}),json=await response.json();if(!response.ok)throw new Error(json?.error||'Haber akışı alınamadı.');setNews(Array.isArray(json.items)?json.items:[]);setUpdatedAt(json.updatedAt||new Date().toISOString())}catch(err){setError(err.message||'Haber akışı alınamadı.')}finally{setLoading(false)}};
 useEffect(()=>{refresh();const newsTimer=setInterval(refresh,60*1000),clockTimer=setInterval(()=>setNow(new Date()),1000);return()=>{clearInterval(newsTimer);clearInterval(clockTimer)}},[]);
 const visible=useMemo(()=>news.filter(item=>filter==='all'?item.region!=='forum':item.region===filter).slice(0,30),[news,filter]);
 return <main className="home-market-dashboard">
  <section className="clock-only-hero" aria-label="İstanbul saati"><div className="market-clock"><span>İstanbul</span><strong>{clockTime(now)}</strong><small>{new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'2-digit',month:'long'}).format(now)}</small></div></section>
  <section className="news-panel"><header className="news-panel-head"><div><span className="section-eyebrow">CANLI HABER AKIŞI</span><h1>Gündem</h1><small>{updatedAt?`Son kontrol ${relativeTime(updatedAt)}`:'Akış hazırlanıyor'}</small></div><button type="button" onClick={refresh} disabled={loading} aria-label="Haberleri yenile">{loading?'Yükleniyor…':'↻ Yenile'}</button></header>
   <div className="news-filters" role="tablist" aria-label="Haber bölgesi"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Öne çıkanlar</button><button className={filter==='independent'?'active':''} onClick={()=>setFilter('independent')}>Bağımsız kaynaklar</button><button className={filter==='tr'?'active':''} onClick={()=>setFilter('tr')}>Türkiye</button><button className={filter==='world'?'active':''} onClick={()=>setFilter('world')}>Dünya</button></div>
   {error&&<div className="news-error">{error} Otomatik olarak tekrar denenecek.</div>}
   <div className="breaking-news-list">{visible.map((item,index)=><a href={item.url} target="_blank" rel="noreferrer" className="breaking-news-row" key={item.id}><span className={`news-rank ${item.region==='independent'?'independent':index<3?'hot':''}`}>{item.region==='independent'?'X':index<3?'SON':'•'}</span><span className="news-copy"><strong>{item.title}</strong><small><b>{item.source}</b><time dateTime={item.publishedAt}>{relativeTime(item.publishedAt)}</time></small></span><span className="news-open">↗</span></a>)}{!loading&&!visible.length&&<div className="news-empty">Bu bölümde henüz yeni haber bulunmuyor.</div>}{loading&&!news.length&&Array.from({length:8},(_,i)=><div className="news-skeleton" key={i}/>)}</div>
  </section>
 </main>;
}
