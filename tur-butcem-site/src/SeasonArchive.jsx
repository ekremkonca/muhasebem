import React,{useEffect,useMemo,useState}from'react';
import HomePage from'./HomePage.jsx';
import{archiveSeason,getAuthStateWithRetry,loadEvents,loadRecords,loadSeasonArchives,login}from'./api.js';
import'./styles/season-archive.css';

const isoToday=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const nextDay=value=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
const money=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(value)||0);
const date=value=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T12:00:00`)):'—';

function ArchiveLogin({onDone}){const[pin,setPin]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{await login(pin);onDone()}catch(err){setError(err.message||'Giriş yapılamadı.')}finally{setBusy(false)}};return <div className="auth-shell"><form className="auth-card" onSubmit={submit}><span className="eyebrow">SEZON ARŞİVİ</span><h1>Giriş</h1><p>Arşiv verilerini görmek için PIN gir.</p><label>PIN<input type="password" inputMode="numeric" maxLength="8" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} autoFocus/></label>{error&&<p className="auth-error">{error}</p>}<button className="btn primary auth-submit" disabled={busy||pin.length<4}>{busy?'Kontrol ediliyor…':'Giriş yap'}</button></form></div>}

function ArchiveModal({active,records,onClose,onDone}){
 const today=isoToday(),[form,setForm]=useState({title:`${new Date().getFullYear()} Sezonu`,startDate:active.startDate||'2026-04-01',endDate:today,newTitle:`${new Date().getFullYear()+1} Sezonu`,newStart:nextDay(today),carryReceivables:true}),[confirmText,setConfirmText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const included=useMemo(()=>records.filter(r=>r.date>=form.startDate&&r.date<=form.endDate),[records,form.startDate,form.endDate]);
 const tours=included.filter(r=>r.type==='Tur Geliri'&&r.status!=='İade edildi'&&Number(r.amount)>0).length;
 const open=included.filter(r=>r.status==='Ödenmedi'&&['Tur Geliri','Bahşiş','Komisyon'].includes(r.type)&&Number(r.amount)>Number(r.paid_amount||0)).length;
 const submit=async e=>{e.preventDefault();if(confirmText!=='ARŞİVLE')return;setBusy(true);setError('');try{await archiveSeason(form);onDone()}catch(err){setError(err.message||'Sezon arşivlenemedi.')}finally{setBusy(false)}};
 return <div className="season-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="season-modal" onSubmit={submit}>
  <header><div><span>SEZON KAPANIŞI</span><h2>Sezonu arşivle</h2><p>Önce otomatik yedek alınır. Geçmiş sezon salt okunur olarak saklanır.</p></div><button type="button" onClick={onClose}>×</button></header>
  {error&&<p className="season-error">{error}</p>}
  <div className="season-form-grid">
   <label className="wide">Arşiv adı<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label>
   <label>Başlangıç<input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/></label>
   <label>Bitiş<input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value,newStart:nextDay(e.target.value)})} required/></label>
   <label className="wide">Yeni sezon adı<input value={form.newTitle} onChange={e=>setForm({...form,newTitle:e.target.value})} required/></label>
   <label className="wide">Yeni sezon başlangıcı<input type="date" value={form.newStart} min={nextDay(form.endDate)} onChange={e=>setForm({...form,newStart:e.target.value})} required/></label>
  </div>
  <label className="season-carry"><input type="checkbox" checked={form.carryReceivables} onChange={e=>setForm({...form,carryReceivables:e.target.checked})}/><span><strong>Ödenmemiş alacakları yeni sezona devret</strong><small>Eski kayıt arşivde kalır; kalan tutar yeni sezonda “Devreden alacak” olarak açılır.</small></span></label>
  <div className="season-preview"><article><strong>{included.length}</strong><span>Kayıt</span></article><article><strong>{tours}</strong><span>Tur</span></article><article><strong>{open}</strong><span>Devreden alacak</span></article></div>
  <div className="season-confirm"><p>Bu işlem aktif sezon kayıtlarını arşive taşıyacak. Onaylamak için <b>ARŞİVLE</b> yaz.</p><input value={confirmText} onChange={e=>setConfirmText(e.target.value.toLocaleUpperCase('tr-TR'))} placeholder="ARŞİVLE"/></div>
  <footer><button type="button" className="season-secondary" onClick={onClose}>Vazgeç</button><button className="season-primary" disabled={busy||confirmText!=='ARŞİVLE'||!included.length}>{busy?'Arşivleniyor…':'Sezonu kapat ve yenisini başlat'}</button></footer>
 </form></div>;
}

export default function SeasonArchive(){
 const[auth,setAuth]=useState({loading:true,authenticated:false}),[archives,setArchives]=useState([]),[active,setActive]=useState({title:'Aktif Sezon',startDate:'2026-04-01'}),[records,setRecords]=useState([]),[events,setEvents]=useState([]),[selected,setSelected]=useState(null),[showArchive,setShowArchive]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const[data,rows,plans]=await Promise.all([loadSeasonArchives(),loadRecords(),loadEvents()]);setArchives(data.archives||[]);setActive(data.active||active);setRecords(rows);setEvents(plans)}catch(err){setError(err.message||'Arşiv bilgileri yüklenemedi.')}finally{setLoading(false)}};
 useEffect(()=>{getAuthStateWithRetry().then(state=>setAuth({loading:false,authenticated:Boolean(state.authenticated)})).catch(err=>{setAuth({loading:false,authenticated:false});setError(err.message||'Sunucuya bağlanılamadı.')})},[]);
 useEffect(()=>{if(auth.authenticated)load()},[auth.authenticated]);
 const open=async item=>{setError('');try{const data=await loadSeasonArchives(item.id);setSelected(data.archive)}catch(err){setError(err.message||'Arşiv açılamadı.')}};
 const currentTours=records.filter(r=>r.type==='Tur Geliri'&&r.status!=='İade edildi'&&Number(r.amount)>0).length;
 const currentOpen=records.filter(r=>r.status==='Ödenmedi'&&['Tur Geliri','Bahşiş','Komisyon'].includes(r.type)).length;
 if(auth.loading)return <div className="auth-shell"><div className="auth-card"><h2>Arşiv hazırlanıyor…</h2></div></div>;
 if(!auth.authenticated)return <ArchiveLogin onDone={()=>setAuth({loading:false,authenticated:true})}/>;
 return <HomePage contentClassName="season-page">
  <section className="season-hero"><div><span>SEZON YÖNETİMİ</span><h1>Arşiv</h1><p>Geçmiş sezonları güvenle kilitle, istediğin zaman incele ve yeni sezona temiz bir ekranla başla.</p></div><button onClick={()=>setShowArchive(true)} disabled={loading||!records.length}>Sezonu arşivle</button></section>
  {error&&<p className="season-error">{error}</p>}
  <section className="active-season-card"><div><span>AKTİF SEZON</span><h2>{active.title}</h2><p>{date(active.startDate)} tarihinden beri devam ediyor</p></div><div className="active-season-stats"><article><strong>{records.length}</strong><span>Kayıt</span></article><article><strong>{currentTours}</strong><span>Muhasebe turu</span></article><article><strong>{events.length}</strong><span>Takvim planı</span></article><article><strong>{currentOpen}</strong><span>Açık alacak</span></article></div></section>
  <div className="season-layout"><aside><div className="season-list-title"><span>GEÇMİŞ SEZONLAR</span><strong>{archives.length}</strong></div>{loading?<p className="season-empty">Yükleniyor…</p>:archives.length?archives.map(item=><button key={item.id} className={selected?.id===item.id?'active':''} onClick={()=>open(item)}><span><strong>{item.title}</strong><small>{date(item.start_date)} – {date(item.end_date)}</small></span><b>{item.summary?.tourCount||0} tur</b></button>):<p className="season-empty">Henüz arşivlenmiş sezon yok.</p>}</aside>
   <section className="season-detail">{selected?<><header><div><span>ARŞİVLENMİŞ SEZON</span><h2>{selected.title}</h2><p>{date(selected.start_date)} – {date(selected.end_date)}</p></div><i>KİLİTLİ</i></header><div className="archive-kpis"><article><span>Net sonuç</span><strong>{money(selected.summary.net)}</strong></article><article><span>Tur geliri</span><strong>{money(selected.summary.tourIncome)}</strong></article><article><span>Masraf</span><strong>{money(selected.summary.expense)}</strong></article><article><span>Alacak</span><strong>{money(selected.summary.receivable)}</strong></article><article><span>Muhasebe turu</span><strong>{selected.summary.tourCount||0}</strong></article><article><span>Takvim planı</span><strong>{selected.summary.eventCount||0}</strong></article><article><span>Kayıt</span><strong>{selected.summary.recordCount||0}</strong></article></div><div className="archive-ledger"><h3>Sezon kayıtları</h3>{(selected.data?.records||[]).slice(0,100).map(row=><article key={row.id}><time>{date(row.date)}</time><span><strong>{row.tour||row.agency||row.type}</strong><small>{row.agency||row.type} · {row.status}</small></span><b>{Number(row.amount||0).toLocaleString('tr-TR')} {row.currency}</b></article>)}</div></>:<div className="season-detail-empty"><div>▣</div><h2>Sezon geçmişin burada oluşacak</h2><p>Bir sezonu arşivlediğinde hesap özeti, tur sayıları ve bütün kayıtları değiştirilemeden burada saklanır.</p></div>}</section>
  </div>
  {showArchive&&<ArchiveModal active={active} records={records} onClose={()=>setShowArchive(false)} onDone={()=>{setShowArchive(false);setSelected(null);load()}}/>}
 </HomePage>;
}
