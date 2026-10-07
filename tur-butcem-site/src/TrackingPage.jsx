import React, { useEffect, useMemo, useState } from 'react';
import HomePage from './HomePage.jsx';
import { createInvoice, deleteInvoice, getAuthStateWithRetry, loadInvoices, updateInvoice } from './api.js';
import './tracking.css';

const empty = { title:'', party:'', invoice_date:'', due_date:'', amount:'', currency:'TRY', status:'Bekliyor', note:'' };
const money = (value, currency) => new Intl.NumberFormat('tr-TR', { style:'currency', currency, maximumFractionDigits:2 }).format(Number(value) || 0);
const dateText = value => value ? new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${String(value).slice(0,10)}T12:00:00`)) : '—';
const today = () => new Date().toISOString().slice(0,10);

function InvoiceForm({ value, onChange, onSave, onCancel, busy }) {
  const set = (key, val) => onChange({ ...value, [key]: val });
  return <form className="tracking-form" onSubmit={e => { e.preventDefault(); onSave(); }}>
    <div className="tracking-form-head"><div><span className="eyebrow">YENİ TAKİP KAYDI</span><h2>{value.id ? 'Faturayı düzenle' : 'Fatura ekle'}</h2></div><button type="button" className="icon-btn" onClick={onCancel} aria-label="Kapat">×</button></div>
    <div className="tracking-form-grid">
      <label>Gider / fatura adı<input required value={value.title} onChange={e=>set('title',e.target.value)} placeholder="Örn. Elektrik, kira veya internet" /></label>
      <label>Kurum / hizmet sağlayıcı<input value={value.party} onChange={e=>set('party',e.target.value)} placeholder="Örn. AYDEM, Türk Telekom veya ev sahibi" /></label>
      <label>Fatura tarihi<input required type="date" value={value.invoice_date} onChange={e=>set('invoice_date',e.target.value)} /></label>
      <label>Son ödeme tarihi<input required type="date" value={value.due_date} onChange={e=>set('due_date',e.target.value)} /></label>
      <label>Tutar<input required type="number" min="0" step="0.01" value={value.amount} onChange={e=>set('amount',e.target.value)} /></label>
      <label>Para birimi<select value={value.currency} onChange={e=>set('currency',e.target.value)}>{['TRY','USD','EUR','GBP'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Durum<select value={value.status} onChange={e=>set('status',e.target.value)}>{['Bekliyor','Ödendi','Gecikti'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="tracking-note">Not<textarea value={value.note} onChange={e=>set('note',e.target.value)} rows="2" placeholder="İsteğe bağlı not" /></label>
    </div>
    <div className="tracking-form-actions"><button type="button" className="btn secondary" onClick={onCancel}>Vazgeç</button><button className="btn primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
  </form>;
}

export default function TrackingPage() {
  const [auth, setAuth] = useState({ loading:true, authenticated:false, configured:false });
  const [items, setItems] = useState([]), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [statusBusy, setStatusBusy] = useState(''), [error, setError] = useState(''), [filter, setFilter] = useState('Tümü');
  const refresh = async () => { setItems(await loadInvoices()); };
  useEffect(() => { getAuthStateWithRetry().then(state => { setAuth({ loading:false, ...state }); if(state.authenticated) refresh().catch(e=>setError(e.message)); }).catch(e=>setAuth({ loading:false, error:e.message })); }, []);
  const todayIso = today();
  const visible = useMemo(() => items.filter(item => filter === 'Tümü' || item.status === filter), [items, filter]);
  const stats = useMemo(() => ({ pending:items.filter(i=>i.status==='Bekliyor').length, late:items.filter(i=>i.status==='Gecikti' || (i.status==='Bekliyor' && i.due_date < todayIso)).length, paid:items.filter(i=>i.status==='Ödendi').length }), [items, todayIso]);
  const save = async () => { setBusy(true); setError(''); try { const saved = form.id ? await updateInvoice(form) : await createInvoice({ ...form, amount:Number(form.amount)||0 }); setItems(current => form.id ? current.map(i=>i.id===saved.id?saved:i) : [...current,saved]); setForm(null); } catch(e) { setError(e.message); } finally { setBusy(false); } };
  const toggleStatus = async item => { const nextStatus = item.status === 'Ödendi' ? 'Bekliyor' : 'Ödendi'; setStatusBusy(item.id); setError(''); try { const saved = await updateInvoice({ ...item, status:nextStatus }); setItems(current=>current.map(invoice=>invoice.id===saved.id?saved:invoice)); } catch(e) { setError(e.message); } finally { setStatusBusy(''); } };
  const remove = async id => { if(!window.confirm('Bu fatura takip kaydı silinsin mi?')) return; try { await deleteInvoice(id); setItems(current=>current.filter(i=>i.id!==id)); } catch(e) { setError(e.message); } };
  if (auth.loading) return <HomePage><main className="tracking-page"><p>Takip yükleniyor…</p></main></HomePage>;
  if (!auth.authenticated) return <HomePage><main className="tracking-page"><section className="tracking-empty"><h1>Takip</h1><p>Fatura takibi için önce muhasebe girişini tamamla.</p></section></main></HomePage>;
  return <HomePage contentClassName="tracking-shell"><main className="tracking-page">
    <header className="tracking-hero"><div><span className="eyebrow">EV GİDERLERİ</span><h1>Takip</h1><p>Kira, elektrik, su, internet ve telefon ödemelerini ayrı bir yerde izle.</p></div><button className="btn primary" onClick={()=>setForm({ ...empty, invoice_date:todayIso, due_date:todayIso })}>＋ Fatura ekle</button></header>
    {error && <p className="system-error">{error}</p>}
    <section className="tracking-stats"><article><span>Bekleyen</span><strong>{stats.pending}</strong><small>fatura</small></article><article><span>Geciken</span><strong>{stats.late}</strong><small>kontrol edilmeli</small></article><article><span>Ödendi</span><strong>{stats.paid}</strong><small>fatura</small></article></section>
    <section className="tracking-list-card"><div className="tracking-list-head"><div><span className="eyebrow">FATURA DEFTERİ</span><h2>Fatura takibi</h2></div><select aria-label="Fatura durumu filtresi" value={filter} onChange={e=>setFilter(e.target.value)}>{['Tümü','Bekliyor','Gecikti','Ödendi'].map(s=><option key={s}>{s}</option>)}</select></div>
      {visible.length ? <div className="tracking-list">{visible.map(item => <article key={item.id} className={`invoice-row status-${item.status === 'Ödendi' ? 'paid' : item.status === 'Gecikti' || (item.status === 'Bekliyor' && item.due_date < todayIso) ? 'late' : 'pending'}`}><div className="invoice-main"><button type="button" className="invoice-status" disabled={statusBusy===item.id} onClick={()=>toggleStatus(item)} title={item.status==='Ödendi'?'Bekliyor olarak işaretle':'Ödendi olarak işaretle'}>{statusBusy===item.id?'Kaydediliyor…':item.status}</button><h3>{item.title}</h3><p>{item.party || 'Kurum belirtilmedi'} · Fatura {dateText(item.invoice_date)} · Son ödeme {dateText(item.due_date)}</p>{item.note && <small>{item.note}</small>}</div><div className="invoice-side"><strong>{money(item.amount,item.currency)}</strong><div><button onClick={()=>setForm(item)}>Düzenle</button><button className="danger-link" onClick={()=>remove(item.id)}>Sil</button></div></div></article>)}</div> : <div className="tracking-empty"><h3>Henüz ev gideri yok</h3><p>Kira veya ilk fatura kaydını ekleyerek takip etmeye başlayabilirsin.</p><button className="btn primary" onClick={()=>setForm({ ...empty, invoice_date:todayIso, due_date:todayIso })}>Fatura ekle</button></div>}
    </section>
    {form && <div className="tracking-modal-backdrop"><InvoiceForm value={form} onChange={setForm} onSave={save} onCancel={()=>setForm(null)} busy={busy} /></div>}
  </main></HomePage>;
}
