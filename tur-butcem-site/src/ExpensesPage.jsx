import React,{useEffect,useMemo,useState}from"react";
import HomePage from"./HomePage.jsx";
import"./styles/expenses-page.css";

const CATEGORIES=["Tümü","Market","Fatura","Ulaşım","Yeme İçme","Sağlık","Ev","Giyim","Eğlence","Eğitim","Seyahat","Vergi","Diğer"];
const METHODS=["Nakit","Banka Kartı","Kredi Kartı","Havale / EFT","Otomatik Ödeme"];
const today=()=>new Date().toISOString().slice(0,10);
const monthNow=()=>today().slice(0,7);
const money=n=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(Number(n)||0);
const dateText=v=>new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v+"T12:00:00"));
const empty=()=>({date:today(),merchant:"",category:"Market",amount:"",payment_method:"Kredi Kartı",note:"",recurring:false});

function ExpenseModal({record,onClose,onSaved}){
 const[form,setForm]=useState(record?{...record,recurring:Boolean(record.recurring)}:empty()),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const set=(key,value)=>setForm(x=>({...x,[key]:value}));
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{
  const response=await fetch("/api/expenses",{method:record?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,amount:Number(form.amount)})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Kaydedilemedi.");onSaved(data.expense);
 }catch(err){setError(err.message)}finally{setBusy(false)}};
 return <div className="expense-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
  <form className="expense-modal" onSubmit={submit}>
   <div className="expense-modal-head"><div><span className="eyebrow">HARCAMA KAYDI</span><h2>{record?"Kaydı düzenle":"Yeni harcama"}</h2></div><button type="button" onClick={onClose}>×</button></div>
   <div className="expense-form-grid">
    <label>Tarih<input type="date" value={form.date} onChange={e=>set("date",e.target.value)} required/></label>
    <label>Tutar (₺)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>set("amount",e.target.value)} required placeholder="0,00"/></label>
    <label className="wide">Harcama / Firma<input value={form.merchant} onChange={e=>set("merchant",e.target.value)} required maxLength="120" placeholder="Market, elektrik faturası, restoran..."/></label>
    <label>Kategori<select value={form.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.slice(1).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Ödeme yöntemi<select value={form.payment_method} onChange={e=>set("payment_method",e.target.value)}>{METHODS.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="wide">Not<textarea value={form.note} onChange={e=>set("note",e.target.value)} maxLength="500" placeholder="İsteğe bağlı açıklama"/></label>
    <label className="expense-check wide"><input type="checkbox" checked={form.recurring} onChange={e=>set("recurring",e.target.checked)}/> Düzenli / tekrarlayan harcama</label>
   </div>
   {error&&<p className="expense-error">{error}</p>}
   <div className="expense-modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Vazgeç</button><button className="btn primary" disabled={busy}>{busy?"Kaydediliyor...":"Kaydet"}</button></div>
  </form>
 </div>
}

export default function ExpensesPage(){
 const[rows,setRows]=useState([]),[month,setMonth]=useState(monthNow()),[category,setCategory]=useState("Tümü"),[query,setQuery]=useState(""),[modal,setModal]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const[budget,setBudget]=useState(()=>Number(localStorage.getItem("expense-monthly-budget"))||0);
 useEffect(()=>{fetch("/api/expenses",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Yüklenemedi.");setRows(d.expenses||[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{localStorage.setItem("expense-monthly-budget",String(budget||0))},[budget]);
 const filtered=useMemo(()=>rows.filter(r=>r.date.startsWith(month)&&(category==="Tümü"||r.category===category)&&(!query||[r.merchant,r.note,r.payment_method].join(" ").toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))),[rows,month,category,query]);
 const total=filtered.reduce((s,r)=>s+Number(r.amount),0),count=filtered.length;
 const days=new Set(filtered.map(r=>r.date)).size;
 const groups=useMemo(()=>CATEGORIES.slice(1).map(name=>({name,value:filtered.filter(r=>r.category===name).reduce((s,r)=>s+Number(r.amount),0)})).filter(x=>x.value).sort((a,b)=>b.value-a.value),[filtered]);
 const max=groups[0]?.value||1,top=groups[0];
 const save=row=>{setRows(x=>[row,...x.filter(v=>v.id!==row.id)]);setModal(null)};
 const remove=async row=>{if(!confirm(row.merchant+" harcaması kalıcı olarak silinsin mi?"))return;const r=await fetch("/api/expenses?id="+encodeURIComponent(row.id),{method:"DELETE"});if(r.ok)setRows(x=>x.filter(v=>v.id!==row.id));else setError("Kayıt silinemedi.")};
 const exportCsv=()=>{const safe=v=>'"'+String(v??"").replaceAll('"','""')+'"';const csv="\uFEFF"+[["Tarih","Harcama","Kategori","Tutar","Ödeme","Düzenli","Not"],...filtered.map(r=>[r.date,r.merchant,r.category,r.amount,r.payment_method,r.recurring?"Evet":"Hayır",r.note])].map(a=>a.map(safe).join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="Harcamalar-"+month+".csv";a.click();URL.revokeObjectURL(a.href)};
 const used=budget?total/budget*100:0;
 return <HomePage contentClassName="expenses-page"><section className="expenses-shell">
  <div className="expenses-hero"><div><span className="eyebrow">KİŞİSEL FİNANS</span><h1>Harcama Kayıtları</h1><p>Günlük harcamalarını kaydet, aylık dağılımı ve bütçe durumunu anında gör.</p></div><div className="expenses-hero-actions"><button className="btn secondary" onClick={exportCsv}>CSV / Excel</button><button className="btn primary" onClick={()=>setModal({})}>＋ Harcama ekle</button></div></div>
  {error&&<p className="expense-error" onClick={()=>setError("")}>{error}</p>}
  <div className="expense-kpis">
   <article><span>Toplam harcama</span><strong>{money(total)}</strong><small>{month}</small></article>
   <article><span>İşlem sayısı</span><strong>{count}</strong><small>{days} farklı gün</small></article>
   <article><span>Günlük ortalama</span><strong>{money(days?total/days:0)}</strong><small>Harcama yapılan günler</small></article>
   <article><span>En yüksek kategori</span><strong>{top?.name||"—"}</strong><small>{top?money(top.value):"Kayıt yok"}</small></article>
  </div>
  <section className={`expense-budget-card ${used>=100?"over":used>=80?"warning":""}`}><div><span className="eyebrow">AYLIK BÜTÇE</span><strong>{budget?money(budget):"Bütçe belirlenmedi"}</strong><small>{!budget?"Bir hedef gir":used>=100?money(total-budget)+" bütçe aşımı":used>=80?"Limite yaklaştın · "+money(budget-total)+" kaldı":money(budget-total)+" kaldı"}</small></div><label>Bütçe<input type="number" min="0" step="100" value={budget||""} onChange={e=>setBudget(Number(e.target.value))} placeholder="0 ₺"/></label><div className="budget-track"><i style={{width:Math.min(100,used)+"%"}}/><span>{budget?"%"+used.toFixed(1):"%0"}</span></div></section>
  <div className="expense-layout"><section className="expense-list-card">
   <div className="expense-toolbar"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select><input className="expense-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Harcama, not veya ödeme ara..."/></div>
   <div className="expense-table-wrap"><table><thead><tr><th>Tarih</th><th>Harcama</th><th>Kategori</th><th>Ödeme</th><th className="right">Tutar</th><th/></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{dateText(r.date)}</td><td><strong>{r.merchant}</strong>{r.note&&<small>{r.note}</small>}</td><td><span className="category-pill">{r.category}</span></td><td>{r.payment_method}{Boolean(r.recurring)&&<small>↻ Düzenli</small>}</td><td className="right amount">{money(r.amount)}</td><td><div className="row-actions"><button onClick={()=>setModal(r)}>Düzenle</button><button className="danger" onClick={()=>remove(r)}>Sil</button></div></td></tr>)}</tbody></table>{!loading&&!filtered.length&&<div className="expense-empty">Bu filtrede harcama kaydı yok.</div>}{loading&&<div className="expense-empty">Yükleniyor...</div>}</div>
  </section>
  <aside className="expense-analysis"><div className="analysis-head"><span className="eyebrow">DAĞILIM</span><h2>Kategori analizi</h2></div>{groups.map(g=><div className="category-bar" key={g.name}><div><span>{g.name}</span><strong>{money(g.value)}</strong></div><i><b style={{width:g.value/max*100+"%"}}/></i><small>%{total?(g.value/total*100).toFixed(1):0}</small></div>)}{!groups.length&&<p>Kategori analizi için kayıt ekle.</p>}</aside>
  </div>
 </section>{modal&&<ExpenseModal record={modal.id?modal:null} onClose={()=>setModal(null)} onSaved={save}/>}</HomePage>
}
