import { errorResponse, getDb, json, requireSession } from '../_lib.js';

export async function onRequestGet(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const url = new URL(context.request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));
    const result = await db.prepare(`SELECT id,record_id,action,details,created_at FROM audit_log ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
    return json({ history: result.results || [] });
  } catch (error) {
    return errorResponse(error, 'İşlem geçmişi okunamadı.');
  }
}


export async function onRequestDelete(context) {
  try {
    const db = await getDb(context);
    await requireSession(context, db);
    const id = String(new URL(context.request.url).searchParams.get("id") || "");
    if (!id) return json({ error: "Geçmiş kaydı kimliği gerekli." }, 400);
    const result = await db.prepare("DELETE FROM audit_log WHERE id=?").bind(id).run();
    return json({ ok: true, deleted: Number(result.meta?.changes || 0) });
  } catch (error) {
    return errorResponse(error, "İşlem geçmişi kalıcı olarak silinemedi.");
  }
}
