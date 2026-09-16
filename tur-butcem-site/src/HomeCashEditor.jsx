import React,{useState} from 'react';
import {saveHomeCash} from './api';
export default function HomeCashEditor({balances,onSave}) {
 const [draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const change=(i,key,value)=>setDraft(xs=>xs.map((x,j)=>j===i?{...x,[key]:value}:x));
 async function save(e){e.preventDefault();setBusy(true);setError('');try{const result=await saveHomeCash(draft.map(x=>({...x,amount:Number(x.amount)})));onSave(result.balances);setDraft(null);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <><button type="button" aria-label="EV KASA düzenle" title="EV KASA düzenle" style={{position:'absolute',right:8,top:6,border:0,background:'transparent',color:'inherit',cursor:'pointer',padding:4}} onClick={()=>{setDraft(balances.map(x=>({...x})));setError('');}}>✎</button>
 {draft&&<div role="dialog" aria-modal="true" aria-label="EV KASA düzenle" style={{position:'fixed',inset:0,zIndex:10000,background:'#0009',display:'grid',placeItems:'center'}}><form onSubmit={save} style={{background:'var(--paper)',color:'var(--ink)',border:'1px solid var(--line)',borderRadius:16,padding:20,width:'min(520px,92vw)',maxHeight:'85vh',overflow:'auto'}}>
 <h2>EV KASA düzenle</h2><p>Kaydedilen bakiyeler güncel kurla Net Gelire yansır.</p>
 {draft.map((x,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'1fr 75px 100px 40px',gap:6,marginBottom:10}}>
 <input aria-label={`Etiket ${i+1}`} placeholder="Etiket" maxLength={24} value={x.label||''} disabled={busy} onChange={e=>change(i,'label',e.target.value)} style={{minWidth:0}}/>
 <select aria-label={`Para birimi ${i+1}`} value={x.code} disabled={busy} onChange={e=>change(i,'code',e.target.value)}>{['TRY','USD','EUR','GBP'].map(c=><option key={c}>{c}</option>)}</select>
 <input aria-label={`Tutar ${i+1}`} type="number" min="0" max="1000000000000" step="0.01" required value={x.amount} disabled={busy} onChange={e=>change(i,'amount',e.target.value)} style={{minWidth:0}}/>
 <button type="button" aria-label={`Bakiyeyi sil ${i+1}`} disabled={busy} onClick={()=>setDraft(xs=>xs.filter((_,j)=>j!==i))}>×</button></div>)}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn secondary" type="button" disabled={busy||draft.length>=20} onClick={()=>setDraft(xs=>[...xs,{code:'TRY',amount:0,label:''}])}>+ Ekle</button><button className="btn secondary" type="button" disabled={busy} onClick={()=>setDraft(null)}>Vazgeç</button><button className="btn primary" disabled={busy}>{busy?'Kaydediliyor…':'Kaydet'}</button></div>
 </form></div>}</>;
}
