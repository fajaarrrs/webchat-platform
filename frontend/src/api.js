const API_URL = 'http://localhost:5000/api';
export const BASE_URL = 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('wchat_token');
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) throw new Error('Endpoint tidak ditemukan (404).');
    if (res.status >= 500) throw new Error('Server mengalami kesalahan internal. Coba lagi nanti.');
    if (!res.ok) throw new Error(`Server merespons dengan status ${res.status}.`);
    throw new Error('Server tidak merespons dengan format yang benar.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
  return data;
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan server sedang berjalan.');
  }
  return parseResponse(res);
}

async function uploadFile(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan server sedang berjalan.');
  }
  return parseResponse(res);
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) => uploadFile(path, formData),
};
