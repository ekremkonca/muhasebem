import { audit, errorResponse, getDb, json, requireSession, snapshotRecords } from '../_lib.js';

const dateOk=value=>{const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;const[y,m,d]=text.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d};
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const parse=value=>{try{return JSON.parse(value||'{}')}catch{return{}}};
const archiveFields='id,title,start_date,end_date,summary,created_at';

const ratesFrom=async db=>{
  const result=await db.prepare("SELECT key,value FROM settings WHERE key LIKE 'rate_%'").all();
  const rates={TRY:1,USD:46.3,EUR:53,GBP:62.3};
  for(const row of result.results||[]){const code=String(row.key).replace('rate_','');const value=Number(row.value);if(code in rates&&value>0)rates[code]=value}
  rates.TRY=1;return rates;
};

const LEGACY_REALIZED_FX_TRY=610*46.44+320*62.34+545*53.07;
export const summarizeSeason=(records,rates,startDate='9999-12-31',events=[])=>{
  const value=row=>number(row.amount)*(number(rates[row.currency||'TRY'])||1);
  const outstanding=row=>Math.max(0,number(row.amount)-number(row.paid_amount))*(number(rates[row.currency||'TRY'])||1);
  const paid=records.filter(row=>row.status==='Ödendi');
  const tourIncome=paid.filter(row=>row.type==='Tur Geliri').reduce((sum,row)=>sum+value(row),0);
  const tips=paid.filter(row=>row.type==='Bahşiş').reduce((sum,row)=>sum+value(row),0);
  const commission=paid.filter(row=>row.type==='Komisyon').reduce((sum,row)=>sum+value(row),0);
  const realizedTipCommission=paid.filter(row=>row.date>='2026-04-16'&&(row.currency||'TRY')==='TRY'&&['Bahşiş','Komisyon'].includes(row.type)).reduce((sum,row)=>sum+value(row),0);
  const expense=paid.filter(row=>row.type==='Tur Masrafı').reduce((sum,row)=>sum+value(row),0);
  const receivable=records.filter(row=>row.status==='Ödenmedi'&&['Tur Geliri','Bahşiş','Komisyon'].includes(row.type)).reduce((sum,row)=>sum+outstanding(row),0);
  const tourCount=records.filter(row=>row.type==='Tur Geliri'&&row.status!=='İade edildi'&&number(row.amount)>0).length;
  const legacyAdjustments=startDate<='2026-07-10'?LEGACY_REALIZED_FX_TRY+134*(number(rates.EUR)||0):0;
  return {tourIncome,tips,commission,expense,net:tourIncome+realizedTipCommission+legacyAdjustments-expense,recordedNet:tourIncome+tips+commission-expense,receivable,tourCount,eventCount:events.length,recordCount:records.length,rates};
};

export async function onRequestGet(context){
  try{
    const db=await getDb(context);await requireSession(context,db);
    const url=new URL(context.request.url),id=String(url.searchParams.get('id')||'');
    if(id){const row=await db.prepare(`SELECT ${archiveFields},data FROM season_archives WHERE id=?`).bind(id).first();if(!row)return json({error:'Sezon arşivi bulunamadı.'},404);return json({archive:{...row,summary:parse(row.summary),data:parse(row.data)}})}
    const result=await db.prepare(`SELECT ${archiveFields} FROM season_archives ORDER BY end_date DESC,created_at DESC`).all();
    const settings=await db.prepare("SELECT key,value FROM settings WHERE key IN ('active_season_title','active_season_start')").all();
    const active=Object.fromEntries((settings.results||[]).map(row=>[row.key,row.value]));
    return json({archives:(result.results||[]).map(row=>({...row,summary:parse(row.summary)})),active:{title:active.active_season_title||'Aktif Sezon',startDate:active.active_season_start||'2026-04-01'}});
  }catch(error){return errorResponse(error,'Sezon arşivleri okunamadı.')}
}

