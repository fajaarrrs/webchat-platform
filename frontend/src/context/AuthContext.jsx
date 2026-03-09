import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Simulated user store (replace with real API later)
const ADMIN_USER = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@gmail.com',
  password: 'adminchat',
  role: 'admin',
  avatar: null,
};

let registeredUsers = [ADMIN_USER];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('wchat_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const login = (email, password) => {
    const found = registeredUsers.find(
      u => u.email === email && u.password === password
    );
    if (!found) {
      addToast('Email atau password salah.', 'error');
      return false;
    }
    const { password: _, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem('wchat_user', JSON.stringify(safeUser));
    addToast(`Selamat datang, ${safeUser.username}!`, 'success');
    return true;
  };

  const register = (username, email, password) => {
    const exists = registeredUsers.find(u => u.email === email);
    if (exists) {
      addToast('Email sudah terdaftar.', 'error');
      return false;
    }
    const isEmployee = username.includes('-webcare');
    const newUser = {
      id: `user-${Date.now()}`,
      username,
      email,
      password,
      role: isEmployee ? 'karyawan' : 'client',
      avatar: null,
    };
    registeredUsers.push(newUser);
    addToast('Registrasi berhasil! Silakan login.', 'success');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wchat_user');
    addToast('Berhasil logout.', 'success');
  };

  const updateProfile = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('wchat_user', JSON.stringify(updated));
    // Update in registered users too
    registeredUsers = registeredUsers.map(u =>
      u.id === updated.id ? { ...u, ...updates } : u
    );
    addToast('Profil berhasil diperbarui.', 'success');
  };

  const getAllUsers = () => registeredUsers.map(({ password: _, ...u }) => u);

  const deleteUser = (id) => {
    registeredUsers = registeredUsers.filter(u => u.id !== id);
    addToast('User berhasil dihapus.', 'success');
  };

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, updateProfile,
      getAllUsers, deleteUser,
      toasts, addToast, removeToast,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
