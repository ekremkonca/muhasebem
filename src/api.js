async function parseResponse(response) {
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || `Sunucu hatası (${response.status})`);
  return data;
}

export async function loadRecords() {
  const data = await fetch('/api/records', { headers: { accept: 'application/json' } }).then(parseResponse);
  return Array.isArray(data.records) ? data.records : [];
}

export async function createRecord(record) {
  const data = await fetch('/api/records', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ record }),
  }).then(parseResponse);
  return data.records?.[0] || record;
}

export async function updateRecordStatus(id, status) {
  return fetch('/api/records', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, status }),
  }).then(parseResponse);
}

export async function deleteRecord(id) {
  return fetch(`/api/records?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(parseResponse);
}
