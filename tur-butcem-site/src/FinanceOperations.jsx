import React,{useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {createCashMovement,deleteCashMovement,loadCashMovements,loadMonthClosings,saveMonthClosing,updateCashMovement} from './api';
import './styles/finance-operations.css';

const today=()=>new Date().toISOString().slice(0,10);
const currentMonth=()=>today().slice(0,7);
const emptyMovement=()=>({date:today(),kind:'Kasa Giriş',amount:'',currency:'TRY',rate:1,account:'',note:''});
const money=(value)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(value)||0);
const nativeMoney=(value,currency)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)||0);

export default function FinanceOperations({summary,rates}){
 const [panel,setPanel]=useState(''),[movements,setMovements]=useState([]),[closings,setClosings]=useState([]),[draft,setDraft]=useState(emptyMovement),[month,setMonth]=useState(currentMonth),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=async()=>{const [m,c]=await Promise.all([loadCashMovements(),loadMonthClosings()]);setMovements(m);setClosings(c)};
 useEffect(()=>{refresh().catch(()=>{})},[]);
 const shown=useMemo(()=>panel==='exchange'?movements.filter(x=>x.kind==='Döviz Bozum'):movements,[movements,panel]);
 const total=shown.reduce((sum,x)=>sum+Number(x.try_amount||0),0);
 const open=(name)=>{setPanel(name);setError('');setDraft({...emptyMovement(),kind:name==='exchange'?'Döviz Bozum':'Kasa Giriş'})};
 const saveMovement=async(e)=>{e.preventDefault();setBusy(true);setError('');try{const rate=draft.currency==='TRY'?1:Number(draft.rate||rates?.[draft.currency]||0);const payload={...draft,kind:panel==='exchange'?'Döviz Bozum':draft.kind,amount:Number(draft.amount),rate};const saved=draft.id?await updateCashMovement(payload):await createCashMovement(payload);setMovements(xs=>[saved,...xs.filter(x=>x.id!==saved.id)]);setDraft({...emptyMovement(),kind:panel==='exchange'?'Döviz Bozum':'Kasa Giriş'})}catch(err){setError(err.message)}finally{setBusy(false)}};
 const edit=(row)=>setDraft({...row,amount:String(row.amount),rate:String(row.rate)});
 const remove=async(row)=>{if(!window.confirm('Bu kasa hareketi silinsin mi?'))return;setBusy(true);try{await deleteCashMovement(row.id);setMovements(xs=>xs.filter(x=>x.id!==row.id))}catch(err){setError(err.message)}finally{setBusy(false)}};
 const closeMonth=async(e)=>{e.preventDefault();setBusy(true);setError('');try{const closing=await saveMonthClosing({month,note,...summary,snapshot:{rates,createdAt:new Date().toISOString()}});setClosings(xs=>[closing,...xs.filter(x=>x.month!==closing.month)]);setNote('')}catch(err){setError(err.message)}finally{setBusy(false)}};
 return <>
  <section className="finance-tools" aria-label="Finans yönetimi">
   <button onClick={()=>open('exchange')}><i>⇄</i><span><b>Döviz bozum geçmişi</b><small>Kur ve gerçekleşen TL</small></span><em>→</em></button>
   <button onClick={()=>open('cash')}><i>₺</i><span><b>Kasa hareketleri</b><small>Giriş, çıkış ve transferler</small></span><em>→</em></button>
   <button onClick={()=>open('closing')}><i>✓</i><span><b>Aylık kapanış</b><small>Ay sonu değerlerini sabitle</small></span><em>→</em></button>
  </section>
  {panel&&createPortal(<div className="finance-ops-backdrop" role="dialog" aria-modal="true" onMouseDown={e=>e.target===e.currentTarget&&setPanel('')}>
   <section className="finance-ops-modal">
    <header><div><span>FİNANS MERKEZİ</span><h2>{panel==='exchange'?'Döviz bozum geçmişi':panel==='cash'?'Kasa hareketleri':'Aylık kapanış'}</h2></div><button onClick={()=>setPanel('')} aria-label="Kapat">×</button></header>
    {error&&<p className="finance-ops-error">{error}</p>}
    {panel!=='closing'?<>
     <form className="movement-form" onSubmit={saveMovement}>
      <label>Tarih<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
      <label>İşlem<select value={panel==='exchange'?'Döviz Bozum':draft.kind} disabled={panel==='exchange'} onChange={e=>setDraft({...draft,kind:e.target.value})}>{['Döviz Bozum','Kasa Giriş','Kasa Çıkış','Banka Transferi','Harcama','Diğer'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Tutar<input type="number" min="0.01" step="0.01" required value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label>
      <label>Döviz<select value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value,rate:e.target.value==='TRY'?1:(rates?.[e.target.value]||'')})}>{['TRY','USD','EUR','GBP'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Kur<input type="number" min="0.0001" step="0.0001" required disabled={draft.currency==='TRY'} value={draft.currency==='TRY'?1:draft.rate} onChange={e=>setDraft({...draft,rate:e.target.value})}/></label>
      <label>Hesap<input maxLength="60" placeholder="Kasa / banka" value={draft.account} onChange={e=>setDraft({...draft,account:e.target.value})}/></label>
      <label className="wide">Not<input maxLength="240" placeholder="İşlem açıklaması" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
      <div className="wide movement-actions">{draft.id&&<button type="button" onClick={()=>setDraft(emptyMovement())}>Vazgeç</button>}<button className="primary" disabled={busy}>{draft.id?'Güncelle':'Hareket ekle'}</button></div>
     </form>
     <div className="movement-total"><span>{shown.length} hareket</span><b>{money(total)}</b></div>
     <div className="movement-list">{shown.map(row=><article key={row.id}><div className={`movement-kind kind-${row.kind.replace(/\s+/g,'-').toLowerCase()}`}>{row.kind==='Döviz Bozum'?'⇄':row.kind==='Harcama'||row.kind==='Kasa Çıkış'?'−':'+'}</div><div><b>{row.kind}</b><small>{row.date} · {row.account||'Belirtilmedi'}{row.note?` · ${row.note}`:''}</small></div><div><strong>{nativeMoney(row.amount,row.currency)}</strong><small>{money(row.try_amount)} · Kur {Number(row.rate).toLocaleString('tr-TR')}</small></div><div className="movement-row-actions"><button onClick={()=>edit(row)}>Düzenle</button><button className="danger" onClick={()=>remove(row)}>Sil</button></div></article>)}{!shown.length&&<p className="empty-ops">Henüz hareket yok.</p>}</div>
    </>:<>
     <form className="closing-form" onSubmit={closeMonth}><label>Kapanış ayı<input type="month" required value={month} onChange={e=>setMonth(e.target.value)}/></label><label>Not<input maxLength="240" placeholder="Ay sonu notu" value={note} onChange={e=>setNote(e.target.value)}/></label><button className="primary" disabled={busy}>Bu ayı kapat / güncelle</button></form>
     <div className="closing-preview"><div><span>Gelir</span><b>{money(summary.income)}</b></div><div><span>Masraf</span><b>{money(summary.expense)}</b></div><div><span>EV KASA</span><b>{money(summary.cash_value)}</b></div><div><span>Alacak</span><b>{money(summary.receivable)}</b></div><div className="net"><span>Net</span><b>{money(summary.net)}</b></div></div>
     <div className="closing-list">{closings.map(row=><article key={row.id}><time>{row.month}</time><div><b>{money(row.net)}</b><small>Gelir {money(row.income)} · Masraf {money(row.expense)} · Kasa {money(row.cash_value)} · Alacak {money(row.receivable)}</small>{row.note&&<p>{row.note}</p>}</div></article>)}{!closings.length&&<p className="empty-ops">Henüz aylık kapanış yok.</p>}</div>
    </>}
   </section>
  </div>,document.body)}
 </>
}
