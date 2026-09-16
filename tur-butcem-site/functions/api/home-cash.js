import {getDb, requireSession, json, errorResponse} from '../_lib.js';
const defaults = [{code:'USD',amount:189},{code:'TRY',amount:9300},{code:'EUR',amount:134,label:'Annem'},{code:'EUR',amount:20,label:'EURO'}];
export async function onRequest(context) {
 try {
  const db=await getDb(context); await requireSession(context,db);
  if(context.request.method==='GET') {
   const row=await db.prepare("SELECT value FROM settings WHERE key='home_cash'").first();
   return json({balances:row?JSON.parse(row.value):defaults});
  }
  if(context.request.method!=='PUT') return json({error:'Yöntem desteklenmiyor.'},405);
  const {balances}=await context.request.json();
  if(!Array.isArray(balances)||balances.length>20||balances.some(x=>!['USD','EUR','GBP','TRY'].includes(x.code)||typeof x.amount!=='number'||!Number.isFinite(x.amount)||x.amount<0||x.amount>1e12||typeof (x.label??'')!=='string'||(x.label??'').length>24)) return json({error:'Geçerli para birimi ve sıfır veya pozitif tutar girin.'},400);
  const clean=balances.map(({code,amount,label})=>({code,amount,label:(label||'').trim()}));
  await db.batch([
   db.prepare("INSERT INTO settings(key,value,updated_at) SELECT 'home_cash_previous',value,CURRENT_TIMESTAMP FROM settings WHERE key='home_cash' ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP"),
   db.prepare("INSERT INTO settings(key,value,updated_at) VALUES ('home_cash',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(clean))
  ]);
  return json({balances:clean});
 } catch(e){return errorResponse(e,'EV KASA kaydedilemedi.');}
}
