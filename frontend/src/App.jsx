import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateLinkPage from './pages/admin/CreateLinkPage';
import UsersPage from './pages/admin/UsersPage';

// Karyawan pages
import KaryawanDashboard from './pages/karyawan/KaryawanDashboard';

// Client pages
import ClientDashboard from './pages/client/ClientDashboard';

// Shared pages
import ForumPage from './pages/ForumPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/create-link" element={
            <ProtectedRoute allowedRoles={['admin']}><CreateLinkPage /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>
          } />
          <Route path="/admin/forum" element={
            <ProtectedRoute allowedRoles={['admin']}><ForumPage /></ProtectedRoute>
          } />
          <Route path="/admin/chat" element={
            <ProtectedRoute allowedRoles={['admin']}><ChatPage /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>
          } />

          {/* Karyawan routes */}
          <Route path="/karyawan/dashboard" element={
            <ProtectedRoute allowedRoles={['karyawan']}><KaryawanDashboard /></ProtectedRoute>
          } />
          <Route path="/karyawan/forum" element={
            <ProtectedRoute allowedRoles={['karyawan']}><ForumPage /></ProtectedRoute>
          } />
          <Route path="/karyawan/chat" element={
            <ProtectedRoute allowedRoles={['karyawan']}><ChatPage /></ProtectedRoute>
          } />
          <Route path="/karyawan/settings" element={
            <ProtectedRoute allowedRoles={['karyawan']}><SettingsPage /></ProtectedRoute>
          } />

          {/* Client routes */}
          <Route path="/client/dashboard" element={
            <ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>
          } />
          <Route path="/client/forum" element={
            <ProtectedRoute allowedRoles={['client']}><ForumPage /></ProtectedRoute>
          } />
          <Route path="/client/chat" element={
            <ProtectedRoute allowedRoles={['client']}><ChatPage /></ProtectedRoute>
          } />
          <Route path="/client/settings" element={
            <ProtectedRoute allowedRoles={['client']}><SettingsPage /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
