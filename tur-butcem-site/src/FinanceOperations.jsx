import React,{useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {createCashMovement,deleteCashMovement,loadCashMovements,updateCashMovement} from './api';
import './styles/finance-operations.css';

const today=()=>new Date().toISOString().slice(0,10);
const emptyMovement=()=>({date:today(),kind:'Kasa Giriş',amount:'',currency:'TRY',rate:1,account:'',note:''});
const money=(value)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(value)||0);
const nativeMoney=(value,currency)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)||0);

export default function FinanceOperations({rates}){
 const [panel,setPanel]=useState(''),[movements,setMovements]=useState([]),[draft,setDraft]=useState(emptyMovement),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=async()=>setMovements(await loadCashMovements());
 useEffect(()=>{refresh().catch(()=>{})},[]);
 const shown=useMemo(()=>movements.filter(x=>x.kind==='Döviz Bozum'),[movements]);
 const total=shown.reduce((sum,x)=>sum+Number(x.try_amount||0),0);
 const open=()=>{setPanel('exchange');setError('');setDraft({...emptyMovement(),kind:'Döviz Bozum'})};
 const saveMovement=async(e)=>{e.preventDefault();setBusy(true);setError('');try{const rate=draft.currency==='TRY'?1:Number(draft.rate||rates?.[draft.currency]||0);const payload={...draft,kind:'Döviz Bozum',amount:Number(draft.amount),rate};const saved=draft.id?await updateCashMovement(payload):await createCashMovement(payload);setMovements(xs=>[saved,...xs.filter(x=>x.id!==saved.id)]);setDraft({...emptyMovement(),kind:'Döviz Bozum'})}catch(err){setError(err.message)}finally{setBusy(false)}};
 const edit=(row)=>setDraft({...row,amount:String(row.amount),rate:String(row.rate)});
 const remove=async(row)=>{if(!window.confirm('Bu kasa hareketi silinsin mi?'))return;setBusy(true);try{await deleteCashMovement(row.id);setMovements(xs=>xs.filter(x=>x.id!==row.id))}catch(err){setError(err.message)}finally{setBusy(false)}};
 return <>
  <section className="finance-tools" aria-label="Finans yönetimi">
   <button onClick={open}><i>⇄</i><span><b>Döviz İşlemleri</b><small>Bozum geçmişi ve gerçekleşen TL</small></span><span className="exchange-symbols" aria-hidden="true"><i>$</i><i>€</i><i>£</i><i>₺</i></span><em>→</em></button>
  </section>
  {panel&&createPortal(<div className="finance-ops-backdrop" role="dialog" aria-modal="true" onMouseDown={e=>e.target===e.currentTarget&&setPanel('')}>
   <section className="finance-ops-modal">
    <header><div><span>FİNANS MERKEZİ</span><h2>Döviz İşlemleri</h2></div><button onClick={()=>setPanel('')} aria-label="Kapat">×</button></header>
    {error&&<p className="finance-ops-error">{error}</p>}
    <>
     <form className="movement-form" onSubmit={saveMovement}>
      <label>Tarih<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
      <label>İşlem<select value="Döviz Bozum" disabled><option>Döviz Bozum</option></select></label>
      <label>Tutar<input type="number" min="0.01" step="0.01" required value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label>
      <label>Döviz<select value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value,rate:e.target.value==='TRY'?1:(rates?.[e.target.value]||'')})}>{['TRY','USD','EUR','GBP'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Kur<input type="number" min="0.0001" step="0.0001" required disabled={draft.currency==='TRY'} value={draft.currency==='TRY'?1:draft.rate} onChange={e=>setDraft({...draft,rate:e.target.value})}/></label>
      <label>Hesap<input maxLength="60" placeholder="Kasa / banka" value={draft.account} onChange={e=>setDraft({...draft,account:e.target.value})}/></label>
      <label className="wide">Not<input maxLength="240" placeholder="İşlem açıklaması" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
      <div className="wide movement-actions">{draft.id&&<button type="button" onClick={()=>setDraft(emptyMovement())}>Vazgeç</button>}<button className="primary" disabled={busy}>{draft.id?'Güncelle':'Hareket ekle'}</button></div>
     </form>
     <div className="movement-total"><span>{shown.length} hareket</span><b>{money(total)}</b></div>
     <div className="movement-list">{shown.map(row=><article key={row.id}><div className={`movement-kind kind-${row.kind.replace(/\s+/g,'-').toLowerCase()}`}>{row.kind==='Döviz Bozum'?'⇄':row.kind==='Harcama'||row.kind==='Kasa Çıkış'?'−':'+'}</div><div><b>{row.kind}</b><small>{row.date} · {row.account||'Belirtilmedi'}{row.note?` · ${row.note}`:''}</small></div><div><strong>{nativeMoney(row.amount,row.currency)}</strong><small>{money(row.try_amount)} · Kur {Number(row.rate).toLocaleString('tr-TR')}</small></div><div className="movement-row-actions"><button onClick={()=>edit(row)}>Düzenle</button><button className="danger" onClick={()=>remove(row)}>Sil</button></div></article>)}{!shown.length&&<p className="empty-ops">Henüz hareket yok.</p>}</div>
    </>
   </section>
  </div>,document.body)}
 </>
}
