import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Settings, User, Lock, Eye, EyeOff, Save, BadgeCheck, ShieldCheck, UserCircle } from 'lucide-react';

const roleBadge = {
  admin:    { label: 'Admin',    bg: '#ede9fe', color: '#6d28d9', Icon: ShieldCheck },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8', Icon: BadgeCheck },
  client:   { label: 'Client',   bg: '#d1fae5', color: '#065f46', Icon: UserCircle },
};

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const badge = roleBadge[user?.role] || roleBadge.client;
  const BadgeIcon = badge.Icon;
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profileForm.username.trim()) return;
    setSaving(true);
    setTimeout(() => {
      updateProfile({ username: profileForm.username, email: profileForm.email });
      setSaving(false);
    }, 500);
  };

  const handleChangePass = (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      alert('Password baru tidak cocok.');
      return;
    }
    if (passForm.newPass.length < 6) {
      alert('Password minimal 6 karakter.');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      updateProfile({ password: passForm.newPass });
      setPassForm({ current: '', newPass: '', confirm: '' });
      setSaving(false);
    }, 500);
  };

  const tabs = [
    { key: 'profile', label: 'Profil', icon: User },
    { key: 'password', label: 'Keamanan', icon: Lock },
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 700 }}>
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={20} color="#2563EB" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Pengaturan Akun</h1>
        </div>

        {/* Profile Card */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1D4ED8, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>{user?.username}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 8px' }}>{user?.email}</p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: badge.bg, color: badge.color,
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
            }}>
              <BadgeIcon size={13} /> {badge.label}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? '#1D4ED8' : '#6B7280',
                fontWeight: tab === key ? 700 : 400, fontSize: 13,
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Profile Form */}
        {tab === 'profile' && (
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Edit Profil</h2>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Role
                </label>
                <input
                  type="text" disabled
                  value={badge.label}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                    background: '#F9FAFB', color: '#9CA3AF', boxSizing: 'border-box', cursor: 'not-allowed',
                  }}
                />
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Role tidak dapat diubah secara mandiri.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px', borderRadius: 8, border: 'none',
                    background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Save size={15} />
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Form */}
        {tab === 'password' && (
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Ganti Password</h2>
            <form onSubmit={handleChangePass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'current', label: 'Password Saat Ini',  field: 'current' },
                { key: 'new',     label: 'Password Baru',      field: 'newPass'  },
                { key: 'confirm', label: 'Konfirmasi Password', field: 'confirm'  },
              ].map(({ key, label, field }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    {label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass[key] ? 'text' : 'password'}
                      value={passForm[field]}
                      onChange={e => setPassForm({ ...passForm, [field]: e.target.value })}
                      placeholder={label}
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px',
                        border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#2563EB'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', padding: 0, color: '#9CA3AF', cursor: 'pointer',
                      }}
                    >
                      {showPass[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px', borderRadius: 8, border: 'none',
                    background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Save size={15} />
                  {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
