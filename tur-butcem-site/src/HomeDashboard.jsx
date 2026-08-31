import React,{useEffect,useMemo,useState}from'react';
import{navigateTo}from'./navigation.js';

const money=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number(value)||0);
const compact=value=>new Intl.NumberFormat('tr-TR',{notation:'compact',maximumFractionDigits:1}).format(Number(value)||0);
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const tidy=value=>String(value||'').trim().toLocaleLowerCase('tr-TR');
const isIncome=row=>['tur geliri','gelir','income','tour income','bahşiş','bahsis','tip'].includes(tidy(row.type));
const isExpense=row=>['tur masrafı','tur masrafi','masraf','gider','expense','tur gideri','komisyon','commission'].includes(tidy(row.type));
const paid=row=>['ödendi','odendi','alındı','alindi','paid','tahsil edildi'].includes(tidy(row.status));
const request=async url=>{const response=await fetch(url,{cache:'no-store'}),json=await response.json();if(!response.ok)throw new Error(json?.error||'Veri alınamadı.');return json};

function Sparkline({values}){
 const max=Math.max(...values,1),min=Math.min(...values,0),range=max-min||1;
 const points=values.map((value,index)=>`${index/(values.length-1||1)*100},${38-(value-min)/range*34}`).join(' ');
 return <svg className="home-sparkline" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".24"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><polygon points={`0,42 ${points} 100,42`} fill="url(#sparkfill)"/><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

export default function HomeDashboard(){
 const[data,setData]=useState({records:[],expenses:[],events:[],assets:null,rates:{TRY:1},news:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[now,setNow]=useState(new Date());
 const load=async()=>{setLoading(true);setError('');const results=await Promise.allSettled([request('/api/records'),request('/api/expenses'),request('/api/events'),request('/api/assets'),request('/api/settings'),request('/api/news')]);const value=index=>results[index].status==='fulfilled'?results[index].value:null;setData({records:value(0)?.records||[],expenses:value(1)?.expenses||[],events:value(2)?.events||[],assets:value(3),rates:value(4)?.rates||{TRY:1},news:value(5)?.items||[]});if(results.every(result=>result.status==='rejected'))setError('Finansal veriler şu anda alınamadı.');setLoading(false)};
 useEffect(()=>{load();const clock=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(clock)},[]);
 const model=useMemo(()=>{
  const current=monthKey(now),convert=row=>Number(row.amount||0)*(Number(data.rates?.[String(row.currency||'TRY').toUpperCase()])||1);
  const monthRecords=data.records.filter(row=>String(row.date||'').startsWith(current)&&paid(row));
  const income=monthRecords.filter(isIncome).reduce((sum,row)=>sum+convert(row),0);
  const accountingExpense=monthRecords.filter(isExpense).reduce((sum,row)=>sum+convert(row),0);
  const monthExpenses=data.expenses.filter(row=>String(row.date||'').startsWith(current));
  const personalExpense=monthExpenses.reduce((sum,row)=>sum+Number(row.amount||0),0),expense=accountingExpense+personalExpense;
  const deposit=Number(data.assets?.deposit?.principal||0),fundUnits=Number(data.assets?.fund?.baseUnits||0),fundPrice=Number(data.assets?.fund?.baseAveragePrice||0),assetTotal=deposit+fundUnits*fundPrice;
  const months=Array.from({length:6},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth()-5+index,1),key=monthKey(date),rows=data.records.filter(row=>String(row.date||'').startsWith(key)&&paid(row)),personal=data.expenses.filter(row=>String(row.date||'').startsWith(key)).reduce((sum,row)=>sum+Number(row.amount||0),0);return{key,label:new Intl.DateTimeFormat('tr-TR',{month:'short'}).format(date),income:rows.filter(isIncome).reduce((sum,row)=>sum+convert(row),0),expense:rows.filter(isExpense).reduce((sum,row)=>sum+convert(row),0)+personal}});
  const categories=[...new Set(monthExpenses.map(row=>row.category))].map(name=>({name,value:monthExpenses.filter(row=>row.category===name).reduce((sum,row)=>sum+Number(row.amount||0),0)})).sort((a,b)=>b.value-a.value).slice(0,5);
  const upcoming=data.events.filter(event=>event.date>=today()&&tidy(event.status)!=='tamamlandı').sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,5);
  const pending=data.records.filter(row=>!paid(row)&&String(row.date||'')>=today()).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(0,3);
  const news=data.news.filter(item=>item.region==='independent').slice(0,6);
  return{income,expense,net:income-expense,assetTotal,deposit,fundValue:fundUnits*fundPrice,months,categories,upcoming,pending,news,monthExpenses};
 },[data,now]);
 const maxFlow=Math.max(...model.months.flatMap(row=>[row.income,row.expense]),1),dayPart=now.getHours()<12?'Günaydın':now.getHours()<18?'İyi günler':'İyi akşamlar';
 return <main className="finance-home">
  <section className="finance-hero"><div className="hero-orb one"/><div className="hero-orb two"/><div className="hero-copy"><span className="hero-kicker">KİŞİSEL FİNANS MERKEZİ</span><h1>{dayPart}, Ekrem.</h1><p>Bugünkü finansal görünümün ve dikkat etmen gerekenler tek ekranda.</p><div className="hero-actions"><button onClick={()=>navigateTo('/muhasebe/')}>＋ Yeni kayıt</button><button className="secondary" onClick={()=>navigateTo('/harcamalar/')}>Harcama ekle</button></div></div><div className="hero-status"><span>İstanbul</span><strong>{new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit'}).format(now)}</strong><small>{new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'2-digit',month:'long'}).format(now)}</small><i><b/> Veriler güncel</i></div></section>
  {error&&<div className="dashboard-notice">{error}<button onClick={load}>Tekrar dene</button></div>}
  <section className="finance-kpis">
   <article className="finance-kpi asset"><span>Toplam varlık</span><strong>{loading?'—':money(model.assetTotal)}</strong><small>Mevduat + fon maliyeti</small><Sparkline values={model.months.map(row=>row.income-row.expense)}/></article>
   <article className="finance-kpi income"><span>Bu ay gelir</span><strong>{loading?'—':money(model.income)}</strong><small>{model.months.at(-1)?.income>=model.months.at(-2)?.income?'Önceki aya göre güçlü':'Aylık hareket izleniyor'}</small><b className="kpi-icon">↗</b></article>
   <article className="finance-kpi expense"><span>Bu ay gider</span><strong>{loading?'—':money(model.expense)}</strong><small>{model.monthExpenses.length} kişisel harcama kaydı</small><b className="kpi-icon">↘</b></article>
   <article className={`finance-kpi net ${model.net>=0?'positive':'negative'}`}><span>Net nakit akışı</span><strong>{loading?'—':`${model.net>=0?'+':''}${money(model.net)}`}</strong><small>Gelir ve gider farkı</small><b className="kpi-icon">≈</b></article>
  </section>
  <div className="dashboard-main-grid">
   <section className="dashboard-card cash-flow"><header><div><span className="card-eyebrow">SON 6 AY</span><h2>Nakit akışı</h2></div><div className="chart-legend"><i className="income"/>Gelir<i className="expense"/>Gider</div></header><div className="flow-chart">{model.months.map(row=><div className="flow-month" key={row.key}><div className="flow-bars"><i className="income" style={{height:`${Math.max(4,row.income/maxFlow*100)}%`}} title={`Gelir ${money(row.income)}`}/><i className="expense" style={{height:`${Math.max(4,row.expense/maxFlow*100)}%`}} title={`Gider ${money(row.expense)}`}/></div><b>{row.label}</b><small>{compact(row.income-row.expense)}</small></div>)}</div></section>
   <section className="dashboard-card asset-mix"><header><div><span className="card-eyebrow">VARLIK DAĞILIMI</span><h2>Portföy görünümü</h2></div><button onClick={()=>navigateTo('/varliklar/')}>Detay ↗</button></header><div className="asset-donut" style={{'--deposit-share':`${model.assetTotal?model.deposit/model.assetTotal*100:50}%`}}><div><strong>{model.assetTotal?Math.round(model.deposit/model.assetTotal*100):0}%</strong><small>Mevduat</small></div></div><div className="asset-rows"><div><i className="deposit"/><span>Vadeli mevduat<small>Ana para</small></span><strong>{money(model.deposit)}</strong></div><div><i className="fund"/><span>ALE fonu<small>Kayıtlı maliyet</small></span><strong>{money(model.fundValue)}</strong></div></div></section>
   <section className="dashboard-card upcoming"><header><div><span className="card-eyebrow">AJANDA</span><h2>Yaklaşanlar</h2></div><button onClick={()=>navigateTo('/takvim/')}>Takvim ↗</button></header><div className="upcoming-list">{[...model.upcoming,...model.pending].slice(0,5).map((item,index)=><article key={item.id||index}><time><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Intl.DateTimeFormat('tr-TR',{month:'short'}).format(new Date(`${item.date}T12:00:00`))}</span></time><div><strong>{item.title||item.tour||'Bekleyen işlem'}</strong><small>{item.company||item.agency||item.guest||item.status||'Planlandı'}{item.time?` · ${item.time}`:''}</small></div><i>›</i></article>)}{!model.upcoming.length&&!model.pending.length&&<p className="card-empty">Yaklaşan kayıt bulunmuyor.</p>}</div></section>
   <section className="dashboard-card spending"><header><div><span className="card-eyebrow">BU AY</span><h2>Harcama dağılımı</h2></div><button onClick={()=>navigateTo('/harcamalar/')}>Tümü ↗</button></header><div className="spending-list">{model.categories.map((row,index)=><div key={row.name}><span><i>{index+1}</i>{row.name}</span><strong>{money(row.value)}</strong><b><i style={{width:`${model.categories[0]?.value?row.value/model.categories[0].value*100:0}%`}}/></b></div>)}{!model.categories.length&&<p className="card-empty">Kategori analizi için harcama kaydı ekle.</p>}</div></section>
  </div>
  <section className="quick-actions"><div><span className="card-eyebrow">HIZLI İŞLEMLER</span><h2>Ne yapmak istersin?</h2></div><nav><button onClick={()=>navigateTo('/muhasebe/')}><i>＋</i><span>Gelir / gider<strong>Yeni muhasebe kaydı</strong></span></button><button onClick={()=>navigateTo('/harcamalar/')}><i>₺</i><span>Harcama ekle<strong>Günlük gider kaydı</strong></span></button><button onClick={()=>navigateTo('/varliklar/')}><i>◈</i><span>Varlıkları aç<strong>Mevduat ve fon</strong></span></button><button onClick={()=>navigateTo('/takvim/')}><i>□</i><span>Takvime git<strong>Ödeme ve planlar</strong></span></button></nav></section>
  <section className="dashboard-card compact-news"><header><div><span className="card-eyebrow">BAĞIMSIZ KAYNAKLAR</span><h2>Gündemden kısa kısa</h2></div><button onClick={load}>↻ Yenile</button></header><div className="compact-news-grid">{model.news.map(item=><a href={item.url} target="_blank" rel="noreferrer" key={item.id}><b>{item.source}</b><strong>{item.title}</strong><span>Haberi aç ↗</span></a>)}{!model.news.length&&<p className="card-empty">Gündem akışı hazırlanıyor.</p>}</div></section>
 </main>;
}
