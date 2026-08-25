async function parseResponse(response) {
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const details = Array.isArray(data.bindings)
      ? ` [Bindings: ${data.bindings.map(x => `${x.name}:${x.type}`).join(', ')}]`
      : '';
    throw new Error((data.error || `Sunucu hatası (${response.status})`) + details);
  }
  return data;
}
 
export async function loadRecords() {
  const data = await fetch('/api/records', { headers: { accept: 'application/json' }, cache: 'no-store' }).then(parseResponse);
  return Array.isArray(data.records) ? data.records : [];
}
 
export async function createRecord(record) {
  const data = await fetch('/api/records', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ record }) }).then(parseResponse);
  return data.records?.[0] || record;
}
 
export async function createRecords(records) {
  const data = await fetch('/api/records', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ records }) }).then(parseResponse);
  return Array.isArray(data.records) ? data.records : records;
}
 
export async function updateRecordStatus(id, status) {
  return fetch('/api/records', { method: 'PATCH', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ id, status }) }).then(parseResponse);
}

export async function updateRecord(record) {
  const data = await fetch('/api/records', { method: 'PATCH', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ record }) }).then(parseResponse);
  return data.record || record;
}
 
export async function deleteRecord(id) {
  return fetch(`/api/records?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { accept: 'application/json' } }).then(parseResponse);
}
 
export async function deleteRecords(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 12) {
    await Promise.all(unique.slice(i, i + 12).map(deleteRecord));
  }
  return unique;
}
