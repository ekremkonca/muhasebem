import { errorResponse, getDb, json, requireSession } from '../_lib.js';

const DEFAULT_DEPOSIT={bank:'AKBANK',principal:2000000,annualRate:40.25,startDate:'2026-08-24',days:32,withholdingRate:17.5};
const DEFAULT_FUND={fundCode:'ALE',baseUnits:69442,baseAveragePrice:13.04,transactions:[]};
const KEY_DEPOSIT='asset_deposit';
const KEY_FUND='asset_fund';

const parse=(raw,fallback)=>{try{return raw?{...fallback,...JSON.parse(raw)}:fallback}catch{return fallback}};
const cleanDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):null;
const finite=value=>Number.isFinite(Number(value));

function validateDeposit(input){
 const deposit={
  bank:String(input?.bank||'').trim().slice(0,40),
  principal:Number(input?.principal),
  annualRate:Number(input?.annualRate),
  startDate:cleanDate(input?.startDate),
  days:Math.round(Number(input?.days)),
  withholdingRate:Number(input?.withholdingRate),
 };
 if(!deposit.bank)throw Object.assign(new Error('Banka adı gerekli.'),{status:400});
 if(!finite(deposit.principal)||deposit.principal<=0)throw Object.assign(new Error('Ana para sıfırdan büyük olmalı.'),{status:400});
 if(!finite(deposit.annualRate)||deposit.annualRate<0||deposit.annualRate>200)throw Object.assign(new Error('Faiz oranı geçersiz.'),{status:400});
 if(!deposit.startDate)throw Object.assign(new Error('Başlangıç tarihi geçersiz.'),{status:400});
 if(!Number.isInteger(deposit.days)||deposit.days<1||deposit.days>366)throw Object.assign(new Error('Vade günü 1-366 arasında olmalı.'),{status:400});
 if(!finite(deposit.withholdingRate)||deposit.withholdingRate<0||deposit.withholdingRate>100)throw Object.assign(new Error('Stopaj oranı geçersiz.'),{status:400});
 return deposit;
}

function validateFund(input){
 const fund={
  fundCode:'ALE',
  baseUnits:Number(input?.baseUnits),
  baseAveragePrice:Number(input?.baseAveragePrice),
  transactions:Array.isArray(input?.transactions)?input.transactions:[],
 };
 if(!finite(fund.baseUnits)||fund.baseUnits<0)throw Object.assign(new Error('Başlangıç fon adedi geçersiz.'),{status:400});
 if(!finite(fund.baseAveragePrice)||fund.baseAveragePrice<0)throw Object.assign(new Error('Başlangıç maliyeti geçersiz.'),{status:400});
 if(fund.transactions.length>250)throw Object.assign(new Error('En fazla 250 fon hareketi saklanabilir.'),{status:400});
 fund.transactions=fund.transactions.map((row,index)=>{
  const type=['buy','sell','set'].includes(row?.type)?row.type:null;
  const date=cleanDate(row?.date);
  const units=Number(row?.units);
  const price=row?.price===''||row?.price==null?null:Number(row.price);
  if(!type||!date||!finite(units)||units<0)throw Object.assign(new Error(`${index+1}. fon hareketi geçersiz.`),{status:400});
  if(type==='buy'&&(!finite(price)||price<=0))throw Object.assign(new Error('Alım işleminde fiyat gerekli.'),{status:400});
  if(price!=null&&(!finite(price)||price<0))throw Object.assign(new Error('Fon işlem fiyatı geçersiz.'),{status:400});
  return {id:String(row?.id||crypto.randomUUID()),date,type,units,price,note:String(row?.note||'').slice(0,100)};
 });
 return fund;
}

async function readSettings(db){
 const result=await db.prepare("SELECT key,value,updated_at FROM settings WHERE key IN (?,?)").bind(KEY_DEPOSIT,KEY_FUND).all();
 let deposit=DEFAULT_DEPOSIT,fund=DEFAULT_FUND,updatedAt=null;
 for(const row of result.results||[]){
  if(row.key===KEY_DEPOSIT)deposit=parse(row.value,DEFAULT_DEPOSIT);
  if(row.key===KEY_FUND)fund=parse(row.value,DEFAULT_FUND);
  if(!updatedAt||row.updated_at>updatedAt)updatedAt=row.updated_at;
 }
 return {deposit,fund,updatedAt};
}

async function save(db,key,value){
 await db.prepare(`INSERT INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key,JSON.stringify(value)).run();
}

export async function onRequestGet(context){
 try{
  const db=await getDb(context);await requireSession(context,db);
  return json(await readSettings(db));
 }catch(error){return errorResponse(error,'Varlık ayarları okunamadı.')}
}

export async function onRequestPut(context){
 try{
  const db=await getDb(context);await requireSession(context,db);
  const body=await context.request.json().catch(()=>({}));
  if(body.deposit!==undefined)await save(db,KEY_DEPOSIT,validateDeposit(body.deposit));
  if(body.fund!==undefined)await save(db,KEY_FUND,validateFund(body.fund));
  return json(await readSettings(db));
 }catch(error){return errorResponse(error,'Varlık ayarları kaydedilemedi.')}
}
