import React,{useEffect,useMemo,useState}from'react';
import HomePage from'./HomePage.jsx';
import'./styles/route-book.css';

const STORAGE_KEY='rehberlik-rota-defteri-v1';
const EFES_STARTER_KEY='rehberlik-rota-efes-calisma-v1';
const EFES_ROUTE={
 id:'starter-efes-antik-kenti',name:'Efes Antik Kenti',region:'Selçuk / İzmir',duration:'3,5–4,5 saat',meetingPoint:'Üst Kapı (Magnesia Kapısı) — çıkış Alt Kapı',favorite:true,updatedAt:'2026-10-15T00:00:00.000Z',
 stops:[
  'Üst Kapı ve Magnesia Kapısı — kent planını, Bülbül ile Panayır dağları arasındaki konumu anlat',
  'Devlet Agorası ve Bazilika — kentin resmî, hukuki ve idari merkezi',
  'Odeon — meclis toplantıları ve küçük gösteriler için kullanılan yapı',
  'Prytaneion — kutsal ocağın yandığı belediye ve tören merkezi',
  'Domitianus Meydanı, Memmius Anıtı ve Pollio Çeşmesi — imparatorluk kültü ve kent seçkinleri',
  'Herakles Kapısı — araç trafiğinin sınırlandığı Kuretler Caddesi başlangıcı',
  'Kuretler Caddesi — çeşmeler, anıtlar, dükkânlar ve kamusal yaşam ekseni',
  'Traianus Çeşmesi — imparatorluk propagandası ve su sistemi',
  'Skolastikia Hamamı ve Latrina — Roma kentinde temizlik, sosyalleşme ve altyapı',
  'Hadrianus Tapınağı — zengin cephe bezemesi ve kentin kuruluş anlatısını taşıyan kabartmalar',
  'Yamaç Evler — mozaikler, freskler, mermer kaplamalar ve seçkinlerin gündelik yaşamı',
  'Celsus Kütüphanesi — anıt mezar, kütüphane ve iki katlı cephe düzeni',
  'Mazeus–Mithridates Kapısı ve Ticaret Agorası — ticaret, köle pazarı tartışmaları ve liman ekonomisi',
  'Mermer Cadde — Kütüphane ile Büyük Tiyatro arasındaki ana bağlantı',
  'Büyük Tiyatro — yaklaşık 25 bin kişilik kapasite, gösteriler, halk toplantıları ve Aziz Paulus anlatısı',
  'Arkadiane (Liman Caddesi) — tiyatrodan antik limana uzanan sütunlu ve aydınlatılmış tören yolu',
  'Alt Kapı çıkışı — limanın alüvyonla dolması, kıyı çizgisinin değişmesi ve kentin gerilemesi'
 ].join('\n'),
 narration:`ANLATIM OMURGASI

1. COĞRAFYA VE KENTİN TAŞINMASI
Efes yalnızca tek bir yerleşim değildir. Kaystros/Küçük Menderes havzasındaki kıyı çizgisi alüvyonla sürekli batıya ilerlediği için yerleşim ve limanlar zaman içinde yer değiştirdi. Bugün gezilen Helenistik kent, Büyük İskender’in ardıllarından Lysimakhos tarafından MÖ 4. yüzyılın sonu ile 3. yüzyılın başında planlandı. Izgara plan, iki dağ arasındaki vadi ve limana bağlanan ana aks üzerinden okunabilir.

2. ARTEMİS VE KİMLİK
Efes Artemis’i, Anadolu’nun eski ana tanrıça gelenekleriyle birleşmiş yerel ve güçlü bir külttür. Artemision antik dünyanın Yedi Harikası arasında sayılır; bugünkü ören yerinin dışında, Ayasuluk yakınındadır. Tapınak yalnızca dinî değil, ekonomik ve diplomatik bir merkezdi.

3. ROMA ASIA EYALETİNİN BAŞKENTİ
Pergamon Krallığı’nın topraklarının Roma’ya geçmesinden sonra Efes, Asia eyaletinin başkenti ve Akdeniz ticaret ağının önemli limanlarından biri oldu. Anıtlar yalnızca güzellik için değil; Roma düzenini, imparatora bağlılığı, bağışçı ailelerin prestijini ve kentin zenginliğini göstermek için yapıldı.

4. YUKARI KENT: YÖNETİM VE KUTSAL OCAK
Devlet Agorası kamusal yönetim alanıdır. Odeon hem küçük gösterilere hem meclis toplantılarına hizmet etti. Prytaneion’da kentin sürekliliğini simgeleyen kutsal ateş yanardı; burada bulunan Artemis heykelleri bugün Efes Müzesi’ndedir. Bu bölümde “şehir nasıl yönetiliyordu?” sorusu üzerinden anlatımı kur.

5. KURETLER CADDESİ: KENT BİR SAHNE
Kuretler Caddesi eğimli yapısı, mermer döşemesi, çeşmeleri, onur anıtları ve cepheleriyle kentin temsil alanıdır. Herakles Kapısı yaya alanına geçişi vurgular. Traianus Çeşmesi suyun mühendislik kadar siyasi bir gösteri olduğunu anlatmak için iyi duraktır. Hadrianus Tapınağı’nın hareketli cephesi ve kabartmaları üzerinden imparatorluk kültünü açıkla.

6. ROMA GÜNDELİK HAYATI
Hamamlar yalnızca yıkanma yeri değil; spor, görüşme ve sosyalleşme mekânlarıydı. Latrina ortak kullanım kültürünü ve gelişmiş kanalizasyon sistemini gösterir. Yamaç Evler’de avlulu plan, yerden ısıtma, temiz ve atık su düzeni, freskler ile mozaikler üzerinden varlıklı Efeslilerin yaşam standardını anlat.

7. CELSUS KÜTÜPHANESİ
MS 2. yüzyılda Tiberius Julius Celsus Polemaeanus onuruna oğlu Aquila tarafından yaptırıldı. Yapı hem kütüphane hem anıt mezardır; Celsus’un lahdi yapının altındaki mezar odasındadır. Cephedeki heykeller bilgelik, erdem, düşünce ve bilgi kavramlarını temsil eder. Cephe, dar alanı daha görkemli göstermek için perspektif etkileri kullanır.

8. TİCARET VE LİMAN
Mazeus–Mithridates Kapısı Ticaret Agorası’na açılır. Agora, limana yakınlığı sayesinde malların ve insanların dolaşım merkezidir. Burada Efes’in tahıl, şarap, zeytinyağı, seramik ve uzak mesafe ticaretindeki konumundan söz et. Kesin kanıt olmayan popüler “ayak izi/reklam” hikâyelerini gerçekmiş gibi sunma; ziyaretçiye bunun modern bir yorum olduğunu belirt.

9. BÜYÜK TİYATRO VE ERKEN HRİSTİYANLIK
Tiyatro yaklaşık 25 bin kişilik kapasitesiyle gösteri, toplantı ve kamusal temsil alanıdır. Yeni Ahit’te anlatılan gümüşçüler olayı ve Aziz Paulus geleneğiyle ilişkilendirilir. Efes daha sonra erken Hristiyanlık için önemli bir merkez olmuş; Meryem Kilisesi ve Ayasuluk’taki Aziz Yuhanna Bazilikası bu çok katmanlı geçmişin parçalarıdır.

10. LİMANIN GERİ ÇEKİLMESİ
Arkadiane, tiyatroyu limana bağlayan geniş sütunlu caddedir. Limanın Küçük Menderes’in taşıdığı alüvyonla dolması, ticaretin zayıflaması ve sıtma gibi çevresel sorunlar kentin dönüşümünde etkili oldu. Kapanışı “Efes’i yükselten liman, kıyı çizgisi değişince kentin kaderini de değiştirdi” fikriyle yap.

KISA AÇILIŞ CÜMLESİ
“Bugün bir harabe değil, yönetimden ticarete, inançtan gündelik yaşama kadar Roma kentinin nasıl çalıştığını adım adım okuyacağımız bir şehir gezeceğiz.”`,
 entrance:`• Güncel açılış-kapanış saatini ve bilet bilgisini turdan önce muze.gov.tr üzerinden kontrol et; dönem ve gece müzeciliğine göre değişebilir.
• Yamaç Evler ören yerinin içindedir fakat giriş uygulaması ve bilet kapsamı değişebilir; gruba başlamadan önce teyit et.
• Üst Kapıdan başlayıp Alt Kapıdan çıkmak genel olarak eğim aşağı ve anlatım açısından rahattır. Araçla buluşma noktasını önceden netleştir.
• Zemin büyük ölçüde mermer, eğimli ve yer yer kaygandır. Rahat ayakkabı, şapka, su ve güneş koruması öner.
• Yoğun sıcaklarda uzun anlatımları gölgeli duraklara taşı; Celsus ve tiyatro çevresinde grup bütünlüğünü özellikle koru.
• Artemis Tapınağı, Efes Müzesi, Aziz Yuhanna Bazilikası ve Meryem Ana Evi ana ören yeri yürüyüşünün dışında ayrı duraklardır.`,
 reminders:`TUR ÖNCESİ
• Kulaklık sistemi, bilet/Müzekart durumu ve araç kapı değişimini kontrol et.
• Misafirlerin hareket kısıtlılığı, çocuk arabası ve sıcak hassasiyetini sor.
• Yamaç Evler için en az 30–45 dakika ek süre ayır.
• Kalabalık grupta Celsus Kütüphanesi önünde yeniden buluşma noktası belirle.

ANLATIMDA DİKKAT
• Nüfus rakamlarını kesin gerçek gibi değil, antik kentler için tahmin olarak aktar.
• “Celsus Kütüphanesi dünyanın üçüncü büyük kütüphanesiydi” iddiasını kesin sıralama olarak kullanma.
• Aşk Evi’ne yön verdiği söylenen ayak izi gibi popüler hikâyeleri “yaygın yorum” diye belirt.
• Artemis heykelindeki biçimleri tek ve tartışmasız bir açıklamaya indirgeme; bereket, süsleme ve kült sembolizmi üzerine farklı yorumlar bulunduğunu söyle.

KAYNAK KONTROLÜ
UNESCO Efes Dünya Mirası kaydı, T.C. Kültür ve Turizm Bakanlığı Efes sayfaları ve Efes Müze Müdürlüğü bilgileri temel alınmıştır.`
};
const emptyRoute=()=>({id:'',name:'',region:'',duration:'',meetingPoint:'',stops:'',narration:'',entrance:'',reminders:'',favorite:false,updatedAt:''});
const readRoutes=()=>{try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'),safe=Array.isArray(rows)?rows:[];if(localStorage.getItem(EFES_STARTER_KEY)!=='1'){const next=safe.some(route=>route.id===EFES_ROUTE.id)?safe:[EFES_ROUTE,...safe];localStorage.setItem(STORAGE_KEY,JSON.stringify(next));localStorage.setItem(EFES_STARTER_KEY,'1');return next}return safe}catch{return[EFES_ROUTE]}};

const Icon=({name})=>{
 const paths={map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,edit:<><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7l3.5 3.5"/></>,trash:<><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,star:<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>};
 return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

function RouteEditor({route,onClose,onSave}){
 const[draft,setDraft]=useState(route||emptyRoute());
 const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const submit=e=>{e.preventDefault();if(!draft.name.trim())return;onSave({...draft,id:draft.id||crypto.randomUUID(),name:draft.name.trim(),updatedAt:new Date().toISOString()})};
 return <div className="route-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <form className="route-modal" onSubmit={submit}>
   <header><div><span className="route-kicker">ROTA DEFTERİ</span><h2>{draft.id?'Rotayı düzenle':'Yeni rota ekle'}</h2></div><button type="button" className="route-close" onClick={onClose} aria-label="Kapat">×</button></header>
   <div className="route-form-grid">
    <label className="wide">Rota adı<input autoFocus value={draft.name} onChange={e=>change('name',e.target.value)} placeholder="Örn. Efes Antik Kenti" required/></label>
    <label>Bölge<input value={draft.region} onChange={e=>change('region',e.target.value)} placeholder="Selçuk / İzmir"/></label>
    <label>Süre<input value={draft.duration} onChange={e=>change('duration',e.target.value)} placeholder="Örn. 4 saat"/></label>
    <label className="wide">Buluşma noktası<input value={draft.meetingPoint} onChange={e=>change('meetingPoint',e.target.value)} placeholder="Başlangıç veya buluşma noktası"/></label>
    <label className="wide">Duraklar<textarea value={draft.stops} onChange={e=>change('stops',e.target.value)} placeholder={'Her satıra bir durak yaz\nGiriş kapısı\nAna meydan\nMüze'}/></label>
    <label className="wide">Anlatım notları<textarea value={draft.narration} onChange={e=>change('narration',e.target.value)} placeholder="Tur sırasında hatırlamak istediğin anlatım başlıkları"/></label>
    <label>Giriş bilgileri<textarea value={draft.entrance} onChange={e=>change('entrance',e.target.value)} placeholder="Bilet, çalışma saati, müze kartı…"/></label>
    <label>Önemli hatırlatmalar<textarea value={draft.reminders} onChange={e=>change('reminders',e.target.value)} placeholder="Kıyafet, ekipman, ulaşım…"/></label>
   </div>
   <footer><button type="button" className="route-btn secondary" onClick={onClose}>Vazgeç</button><button className="route-btn primary">Rotayı kaydet</button></footer>
  </form>
 </div>;
}

export default function RouteBook(){
 const[routes,setRoutes]=useState(readRoutes),[query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(()=>readRoutes()[0]?.id||''),[editing,setEditing]=useState(null);
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(routes))}catch{}},[routes]);
 useEffect(()=>{if(selectedId&&!routes.some(route=>route.id===selectedId))setSelectedId(routes[0]?.id||'')},[routes,selectedId]);
 const filtered=useMemo(()=>{const q=query.trim().toLocaleLowerCase('tr-TR');return[...routes].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name,'tr')).filter(route=>!q||[route.name,route.region,route.stops,route.narration].some(value=>String(value||'').toLocaleLowerCase('tr-TR').includes(q)))},[routes,query]);
 const selected=routes.find(route=>route.id===selectedId)||filtered[0];
 const save=route=>{setRoutes(current=>{const exists=current.some(item=>item.id===route.id);return exists?current.map(item=>item.id===route.id?route:item):[route,...current]});setSelectedId(route.id);setEditing(null)};
 const remove=route=>{if(!confirm(`“${route.name}” rotası silinsin mi?`))return;setRoutes(current=>current.filter(item=>item.id!==route.id))};
 const toggleFavorite=route=>setRoutes(current=>current.map(item=>item.id===route.id?{...item,favorite:!item.favorite}:item));
 const stops=String(selected?.stops||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 return <HomePage contentClassName="route-book-page">
  <section className="route-hero">
   <div><span className="route-kicker">REHBER ÇALIŞMA ALANI</span><h1>Rota Defteri</h1><p>Anlatım notlarını, durakları ve tur öncesi önemli bilgileri tek yerde tut.</p></div>
   <div className="route-hero-mark"><Icon name="map"/></div>
   <button className="route-btn primary" onClick={()=>setEditing(emptyRoute())}><Icon name="plus"/>Yeni rota</button>
  </section>
  <section className="route-summary" aria-label="Rota özeti">
   <article><strong>{routes.length}</strong><span>Kayıtlı rota</span></article>
   <article><strong>{routes.filter(x=>x.favorite).length}</strong><span>Favori rota</span></article>
   <article><strong>{new Set(routes.map(x=>x.region).filter(Boolean)).size}</strong><span>Farklı bölge</span></article>
  </section>
  <div className="route-workspace">
   <aside className="route-library">
    <div className="route-library-head"><div><span className="route-kicker">KÜTÜPHANE</span><h2>Rotalarım</h2></div><button className="route-square-add" onClick={()=>setEditing(emptyRoute())} aria-label="Yeni rota ekle"><Icon name="plus"/></button></div>
    <label className="route-search"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rota, bölge veya not ara…"/></label>
    <div className="route-list">{filtered.length?filtered.map(route=><button key={route.id} className={`route-list-item ${selected?.id===route.id?'active':''}`} onClick={()=>setSelectedId(route.id)}><span className="route-list-icon"><Icon name="pin"/></span><span><strong>{route.name}</strong><small>{route.region||'Bölge belirtilmedi'}{route.duration?` · ${route.duration}`:''}</small></span>{route.favorite&&<b className="route-favorite">★</b>}</button>):<div className="route-empty-small"><Icon name="map"/><strong>{routes.length?'Aramana uygun rota yok':'Henüz rota eklenmedi'}</strong><span>{routes.length?'Başka bir kelime deneyebilirsin.':'İlk rotanı ekleyerek defterini oluşturmaya başla.'}</span></div>}</div>
   </aside>
   <section className="route-detail">{selected?<>
    <header className="route-detail-head"><div><span className="route-kicker">ROTA DETAYI</span><h2>{selected.name}</h2><p>{selected.region||'Bölge belirtilmedi'}{selected.duration?` · ${selected.duration}`:''}</p></div><div className="route-detail-actions"><button onClick={()=>toggleFavorite(selected)} className={selected.favorite?'favorite':''} aria-label="Favoriye ekle"><Icon name="star"/></button><button onClick={()=>setEditing(selected)} aria-label="Rotayı düzenle"><Icon name="edit"/></button><button onClick={()=>remove(selected)} className="danger" aria-label="Rotayı sil"><Icon name="trash"/></button></div></header>
    <div className="route-info-strip"><article><Icon name="pin"/><span>Buluşma noktası<strong>{selected.meetingPoint||'Belirtilmedi'}</strong></span></article><article><Icon name="clock"/><span>Tahmini süre<strong>{selected.duration||'Belirtilmedi'}</strong></span></article></div>
    <div className="route-detail-grid">
     <article className="route-section-card stops"><span className="route-kicker">TUR AKIŞI</span><h3>Duraklar</h3>{stops.length?<ol>{stops.map((stop,index)=><li key={`${stop}-${index}`}><b>{index+1}</b><span>{stop}</span></li>)}</ol>:<p>Henüz durak eklenmedi.</p>}</article>
     <article className="route-section-card narration"><span className="route-kicker">ANLATIM</span><h3>Anlatım notları</h3><p>{selected.narration||'Henüz anlatım notu eklenmedi.'}</p></article>
     <article className="route-section-card"><span className="route-kicker">ZİYARET</span><h3>Giriş bilgileri</h3><p>{selected.entrance||'Henüz giriş bilgisi eklenmedi.'}</p></article>
     <article className="route-section-card reminder"><span className="route-kicker">HATIRLATMA</span><h3>Önemli notlar</h3><p>{selected.reminders||'Henüz hatırlatma eklenmedi.'}</p></article>
    </div>
   </>:<div className="route-empty-detail"><div><Icon name="map"/></div><h2>Rota defterin hazır</h2><p>İlk rotanı eklediğinde tur akışın ve tüm notların burada görünecek.</p><button className="route-btn primary" onClick={()=>setEditing(emptyRoute())}><Icon name="plus"/>İlk rotayı ekle</button></div>}</section>
  </div>
  {editing&&<RouteEditor route={editing} onClose={()=>setEditing(null)} onSave={save}/>} 
 </HomePage>;
}
