import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen } from 'lucide-react';
import { api } from '../../api';

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title: '', project: '', description: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    api.get('/forums')
      .then(data => setLinks(data))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setFetching(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.project.trim()) return;
    setLoading(true);
    try {
      const newForum = await api.post('/forums', {
        title: form.title.trim(),
        project: form.project.trim(),
        description: form.description.trim(),
      });
      setLinks(prev => [newForum, ...prev]);
      setForm({ title: '', project: '', description: '' });
      addToast(`Link untuk "${newForum.title}" berhasil dibuat!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleCopy = (token) => {
    const fullUrl = `${window.location.origin}/chat/join/${token}`;
    navigator.clipboard.writeText(fullUrl)
      .then(() => addToast('Link berhasil disalin!', 'success'))
      .catch(() => addToast('Gagal menyalin link.', 'error'));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/forums/${id}`);
      setLinks(prev => prev.filter(l => l.id !== id));
      setDeleteConfirm(null);
      addToast('Forum berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filtered = links.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.project.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dt) => {
    if (!dt) return 'â€”';
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1050 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link2 size={20} color="#2563EB" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Kelola Link Chat</h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            Buat dan bagikan link unik agar client dapat bergabung ke sesi chat.
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color="#2563EB" /> Buat Forum Chat Baru
          </h2>
          <form onSubmit={handleGenerate}>
            {/* Row 1: Forum Info + Client/Project */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Forum Info <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="contoh: Support Umum, Project Alpha"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                    outline: 'none', color: '#1F2937', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Client / Project <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={form.project}
                  onChange={e => setForm({ ...form, project: e.target.value })}
                  placeholder="contoh: PT Maju Jaya â€” Website Redesign"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                    outline: 'none', color: '#1F2937', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
            {/* Row 2: Description full-width */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat forum ini (opsional)"
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                  outline: 'none', color: '#1F2937', boxSizing: 'border-box',
                  resize: 'vertical', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !form.title.trim() || !form.project.trim()}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: loading || !form.title.trim() || !form.project.trim()
                  ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: loading || !form.title.trim() || !form.project.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Link2 size={15} />
              {loading ? 'Membuat...' : 'Generate Link'}
            </button>
          </form>
        </div>

        {/* Table Card */}
        <div style={{
          background: '#fff', borderRadius: 14,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid #F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
              Daftar Forum ({links.length})
            </h2>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari forum/project..."
                style={{
                  padding: '7px 10px 7px 30px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13,
                  outline: 'none', width: 200, boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {fetching ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <FolderOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {search ? 'Tidak ada forum yang cocok.' : 'Belum ada forum yang dibuat.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Forum Info', 'Client / Project', 'Deskripsi', 'Link Join', 'Dibuat', 'Anggota', 'Aksi'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 12,
                      fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((link, i) => (
                  <tr key={link.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{link.title}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{link.project}</span>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 180 }}>
                      <span style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {link.description || <em style={{ color: '#D1D5DB' }}>â€”</em>}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <code style={{
                        fontSize: 11, background: '#F0F9FF', color: '#0369A1',
                        padding: '3px 7px', borderRadius: 5, border: '1px solid #BAE6FD',
                      }}>
                        /chat/join/{link.token}
                      </code>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{formatDate(link.created_at)}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: '#ecfdf5', color: '#059669',
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      }}>
                        {link.member_count ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleCopy(link.token)}
                          title="Salin link join"
                          style={{
                            padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#6B7280',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                        >
                          <Copy size={13} /> Salin
                        </button>
                        <a
                          href={`/chat/join/${link.token}`}
                          title="Buka forum"
                          style={{
                            padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#6B7280', textDecoration: 'none',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = '#6ee7b7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                        >
                          <ExternalLink size={13} />
                        </a>
                        {deleteConfirm === link.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleDelete(link.id)}
                              style={{
                                padding: '6px 10px', borderRadius: 6, border: 'none',
                                background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              }}>
                              Ya
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{
                                padding: '6px 10px', borderRadius: 6, border: '1px solid #E5E7EB',
                                background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6B7280',
                              }}>
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(link.id)}
                            title="Hapus forum"
                            style={{
                              padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                              color: '#6B7280',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
