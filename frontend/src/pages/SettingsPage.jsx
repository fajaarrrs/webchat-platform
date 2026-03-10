import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Settings, User, Lock, Eye, EyeOff, Save, BadgeCheck, ShieldCheck, UserCircle, Users, Pencil, Trash2, X, Check } from 'lucide-react';

const roleBadge = {
  admin:    { label: 'Admin',    bg: '#ede9fe', color: '#6d28d9', Icon: ShieldCheck },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8', Icon: BadgeCheck },
  client:   { label: 'Client',   bg: '#d1fae5', color: '#065f46', Icon: UserCircle },
};

export default function SettingsPage() {
  const { user, updateProfile, addToast } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  // Admin users management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { id, username, email, role }
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const isAdmin = user?.role === 'admin';
  const badge = roleBadge[user?.role] || roleBadge.client;
  const BadgeIcon = badge.Icon;
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  const tabs = [
    { key: 'profile',  label: 'Profil',    icon: User },
    { key: 'password', label: 'Keamanan',  icon: Lock },
    ...(isAdmin ? [{ key: 'users', label: 'Kelola Users', icon: Users }] : []),
  ];

  useEffect(() => {
    if (tab === 'users' && isAdmin) {
      setUsersLoading(true);
      api.get('/users')
        .then(data => setUsers(data))
        .catch(err => addToast(err.message, 'error'))
        .finally(() => setUsersLoading(false));
    }
  }, [tab]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim()) return;
    setSaving(true);
    await updateProfile({ username: profileForm.username.trim(), email: profileForm.email.trim() });
    setSaving(false);
  };

  const handleChangePass = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      addToast('Password baru tidak cocok.', 'error'); return;
    }
    if (passForm.newPass.length < 6) {
      addToast('Password minimal 6 karakter.', 'error'); return;
    }
    setSaving(true);
    const result = await updateProfile({ currentPassword: passForm.current, newPassword: passForm.newPass });
    if (result.success) setPassForm({ current: '', newPass: '', confirm: '' });
    setSaving(false);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const updated = await api.put(`/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
      addToast('User berhasil diperbarui.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setEditSaving(false);
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      addToast('User berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 780 }}>
        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={20} color="#2563EB" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Pengaturan</h1>
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
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Edit Profil</h2>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email',    field: 'email',    type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={profileForm[field]}
                    onChange={e => setProfileForm({ ...profileForm, [field]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <input disabled value={badge.label} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, background: '#F9FAFB', color: '#9CA3AF', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Role tidak dapat diubah secara mandiri.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Form */}
        {tab === 'password' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Ganti Password</h2>
            <form onSubmit={handleChangePass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'current', label: 'Password Saat Ini',   field: 'current' },
                { key: 'new',     label: 'Password Baru',       field: 'newPass' },
                { key: 'confirm', label: 'Konfirmasi Password', field: 'confirm' },
              ].map(({ key, label, field }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
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
                    <button type="button" onClick={() => setShowPass(p => ({ ...p, [key]: !p[key] }))}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, color: '#9CA3AF', cursor: 'pointer' }}>
                      {showPass[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin: Kelola Users */}
        {tab === 'users' && isAdmin && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F3F4F6' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Daftar User ({users.length})</h2>
            </div>
            {usersLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Memuat...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Username', 'Email', 'Role', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const rb = roleBadge[u.role] || roleBadge.client;
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
                          {u.username}
                          {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: '#2563EB' }}>(kamu)</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: rb.bg, color: rb.color, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99 }}>
                            {rb.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setEditingUser({ id: u.id, username: u.username, email: u.email, role: u.role })}
                              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {!isSelf && u.role !== 'admin' && (
                              deleteConfirm === u.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Ya</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#6B7280' }}>Batal</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(u.id)}
                                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937' }}>Edit User</h2>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email',    field: 'email',    type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={editingUser[field]}
                    onChange={e => setEditingUser(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="admin">Admin</option>
                  <option value="karyawan">Employee (karyawan)</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={editSaving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: editSaving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