export async function onRequestPost(context){
  try{
    const db=await getDb(context);await requireSession(context,db);
    const body=await context.request.json().catch(()=>({}));
    if(body.action!=='archive')return json({error:'Geçersiz sezon işlemi.'},400);
    const title=String(body.title||'').trim().slice(0,80),startDate=String(body.startDate||''),endDate=String(body.endDate||''),newTitle=String(body.newTitle||'Yeni Sezon').trim().slice(0,80),newStart=String(body.newStart||'');
    const carryReceivables=body.carryReceivables!==false;
    if(!title)return json({error:'Sezon adı gerekli.'},400);
    if(!dateOk(startDate)||!dateOk(endDate)||startDate>endDate)return json({error:'Geçerli sezon tarih aralığı gerekli.'},400);
    if(!dateOk(newStart)||newStart<=endDate)return json({error:'Yeni sezon başlangıcı, kapanan sezonun bitişinden sonra olmalı.'},400);
    const duplicate=await db.prepare('SELECT id FROM season_archives WHERE title=? OR (start_date=? AND end_date=?)').bind(title,startDate,endDate).first();
    if(duplicate)return json({error:'Bu ad veya tarih aralığıyla bir sezon zaten arşivlenmiş.'},409);
    const [recordsResult,eventsResult,movementsResult,closingsResult,rates]=await Promise.all([
      db.prepare('SELECT * FROM records WHERE deleted_at IS NULL AND date BETWEEN ? AND ? ORDER BY date,created_at').bind(startDate,endDate).all(),
      db.prepare('SELECT * FROM calendar_events WHERE date BETWEEN ? AND ? ORDER BY date,time,created_at').bind(startDate,endDate).all(),
      db.prepare('SELECT * FROM cash_movements WHERE date BETWEEN ? AND ? ORDER BY date,created_at').bind(startDate,endDate).all(),
      db.prepare('SELECT * FROM month_closings WHERE month BETWEEN ? AND ? ORDER BY month').bind(startDate.slice(0,7),endDate.slice(0,7)).all(),
      ratesFrom(db),
    ]);
    const records=recordsResult.results||[],events=eventsResult.results||[],movements=movementsResult.results||[],closings=closingsResult.results||[];
    if(!records.length&&!events.length)return json({error:'Bu tarih aralığında arşivlenecek kayıt bulunamadı.'},400);
    const summary=summarizeSeason(records,rates,startDate,events),id=crypto.randomUUID();
    const data={version:1,records,events,movements,closings,archivedRates:rates};
    await snapshotRecords(db,`Sezon arşivi öncesi — ${title}`,'pre-season-archive');
    const statements=[
      db.prepare('INSERT INTO season_archives (id,title,start_date,end_date,summary,data) VALUES (?,?,?,?,?,?)').bind(id,title,startDate,endDate,JSON.stringify(summary),JSON.stringify(data)),
      db.prepare('DELETE FROM calendar_events WHERE date BETWEEN ? AND ?').bind(startDate,endDate),
      db.prepare('DELETE FROM records WHERE deleted_at IS NULL AND date BETWEEN ? AND ?').bind(startDate,endDate),
      db.prepare('DELETE FROM cash_movements WHERE date BETWEEN ? AND ?').bind(startDate,endDate),
      db.prepare('DELETE FROM month_closings WHERE month BETWEEN ? AND ?').bind(startDate.slice(0,7),endDate.slice(0,7)),
      db.prepare("INSERT INTO settings(key,value,updated_at) VALUES('active_season_title',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(newTitle||'Yeni Sezon'),
      db.prepare("INSERT INTO settings(key,value,updated_at) VALUES('active_season_start',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(newStart),
    ];
    if(carryReceivables){
      for(const row of records.filter(row=>row.status==='Ödenmedi'&&['Tur Geliri','Bahşiş','Komisyon'].includes(row.type)&&number(row.amount)>number(row.paid_amount))){
        const remaining=Math.max(0,number(row.amount)-number(row.paid_amount));
        statements.push(db.prepare(`INSERT INTO records (id,date,tour,guest,agency,ship,type,amount,currency,status,due_date,paid_amount,tags,source_event_id,note,deleted_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'Ödenmedi',?,0,?,'',?,NULL,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),newStart,row.tour,row.guest,row.agency,row.ship,row.type,remaining,row.currency,row.due_date&&row.due_date>=newStart?row.due_date:newStart,row.tags,`Devreden alacak — ${title}${row.note?` · ${row.note}`:''}`));
      }
    }
    await db.batch(statements);
    await audit(db,id,'season_archive',{title,startDate,endDate,newTitle,newStart,carryReceivables,summary});
    return json({ok:true,id,summary,carriedReceivables:carryReceivables?records.filter(row=>row.status==='Ödenmedi'&&['Tur Geliri','Bahşiş','Komisyon'].includes(row.type)&&number(row.amount)>number(row.paid_amount)).length:0},201);
  }catch(error){return errorResponse(error,'Sezon arşivlenemedi.')}
}
