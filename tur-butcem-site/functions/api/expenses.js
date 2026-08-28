import { errorResponse, getDb, json, requireSession } from "../_lib.js";

const CATEGORIES=["Market","Fatura","Ulaşım","Yeme İçme","Sağlık","Ev","Giyim","Eğlence","Eğitim","Seyahat","Vergi","Diğer"];
const METHODS=["Nakit","Banka Kartı","Kredi Kartı","Havale / EFT","Otomatik Ödeme"];
const cleanDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||""))?String(value):null;
async function ensure(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,date TEXT NOT NULL,merchant TEXT NOT NULL,category TEXT NOT NULL,
  amount REAL NOT NULL,payment_method TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',
  recurring INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`).run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC)").run();
}
function validate(input){
 const row={
  id:String(input?.id||crypto.randomUUID()),
  date:cleanDate(input?.date),
  merchant:String(input?.merchant||"").trim().slice(0,120),
  category:CATEGORIES.includes(input?.category)?input.category:"Diğer",
  amount:Number(input?.amount),
  payment_method:METHODS.includes(input?.payment_method)?input.payment_method:"Nakit",
  note:String(input?.note||"").trim().slice(0,500),
  recurring:input?.recurring?1:0
 };
 if(!row.date)throw Object.assign(new Error("Geçerli bir tarih gerekli."),{status:400});
 if(!row.merchant)throw Object.assign(new Error("Harcama açıklaması gerekli."),{status:400});
 if(!Number.isFinite(row.amount)||row.amount<=0||row.amount>100000000)throw Object.assign(new Error("Tutar sıfırdan büyük olmalı."),{status:400});
 return row;
}
export async function onRequestGet(context){
 try{const db=await getDb(context);await requireSession(context,db);await ensure(db);
  const result=await db.prepare("SELECT * FROM expenses ORDER BY date DESC,created_at DESC LIMIT 2000").all();
  return json({expenses:result.results||[]});
 }catch(error){return errorResponse(error,"Harcama kayıtları okunamadı.");}
}
export async function onRequestPost(context){
 try{const db=await getDb(context);await requireSession(context,db);await ensure(db);const row=validate(await context.request.json().catch(()=>({})));
  await db.prepare(`INSERT INTO expenses(id,date,merchant,category,amount,payment_method,note,recurring) VALUES(?,?,?,?,?,?,?,?)`).bind(row.id,row.date,row.merchant,row.category,row.amount,row.payment_method,row.note,row.recurring).run();
  return json({expense:row},201);
 }catch(error){return errorResponse(error,"Harcama kaydedilemedi.");}
}
export async function onRequestPut(context){
 try{const db=await getDb(context);await requireSession(context,db);await ensure(db);const row=validate(await context.request.json().catch(()=>({})));
  await db.prepare(`UPDATE expenses SET date=?,merchant=?,category=?,amount=?,payment_method=?,note=?,recurring=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.date,row.merchant,row.category,row.amount,row.payment_method,row.note,row.recurring,row.id).run();
  return json({expense:row});
 }catch(error){return errorResponse(error,"Harcama güncellenemedi.");}
}
export async function onRequestDelete(context){
 try{const db=await getDb(context);await requireSession(context,db);await ensure(db);const id=String(new URL(context.request.url).searchParams.get("id")||"");
  if(!id)return json({error:"Kayıt kimliği gerekli."},400);
  await db.prepare("DELETE FROM expenses WHERE id=?").bind(id).run();return json({ok:true});
 }catch(error){return errorResponse(error,"Harcama silinemedi.");}
}
