async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  let data = {};
  if (contentType.includes('application/json')) {
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
  }

  if (!contentType.includes('application/json')) {
    const error = new Error(`API yanıtı geçersiz (${response.status}). Cloudflare Pages Functions deployment kontrol edilmeli.`);
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.error || `Sunucu hatası (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const request = (url, options = {}) => fetch(url, {
  credentials: 'same-origin',
  cache: 'no-store',
  headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) },
  ...options,
}).then(parseResponse);

const AUTH_CACHE_MS = 15000;
let authCache = null;
let authCacheAt = 0;
let authInFlight = null;
const setAuthCache = data => {
  if(data && typeof data === 'object'){
    authCache={...data,configured:data.configured ?? (data.authenticated ? true : (authCache?.configured ?? false))};
  }else authCache=null;
  authCacheAt=Date.now();
  return authCache ?? data;
};

export const getHealth = () => request('/api/health');
export const getAuthState = (fresh = false) => {
  if (!fresh && authCache && Date.now() - authCacheAt < AUTH_CACHE_MS) return Promise.resolve(authCache);
  if (!fresh && authInFlight) return authInFlight;
  authInFlight = request('/api/auth').then(setAuthCache).finally(() => { authInFlight = null; });
  return authInFlight;
};
export const setupPin = (pin) => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'setup', pin }) }).then(setAuthCache);
export const login = (pin) => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', pin }) }).then(setAuthCache);
export const logout = () => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }).then(setAuthCache);

export async function loadRecords(trash = false) {
  const data = await request(`/api/records${trash ? '?trash=1' : ''}`);
  return Array.isArray(data.records) ? data.records : [];
}
export async function createRecord(record) {
  const data = await request('/api/records', { method: 'POST', body: JSON.stringify({ record }) });
  return data.records?.[0] || record;
}
export async function createRecords(records) {
  const data = await request('/api/records', { method: 'POST', body: JSON.stringify({ records }) });
  return Array.isArray(data.records) ? data.records : records;
}
export const updateRecordStatus = (id, status) => request('/api/records', { method: 'PATCH', body: JSON.stringify({ id, status }) });
export async function updateRecord(record) {
  const data = await request('/api/records', { method: 'PATCH', body: JSON.stringify({ record }) });
  return data.record || record;
}
export const deleteRecord = (id) => request(`/api/records?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const permanentDeleteRecord = (id) => request(`/api/records?id=${encodeURIComponent(id)}&permanent=1`, { method: 'DELETE' });
export async function restoreRecord(id) {
  const data = await request('/api/records', { method: 'PATCH', body: JSON.stringify({ action: 'restore', id }) });
  return data.record;
}
export async function deleteRecords(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 12) await Promise.all(unique.slice(i, i + 12).map(deleteRecord));
  return unique;
}

export const loadSettings = () => request('/api/settings');
export const saveRates = (rates) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ rates }) });
export const loadBackups = () => request('/api/backups');
export const createBackup = (title = 'Manuel yedek') => request('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'create', title }) });
export const restoreBackup = (id) => request('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'restore', id }) });
export const exportBackup = (id) => request('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'export', id }) });
export const loadHistory = (limit = 50) => request(`/api/history?limit=${limit}`);
