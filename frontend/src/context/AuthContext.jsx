import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    if (!token) { setAuthLoading(false); return; }
    api.get('/auth/me')
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('wchat_token'))
      .finally(() => setAuthLoading(false));
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

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

  return (
    <AuthContext.Provider value={{
      user, authLoading,
      login, register, logout, updateProfile,
      toasts, addToast, removeToast,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
