import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const success = login(form.email, form.password);
      if (success) {
        // Role-based redirect
        const stored = localStorage.getItem('wchat_user');
        const user = stored ? JSON.parse(stored) : null;
        if (user?.role === 'admin') navigate('/admin/dashboard');
        else if (user?.role === 'karyawan') navigate('/karyawan/dashboard');
        else navigate('/client/dashboard');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #7c3aed 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <MessageSquare size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
            Masuk ke WebcareChat
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Silakan masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                  outline: 'none', color: '#1F2937', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type={showPass ? 'text' : 'password'} required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                style={{
                  width: '100%', padding: '10px 40px 10px 38px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                  outline: 'none', color: '#1F2937', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 0, color: '#9CA3AF', cursor: 'pointer',
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
              color: '#fff', fontWeight: 600, fontSize: 14, marginTop: 4,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6B7280' }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: '#2563EB', fontWeight: 600 }}>Daftar sekarang</Link>
        </p>

        {/* Demo hint */}
        <div style={{
          marginTop: 20, padding: '10px 14px', background: '#F0F9FF',
          borderRadius: 8, border: '1px solid #BAE6FD',
        }}>
          <p style={{ fontSize: 12, color: '#0369A1', margin: 0 }}>
            <strong>Demo Admin:</strong> admin@gmail.com / adminchat
          </p>
        </div>
      </div>
    </div>
  );
}
