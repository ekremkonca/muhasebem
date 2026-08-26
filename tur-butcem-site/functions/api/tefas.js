const TEFAS_BASE='https://www.tefas.gov.tr/api/funds';

const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function tefas(endpoint,payload,fundCode){
  const response=await fetch(`${TEFAS_BASE}/${endpoint}`,{
    method:'POST',
    headers:{
      'accept':'application/json, text/plain, */*',
      'content-type':'application/json',
      'origin':'https://www.tefas.gov.tr',
      'referer':`https://www.tefas.gov.tr/tr/fon-detayli-analiz/${fundCode}`
    },
    body:JSON.stringify(payload)
  });
  if(!response.ok)throw new Error(`TEFAS ${endpoint} HTTP ${response.status}`);
  const data=await response.json();
  if(data?.errorMessage)throw new Error(data.errorMessage);
  return Array.isArray(data?.resultList)?data.resultList:[];
}

const numberOrNull=value=>{
  if(value===null||value===undefined||value==='')return null;
  const parsed=Number(String(value).replace(',','.'));
  return Number.isFinite(parsed)?parsed:null;
};

export async function onRequestGet({request}){
  const url=new URL(request.url);
  const fundCode=(url.searchParams.get('fund')||'ALE').trim().toUpperCase();
  if(!/^[A-Z0-9]{2,5}$/.test(fundCode))return respond({error:'Geçersiz fon kodu.'},400);

  const [infoResult,historyResult]=await Promise.allSettled([
    tefas('fonBilgiGetir',{fonKodu:fundCode},fundCode),
    tefas('fonFiyatBilgiGetir',{fonKodu:fundCode,dil:'TR',periyod:1},fundCode)
  ]);

  const infoRows=infoResult.status==='fulfilled'?infoResult.value:[];
  const historyRows=historyResult.status==='fulfilled'?historyResult.value:[];
  if(!infoRows.length&&!historyRows.length){
    const detail=[infoResult,historyResult].filter(x=>x.status==='rejected').map(x=>x.reason?.message).filter(Boolean).join(' · ');
    return respond({error:'TEFAS verisine ulaşılamadı.',detail},502);
  }

  const info=infoRows[0]||{};
  const history=historyRows.map(row=>({
    date:String(row?.tarih||'').slice(0,10),
    price:numberOrNull(row?.fiyat),
    name:row?.fonUnvan||''
  })).filter(row=>row.date&&row.price!==null).sort((a,b)=>a.date.localeCompare(b.date));

  const latest=history.at(-1)||null;
  const previous=history.at(-2)||null;
  const price=numberOrNull(info?.sonFiyat)??latest?.price??null;
  let dailyReturn=numberOrNull(info?.gunlukGetiri);
  let dailyReturnSource='TEFAS fonBilgiGetir';
  if(dailyReturn===null&&price!==null&&previous?.price){
    dailyReturn=((price/previous.price)-1)*100;
    dailyReturnSource='TEFAS fiyat geçmişinden hesaplandı';
  }

  return respond({
    fundCode,
    name:info?.fonUnvan||latest?.name||fundCode,
    category:info?.fonKategori||'',
    price,
    dailyReturn,
    dailyReturnSource,
    fundSize:numberOrNull(info?.portBuyukluk),
    investorCount:numberOrNull(info?.yatirimciSayi),
    publishedDate:latest?.date||null,
    previousPrice:previous?.price??null,
    history,
    source:'TEFAS',
    sourceUrl:`https://www.tefas.gov.tr/tr/fon-detayli-analiz/${fundCode}`,
    fetchedAt:new Date().toISOString()
  });
}
