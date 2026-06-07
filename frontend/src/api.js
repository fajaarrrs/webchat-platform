export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const API_BASE_URL = `${BASE_URL}/api`;

function withLeadingSlash(path) {
	if (!path) return '/';
	return path.startsWith('/') ? path : `/${path}`;
}

function buildHeaders(extraHeaders = {}, isFormData = false) {
	const token = localStorage.getItem('wchat_token');
	const headers = { ...extraHeaders };

	if (!isFormData) {
		headers['Content-Type'] = headers['Content-Type'] || 'application/json';
	}

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return headers;
}

async function request(path, { method = 'GET', body, headers, isFormData = false } = {}) {
	const response = await fetch(`${API_BASE_URL}${withLeadingSlash(path)}`, {
		method,
		headers: buildHeaders(headers, isFormData),
		body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
	});

	const raw = await response.text();
	let data = null;

	if (raw) {
		try {
			data = JSON.parse(raw);
		} catch {
			data = raw;
		}
	}

	if (!response.ok) {
		const message =
			(data && typeof data === 'object' && (data.error || data.message))
			|| `Request gagal (${response.status})`;

		// If the user was deleted server-side, clear local token and inform app
		// so it can show a friendly message / force logout.
		if (response.status === 404 && typeof message === 'string' && message.includes('User tidak ditemukan')) {
			try { localStorage.removeItem('wchat_token'); } catch (e) { /* ignore */ }
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('wchat:account-lost', { detail: { message } }));
			}
		}

		throw new Error(message);
	}

	return data;
}

export const api = {
	get: (path) => request(path),
	post: (path, body) => request(path, { method: 'POST', body }),
	put: (path, body) => request(path, { method: 'PUT', body }),
	patch: (path, body) => request(path, { method: 'PATCH', body }),
	delete: (path) => request(path, { method: 'DELETE' }),
	upload: (path, formData) => request(path, { method: 'POST', body: formData, isFormData: true }),
};