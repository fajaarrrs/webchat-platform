import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, BadgeCheck } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmployee = form.username.includes('-webcare');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      // Use a simple alert here since we can't use hook outside of context easily
      alert('Password tidak cocok.');
      return;
    }
    if (form.password.length < 6) {
      alert('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = register(form.username, form.email, form.password);
      if (success) navigate('/login');
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #7c3aed 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <MessageSquare size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
            Buat Akun Baru
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Bergabung dengan WebcareChat</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', zIndex: 1 }} />
              <input
                type="text" required
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="contoh: john atau john-webcare"
                style={{
                  width: '100%',
                  padding: isEmployee ? '10px 100px 10px 38px' : '10px 12px 10px 38px',
                  border: `1.5px solid ${isEmployee ? '#93c5fd' : '#E5E7EB'}`,
                  borderRadius: 8, fontSize: 14, outline: 'none',
                  color: '#1F2937', boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background 0.2s',
                  background: isEmployee ? '#eff6ff' : '#fff',
                }}
                onFocus={e => { if (!isEmployee) e.target.style.borderColor = '#2563EB'; }}
                onBlur={e => { if (!isEmployee) e.target.style.borderColor = '#E5E7EB'; }}
              />
              {isEmployee && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#dbeafe', color: '#1d4ed8',
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  pointerEvents: 'none',
                }}>
                  <BadgeCheck size={12} /> Staff Account
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Tambahkan <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 4 }}>-webcare</code> untuk akun karyawan
            </p>
          </div>

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
                placeholder="Minimal 6 karakter"
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

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Konfirmasi Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type={showPass ? 'text' : 'password'} required
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                placeholder="Ulangi password"
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  border: `1.5px solid ${form.confirm && form.confirm !== form.password ? '#fca5a5' : '#E5E7EB'}`,
                  borderRadius: 8, fontSize: 14, outline: 'none',
                  color: '#1F2937', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = form.confirm && form.confirm !== form.password ? '#fca5a5' : '#E5E7EB'}
              />
            </div>
            {form.confirm && form.confirm !== form.password && (
              <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Password tidak cocok</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
              color: '#fff', fontWeight: 600, fontSize: 14, marginTop: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6B7280' }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: '#2563EB', fontWeight: 600 }}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
