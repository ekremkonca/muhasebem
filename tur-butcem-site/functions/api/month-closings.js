import { audit, errorResponse, getDb, json, requireSession } from '../_lib.js';

const fields='id,month,income,expense,cash_value,receivable,net,snapshot,note,created_at,updated_at';
const number=(value)=>Number.isFinite(Number(value))?Number(value):0;

export async function onRequestGet(context){
  try{const db=await getDb(context);await requireSession(context,db);const result=await db.prepare(`SELECT ${fields} FROM month_closings ORDER BY month DESC`).all();return json({closings:result.results||[]});}
  catch(error){return errorResponse(error,'Aylık kapanışlar okunamadı.');}
}

export async function onRequestPost(context){
  try{
    const db=await getDb(context);await requireSession(context,db);const body=await context.request.json();
    const month=String(body.month||'');if(!/^\d{4}-\d{2}$/.test(month)) return json({error:'Geçerli ay gerekli.'},400);
    const row={id:String(body.id||`closing-${month}`),month,income:number(body.income),expense:number(body.expense),cash_value:number(body.cash_value),receivable:number(body.receivable),net:number(body.net),snapshot:JSON.stringify(body.snapshot||{}),note:String(body.note||'').trim().slice(0,240)};
    await db.prepare(`INSERT INTO month_closings (id,month,income,expense,cash_value,receivable,net,snapshot,note) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(month) DO UPDATE SET income=excluded.income,expense=excluded.expense,cash_value=excluded.cash_value,receivable=excluded.receivable,net=excluded.net,snapshot=excluded.snapshot,note=excluded.note,updated_at=CURRENT_TIMESTAMP`).bind(row.id,row.month,row.income,row.expense,row.cash_value,row.receivable,row.net,row.snapshot,row.note).run();
    await audit(db,row.id,'month_closing_save',{month,row});return json({closing:row});
  }catch(error){return errorResponse(error,'Aylık kapanış kaydedilemedi.');}
}

export async function onRequestDelete(context){
  try{const db=await getDb(context);await requireSession(context,db);const id=String(new URL(context.request.url).searchParams.get('id')||'');const before=await db.prepare(`SELECT ${fields} FROM month_closings WHERE id=?`).bind(id).first();if(!before)return json({error:'Kapanış bulunamadı.'},404);await db.prepare('DELETE FROM month_closings WHERE id=?').bind(id).run();await audit(db,id,'month_closing_delete',{before});return json({id,deleted:true});}
  catch(error){return errorResponse(error,'Aylık kapanış silinemedi.');}
}
