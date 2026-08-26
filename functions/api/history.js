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
