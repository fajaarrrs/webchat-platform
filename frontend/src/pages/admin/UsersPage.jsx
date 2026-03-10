import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Users, Search, Trash2, ShieldCheck, BadgeCheck, UserCircle, Pencil, X } from 'lucide-react';

const roleBadge = {
  admin:    { label: 'Admin',    bg: '#ede9fe', color: '#6d28d9' },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8' },
  client:   { label: 'Client',   bg: '#d1fae5', color: '#065f46' },
};

export default function UsersPage() {
  const { user: currentUser, addToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api.get('/users')
      .then(data => setUsers(data))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      addToast('User berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleEditSave = async (e) => {
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

  const filtered = users.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const counts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    karyawan: users.filter(u => u.role === 'karyawan').length,
    client: users.filter(u => u.role === 'client').length,
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Users size={20} color="#2563EB" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Manajemen Users</h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Kelola semua pengguna yang terdaftar di platform.</p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'all', label: 'Semua' },
            { key: 'admin', label: 'Admin' },
            { key: 'karyawan', label: 'Employee' },
            { key: 'client', label: 'Client' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterRole(key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid',
                borderColor: filterRole === key ? '#2563EB' : '#E5E7EB',
                background: filterRole === key ? '#eff6ff' : '#fff',
                color: filterRole === key ? '#1D4ED8' : '#6B7280',
                fontSize: 13, fontWeight: filterRole === key ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: filterRole === key ? '#1D4ED8' : '#E5E7EB',
                color: filterRole === key ? '#fff' : '#6B7280',
                padding: '1px 6px', borderRadius: 99,
              }}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Table Card */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari username atau email..."
                style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>{filtered.length} user ditemukan</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>Memuat...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <Users size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>Tidak ada user ditemukan.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['User', 'Email', 'Role', 'Aksi'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const badge = roleBadge[u.role] || roleBadge.client;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0 }}>
                            {u.username}
                            {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: '#9CA3AF' }}>(Kamu)</span>}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {u.role === 'admin' && <ShieldCheck size={11} />}
                          {u.role === 'karyawan' && <BadgeCheck size={11} />}
                          {u.role === 'client' && <UserCircle size={11} />}
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {isSelf ? (
                          <span style={{ fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' }}>â€”</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setEditingUser({ id: u.id, username: u.username, email: u.email, role: u.role })}
                              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {u.role !== 'admin' && (
                              deleteConfirm === u.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => handleDelete(u.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Hapus</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>Batal</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(u.id)}
                                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
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
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email',    field: 'email',    type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input type={type} value={editingUser[field]} onChange={e => setEditingUser(p => ({ ...p, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <select value={editingUser.role} onChange={e => setEditingUser(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                  <option value="admin">Admin</option>
                  <option value="karyawan">Employee (karyawan)</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, cursor: 'pointer' }}>Batal</button>
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
