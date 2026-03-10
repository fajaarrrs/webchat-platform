import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import {
  Users,
  Search,
  Trash2,
  ShieldCheck,
  BadgeCheck,
  UserCircle,
  Pencil,
  X,
  UserPlus,
  Filter,
  Mail,
} from 'lucide-react';

const roleBadge = {
  admin: { label: 'Admin', bg: '#ede9fe', color: '#6d28d9' },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8' },
  client: { label: 'Client', bg: '#d1fae5', color: '#065f46' },
};

const summaryCardStyle = {
  background: '#fff',
  borderRadius: 14,
  padding: 18,
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const baseButtonStyle = {
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
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
    api
      .get('/users')
      .then((data) => setUsers(data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const counts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      karyawan: users.filter((u) => u.role === 'karyawan').length,
      client: users.filter((u) => u.role === 'client').length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
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

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      addToast('User berhasil diperbarui.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setEditSaving(false);
  };

  const roleTabs = [
    { key: 'all', label: 'Semua' },
    { key: 'admin', label: 'Admin' },
    { key: 'karyawan', label: 'Employee' },
    { key: 'client', label: 'Client' },
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Users size={20} color="#2563EB" />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', margin: 0 }}>
              Manajemen Users
            </h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
            Kelola semua pengguna yang terdaftar di platform.
          </p>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div style={summaryCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Total Users
                </p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{counts.all}</p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} color="#2563EB" />
              </div>
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Admin
                </p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{counts.admin}</p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} color="#6d28d9" />
              </div>
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Employee
                </p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{counts.karyawan}</p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BadgeCheck size={20} color="#1d4ed8" />
              </div>
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  Client
                </p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{counts.client}</p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserPlus size={20} color="#065f46" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {roleTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterRole(key)}
              style={{
                ...baseButtonStyle,
                padding: '8px 14px',
                border: '1.5px solid',
                borderColor: filterRole === key ? '#2563EB' : '#E5E7EB',
                background: filterRole === key ? '#eff6ff' : '#fff',
                color: filterRole === key ? '#1D4ED8' : '#6B7280',
                fontSize: 13,
                fontWeight: filterRole === key ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 360 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari username atau email..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 34px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#9CA3AF',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Filter size={14} />
              {filtered.length} user ditemukan
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: '#9CA3AF', fontSize: 14 }}>
              Memuat data users...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: '#9CA3AF' }}>
              <Users size={42} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Tidak ada user ditemukan</p>
              <p style={{ fontSize: 12, margin: 0 }}>
                Coba ubah kata kunci pencarian atau filter role.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['User', 'Email', 'Role', 'Aksi'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '13px 20px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#6B7280',
                        borderBottom: '1px solid #F3F4F6',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((u, i) => {
                  const badge = roleBadge[u.role] || roleBadge.client;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #2563EB, #7c3aed)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                              {u.username}
                              {isSelf && (
                                <span style={{ marginLeft: 8, fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                                  (Kamu)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280' }}>
                          <Mail size={14} />
                          <span style={{ fontSize: 13 }}>{u.email}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '5px 10px',
                            borderRadius: 999,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {u.role === 'admin' && <ShieldCheck size={11} />}
                          {u.role === 'karyawan' && <BadgeCheck size={11} />}
                          {u.role === 'client' && <UserCircle size={11} />}
                          {badge.label}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {isSelf ? (
                          <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Tidak ada aksi</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              onClick={() =>
                                setEditingUser({
                                  id: u.id,
                                  username: u.username,
                                  email: u.email,
                                  role: u.role,
                                })
                              }
                              style={{
                                ...baseButtonStyle,
                                padding: '8px 12px',
                                border: '1px solid #E5E7EB',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#6B7280',
                                fontWeight: 600,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#eff6ff';
                                e.currentTarget.style.color = '#2563EB';
                                e.currentTarget.style.borderColor = '#93c5fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff';
                                e.currentTarget.style.color = '#6B7280';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                              }}
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            {u.role !== 'admin' &&
                              (deleteConfirm === u.id ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => handleDelete(u.id)}
                                    style={{
                                      ...baseButtonStyle,
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: '#ef4444',
                                      color: '#fff',
                                      fontSize: 12,
                                      fontWeight: 700,
                                    }}
                                  >
                                    Ya, hapus
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{
                                      ...baseButtonStyle,
                                      padding: '8px 12px',
                                      border: '1px solid #E5E7EB',
                                      background: '#fff',
                                      color: '#6B7280',
                                      fontSize: 12,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(u.id)}
                                  style={{
                                    ...baseButtonStyle,
                                    padding: '8px 10px',
                                    border: '1px solid #E5E7EB',
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#6B7280',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fef2f2';
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.borderColor = '#fca5a5';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fff';
                                    e.currentTarget.style.color = '#6B7280';
                                    e.currentTarget.style.borderColor = '#E5E7EB';
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              ))}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: 28,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2937', margin: 0 }}>Edit User</h2>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                  Perbarui informasi user dan role akses.
                </p>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    value={editingUser[field]}
                    onChange={(e) => setEditingUser((p) => ({ ...p, [field]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 10,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="karyawan">Employee (karyawan)</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    ...baseButtonStyle,
                    flex: 1,
                    padding: '11px',
                    border: '1.5px solid #E5E7EB',
                    background: '#fff',
                    color: '#6B7280',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    ...baseButtonStyle,
                    flex: 1,
                    padding: '11px',
                    border: 'none',
                    background: editSaving ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}