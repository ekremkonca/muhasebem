import React,{useEffect,useRef,useState}from'react';

const ROUTE='#varliklar-fon';
const PORTFOLIO={fundCode:'ALE',units:69442,averagePrice:13.04,fallbackPrice:13.584046,fallbackDailyReturn:0.0992};
const DEPOSIT={bank:'AKBANK',principal:2000000,annualRate:40.25,startDate:'2026-08-24',endDate:'2026-09-25',days:32,grossEnd:2070575.34,withholding:12350.68,netEnd:2058224.66};
const tl=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
const num=(value,digits=2)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0);
const pct=value=>`${Number(value||0)>=0?'+':''}${num(value,4)}%`;
const dateText=value=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T12:00:00`)):'—';
const timeText=value=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
const addDays=(iso,days)=>{const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const daysBetween=(from,to)=>Math.floor((new Date(`${to}T12:00:00`)-new Date(`${from}T12:00:00`))/86400000);
const depositElapsedDays=()=>Math.max(0,Math.min(DEPOSIT.days,daysBetween(DEPOSIT.startDate,todayIso())));

function RefreshIcon({size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>}

function FundChart({history}){
 if(!history||history.length<2)return <div className="fund-chart-empty">TEFAS fiyat geçmişi bekleniyor. Yenile düğmesiyle tekrar deneyebilirsin.</div>;
 const width=1000,height=238,padX=26,padY=22,prices=history.map(x=>Number(x.price)).filter(Number.isFinite),min=Math.min(...prices),max=Math.max(...prices),range=max-min||1;
 const points=history.map((row,i)=>{const x=padX+(i/(history.length-1))*(width-padX*2),y=padY+((max-Number(row.price))/range)*(height-padY*2);return{x,y,row}});
 const line=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '),last=points.at(-1);
 return <div className="fund-chart-wrap"><div className="fund-chart-meta"><div><span>1 Aylık Fon Fiyatı</span><strong>{num(last.row.price,6)} TL</strong></div><div className="fund-chart-stats"><span>En düşük <b>{num(min,6)}</b></span><span>En yüksek <b>{num(max,6)}</b></span></div></div><svg className="fund-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ALE son bir aylık fon fiyat grafiği"><line x1={padX} x2={width-padX} y1={height/2} y2={height/2} className="fund-grid-line"/><line x1={padX} x2={width-padX} y1={padY} y2={padY} className="fund-grid-line"/><line x1={padX} x2={width-padX} y1={height-padY} y2={height-padY} className="fund-grid-line"/><path d={line} className="fund-line"/><circle cx={last.x} cy={last.y} r="5" className="fund-last-point"/>{points.map((p,i)=><circle key={`${p.row.date}-${i}`} cx={p.x} cy={p.y} r="9" className="fund-hit"><title>{`${dateText(p.row.date)} · ${num(p.row.price,6)} TL`}</title></circle>)}</svg><div className="fund-chart-dates"><span>{dateText(history[0].date)}</span><span>{dateText(history.at(-1).date)}</span></div></div>;
}

function DepositChart({elapsedDays=0}){
 const grossInterest=DEPOSIT.grossEnd-DEPOSIT.principal,netInterest=DEPOSIT.netEnd-DEPOSIT.principal,dailyNet=netInterest/DEPOSIT.days;
 const history=Array.from({length:DEPOSIT.days+1},(_,day)=>({day,date:addDays(DEPOSIT.startDate,day),total:DEPOSIT.principal+dailyNet*day}));
 const width=1000,height=238,padX=26,padY=22,min=DEPOSIT.principal,max=DEPOSIT.netEnd,range=max-min||1;
 const points=history.map((row,i)=>{const x=padX+(i/(history.length-1))*(width-padX*2),y=padY+((max-row.total)/range)*(height-padY*2);return{x,y,row}}),line=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '),todayPoint=points[Math.min(elapsedDays,points.length-1)],currentTotal=history[Math.min(elapsedDays,history.length-1)].total;
 return <div className="fund-chart-wrap"><div className="fund-chart-meta"><div><span>Bugünkü Net Birikim</span><strong>{tl(currentTotal)}</strong></div><div className="fund-chart-stats"><span>Bugüne kadar <b>{tl(currentTotal-DEPOSIT.principal)}</b></span><span>Vade sonu <b>{tl(DEPOSIT.netEnd)}</b></span></div></div><svg className="fund-chart deposit-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Akbank 32 günlük mevduat net birikim grafiği"><line x1={padX} x2={width-padX} y1={height/2} y2={height/2} className="fund-grid-line"/><line x1={padX} x2={width-padX} y1={padY} y2={padY} className="fund-grid-line"/><line x1={padX} x2={width-padX} y1={height-padY} y2={height-padY} className="fund-grid-line"/><path d={line} className="fund-line"/><circle cx={todayPoint.x} cy={todayPoint.y} r="6" className="fund-last-point"><title>{`${dateText(todayPoint.row.date)} · ${tl(todayPoint.row.total)}`}</title></circle>{points.map((p,i)=><circle key={p.day} cx={p.x} cy={p.y} r="9" className="fund-hit"><title>{`${dateText(p.row.date)} · ${tl(p.row.total)}`}</title></circle>)}</svg><div className="fund-chart-dates"><span>{dateText(DEPOSIT.startDate)}</span><span>{dateText(DEPOSIT.endDate)}</span></div></div>;
}

function DepositSide(){
 const grossInterest=DEPOSIT.grossEnd-DEPOSIT.principal,netInterest=DEPOSIT.netEnd-DEPOSIT.principal,dailyGross=grossInterest/DEPOSIT.days,dailyNet=netInterest/DEPOSIT.days,stopajRate=grossInterest?DEPOSIT.withholding/grossInterest*100:0,netDailyRate=DEPOSIT.principal?dailyNet/DEPOSIT.principal*100:0,netTermReturn=DEPOSIT.principal?netInterest/DEPOSIT.principal*100:0;
 const elapsedDays=depositElapsedDays(),accruedNet=dailyNet*elapsedDays,currentTotal=DEPOSIT.principal+accruedNet,accruedReturn=DEPOSIT.principal?accruedNet/DEPOSIT.principal*100:0;
 return <section className="asset-side deposit-side"><div className="asset-side-head"><div><span className="eyebrow">MEVDUAT FAİZİ</span><h2>{DEPOSIT.bank} · Vadeli Mevduat</h2><p>{dateText(DEPOSIT.startDate)} – {dateText(DEPOSIT.endDate)} · {DEPOSIT.days} gün</p></div><div className="tefas-status live"><i/>AKBANK<small>%{num(DEPOSIT.annualRate,2)}</small></div></div><section className="fund-kpis compact-side-kpis"><article className="fund-kpi total"><span>Toplam Para</span><strong>{tl(currentTotal)}</strong><small>{elapsedDays}/{DEPOSIT.days} gün net tahakkuk</small></article><article className="fund-kpi positive"><span>Birikmiş Kazanç</span><strong>+{tl(accruedNet)}</strong><small>Her gün +{tl(dailyNet)}</small></article><article className="fund-kpi positive"><span>Birikmiş Getiri (%)</span><strong>{pct(accruedReturn)}</strong><small>Günlük sabit oran {pct(netDailyRate)}</small></article><article className="fund-kpi positive"><span>Vade Sonu Faiz</span><strong>+{tl(netInterest)}</strong><small>{pct(netTermReturn)} net vade getirisi</small></article><article className="fund-kpi"><span>Ana Para</span><strong>{tl(DEPOSIT.principal)}</strong><small>Mevduat tutarı</small></article><article className="fund-kpi"><span>Faiz / Vade</span><strong>%{num(DEPOSIT.annualRate,2)}</strong><small>{DEPOSIT.days} gün · yıllık brüt</small></article></section><article className="fund-chart-card compact-fund-chart deposit-chart-card"><DepositChart elapsedDays={elapsedDays}/></article><article className="compact-details-card deposit-details"><div className="fund-card-title"><span className="eyebrow">MEVDUAT DETAYI</span><h3>{DEPOSIT.bank}</h3></div><dl className="compact-details-grid"><div><dt>Vade başlangıç</dt><dd>{dateText(DEPOSIT.startDate)}</dd></div><div><dt>Bugün tahakkuk</dt><dd>{elapsedDays}/{DEPOSIT.days} gün</dd></div><div><dt>Bugünkü toplam</dt><dd>{tl(currentTotal)}</dd></div><div><dt>Birikmiş net faiz</dt><dd className="up">+{tl(accruedNet)}</dd></div><div><dt>Günlük net faiz</dt><dd>{tl(dailyNet)}</dd></div><div><dt>Günlük net oran</dt><dd>{pct(netDailyRate)}</dd></div><div><dt>Brüt vade sonu</dt><dd>{tl(DEPOSIT.grossEnd)}</dd></div><div><dt>Stopaj</dt><dd>{tl(DEPOSIT.withholding)} · %{num(stopajRate,1)}</dd></div><div><dt>Net vade sonu</dt><dd>{tl(DEPOSIT.netEnd)}</dd></div><div><dt>Günlük brüt faiz</dt><dd>{tl(dailyGross)}</dd></div><div><dt>Yıllık brüt oran</dt><dd>%{num(DEPOSIT.annualRate,2)}</dd></div><div><dt>Vade sonu</dt><dd>{dateText(DEPOSIT.endDate)}</dd></div></dl></article></section>;
}

function FundSide(){
 const[data,setData]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[lastAttempt,setLastAttempt]=useState(null);
 const refresh=async()=>{if(loading)return;setLoading(true);setError('');setLastAttempt(new Date().toISOString());try{const response=await fetch(`/api/tefas?fund=${PORTFOLIO.fundCode}&_=${Date.now()}`,{cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(json?.detail||json?.error||'TEFAS verisi alınamadı.');setData(json)}catch(err){setError(err.message||'TEFAS bağlantı hatası.')}finally{setLoading(false)}};
 useEffect(()=>{refresh();const timer=setInterval(refresh,30*60*1000);return()=>clearInterval(timer)},[]);
 const price=Number(data?.price??PORTFOLIO.fallbackPrice),reportedDailyReturn=Number(data?.dailyReturn??PORTFOLIO.fallbackDailyReturn),total=PORTFOLIO.units*price,cost=PORTFOLIO.units*PORTFOLIO.averagePrice,totalProfit=total-cost,totalReturn=cost?totalProfit/cost*100:0;
 const history=Array.isArray(data?.history)?data.history:[],latestHistory=history.at(-1),historyMatchesLatest=latestHistory&&Math.abs(Number(latestHistory.price)-price)<0.0000005;
 const comparisonPrice=historyMatchesLatest?Number(data?.previousPrice||history.at(-2)?.price||0):Number(latestHistory?.price||data?.previousPrice||0);
 const dailyProfit=comparisonPrice>0?PORTFOLIO.units*(price-comparisonPrice):(reportedDailyReturn>-99?total-total/(1+reportedDailyReturn/100):0);
 const dailyReturn=comparisonPrice>0?((price/comparisonPrice)-1)*100:reportedDailyReturn;
 const live=Boolean(data?.price!==null&&data?.price!==undefined),sourceTime=data?.fetchedAt||lastAttempt;
 return <section className="asset-side fund-side"><div className="asset-side-head fund-side-head"><div><span className="eyebrow">PARA PİYASASI FONU</span><h2>ALE · Para Piyasası (TL)</h2><p>Ak Portföy ALE pozisyonu ve TEFAS günlük verileri.</p></div><div className="fund-head-actions"><div className={`tefas-status ${live?'live':'fallback'}`}><i/>{live?'TEFAS':'SON VERİ'}<small>{timeText(sourceTime)}</small></div><button type="button" className={`fund-refresh icon-only-refresh${loading?' loading':''}`} onClick={refresh} disabled={loading} title="TEFAS verisini yenile" aria-label="TEFAS verisini yenile"><span className="refresh-icon"><RefreshIcon/></span></button></div></div>{error&&<div className="fund-warning"><strong>TEFAS bağlantısı kurulamadı.</strong><span>Son bilinen değerler gösteriliyor.</span></div>}<section className="fund-kpis compact-side-kpis"><article className="fund-kpi total"><span>Toplam Para</span><strong>{tl(total)}</strong><small>{num(PORTFOLIO.units,0)} adet ALE</small></article><article className={`fund-kpi ${dailyProfit>=0?'positive':'negative'}`}><span>Günlük Kazanç</span><strong>{dailyProfit>=0?'+':''}{tl(dailyProfit)}</strong><small>{comparisonPrice>0?'Yeni fiyat − önceki işlem fiyatı':'TEFAS günlük oranından'}</small></article><article className={`fund-kpi ${dailyReturn>=0?'positive':'negative'}`}><span>Günlük Getiri (%)</span><strong>{pct(dailyReturn)}</strong><small>{comparisonPrice>0?'Son iki işlem fiyatından hesaplandı':data?.dailyReturnSource||'TEFAS son oran'}</small></article><article className={`fund-kpi ${totalProfit>=0?'positive':'negative'}`}><span>Toplam Kâr</span><strong>{totalProfit>=0?'+':''}{tl(totalProfit)}</strong><small>{pct(totalReturn)} maliyet getirisi</small></article><article className="fund-kpi"><span>Fon Adedi</span><strong>{num(PORTFOLIO.units,0)}</strong><small>ALE pay adedi</small></article><article className="fund-kpi"><span>Anlık Fon Fiyatı</span><strong>{num(price,6)} TL</strong><small>{data?.publishedDate?`${dateText(data.publishedDate)} TEFAS`:'Son bilinen fiyat'}</small></article></section><article className="fund-chart-card compact-fund-chart"><FundChart history={history}/></article><article className="compact-details-card fund-details-card compact-fund-details"><div className="fund-card-title"><span className="eyebrow">POZİSYON DETAYI</span><h3>ALE</h3></div><dl className="compact-details-grid"><div><dt>Ortalama maliyet</dt><dd>{num(PORTFOLIO.averagePrice,2)} TL</dd></div><div><dt>Toplam maliyet</dt><dd>{tl(cost)}</dd></div><div><dt>Güncel değer</dt><dd>{tl(total)}</dd></div><div><dt>Toplam kâr / zarar</dt><dd className={totalProfit>=0?'up':'down'}>{totalProfit>=0?'+':''}{tl(totalProfit)}</dd></div><div><dt>Önceki işlem fiyatı</dt><dd>{comparisonPrice>0?`${num(comparisonPrice,6)} TL`:'—'}</dd></div><div><dt>Yayın tarihi</dt><dd>{data?.publishedDate?dateText(data.publishedDate):'—'}</dd></div><div><dt>Fon kodu</dt><dd>{PORTFOLIO.fundCode}</dd></div><div><dt>Veri kaynağı</dt><dd><a href="https://www.tefas.gov.tr/tr/fon-detayli-analiz/ALE" target="_blank" rel="noreferrer">TEFAS ↗</a></dd></div></dl></article></section>;
}

function AssetsDashboard({onClose}){return <main className="assets-fund-page"><section className="assets-fund-shell"><div className="assets-page-top"><button type="button" className="assets-back" onClick={onClose}>← Muhasebeye dön</button><div className="assets-page-title"><span className="eyebrow">VARLIKLAR / FON</span><strong>Mevduat ve fon karşılaştırması</strong></div></div><div className="assets-split"><DepositSide/><FundSide/></div></section></main>}

export default function AssetsNav(){
 const[active,setActive]=useState(false),[position,setPosition]=useState(null),buttonRef=useRef(null);
 useEffect(()=>{
  if(location.hash===ROUTE)history.replaceState(null,'',`${location.pathname}${location.search}`);
  const sync=()=>setActive(location.hash===ROUTE);
  window.addEventListener('hashchange',sync);
  window.addEventListener('popstate',sync);
  return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)};
 },[]);
 useEffect(()=>{
  const dashboard=document.querySelector('.main-dashboard.v7-dashboard');
  const header=document.querySelector('.v7-header');
  if(dashboard)dashboard.hidden=active;
  if(header)header.hidden=active;
  document.documentElement.dataset.assetsPage=active?'1':'0';
  return()=>{if(dashboard)dashboard.hidden=false;if(header)header.hidden=false;delete document.documentElement.dataset.assetsPage};
 },[active]);
 useEffect(()=>{
  if(active){setPosition(null);return}
  let frame;
  const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const currency=document.querySelector('.v7-header .currency');if(!currency){setPosition(null);return}const r=currency.getBoundingClientRect();setPosition({left:r.left-8,top:r.top,height:r.height})})};
  place();
  const observer=new MutationObserver(place);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',place);
  window.addEventListener('scroll',place,{passive:true});
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place)};
 },[active]);
 const open=()=>{history.pushState(null,'',`${location.pathname}${location.search}${ROUTE}`);setActive(true);window.scrollTo({top:0,behavior:'auto'})};
 const close=()=>{history.pushState(null,'',`${location.pathname}${location.search}`);setActive(false);window.scrollTo({top:0,behavior:'auto'})};
 return <>{!active&&position&&<button ref={buttonRef} type="button" className="btn secondary assets-nav-button assets-nav-fixed" style={{left:position.left,top:position.top,height:position.height}} onClick={open}>VARLIKLAR / FON</button>}{active&&<AssetsDashboard onClose={close}/>}</>;
}
