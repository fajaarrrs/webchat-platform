import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastTimeoutRef = useRef(null);

  const clearToastTimer = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  };

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    if (!token) { setAuthLoading(false); return; }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('wchat_token'))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    return () => clearToastTimer();
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    clearToastTimer();
    // Keep only one active toast: latest action replaces previous popup.
    setToasts([{ id, message, type }]);
    toastTimeoutRef.current = setTimeout(() => {
      setToasts((prev) => (prev[0]?.id === id ? [] : prev));
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (!next.length) clearToastTimer();
      return next;
    });
  };

  // Returns { success, role } or throws
  const login = async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('wchat_token', data.token);
      setUser(data.user);
      addToast(`Selamat datang, ${data.user.username}!`, 'success');
      return { success: true, role: data.user.role };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false };
    }
  };

  const register = async (username, email, password) => {
    try {
      await api.post('/auth/register', { username, email, password });
      addToast('Registrasi berhasil! Silakan login.', 'success');
      return { success: true };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wchat_token');
    addToast('Berhasil logout.', 'success');
  };

  // If server indicates the account no longer exists (deleted by admin),
  // perform forced logout and inform the user.
  useEffect(() => {
    const handler = (ev) => {
      const msg = ev?.detail?.message || 'Akun Anda tidak ditemukan. Silakan daftar kembali.';
      // Clear client state and token
      setUser(null);
      try { localStorage.removeItem('wchat_token'); } catch (e) { }
      addToast(msg, 'error');
    };
    window.addEventListener('wchat:account-lost', handler);
    return () => window.removeEventListener('wchat:account-lost', handler);
  }, [addToast]);

  // Update own profile — returns updated user or throws
  const updateProfile = async (updates) => {
    try {
      const updated = await api.put('/users/me', updates);
      setUser(updated);
      addToast('Profil berhasil diperbarui.', 'success');
      return { success: true, user: updated };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false };
    }
  };

  const uploadAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await api.upload('/users/me/avatar', formData);
      setUser(updated);
      addToast('Foto profil berhasil diperbarui.', 'success');
      return { success: true };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false };
    }
  };

  const deleteAvatar = async () => {
    try {
      const updated = await api.delete('/users/me/avatar');
      setUser(updated);
      addToast('Foto profil berhasil dihapus.', 'success');
      return { success: true };
    } catch (err) {
      addToast(err.message, 'error');
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, authLoading,
      login, register, logout, updateProfile, uploadAvatar, deleteAvatar,
      toasts, addToast, removeToast,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
