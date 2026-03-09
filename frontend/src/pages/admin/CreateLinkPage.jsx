import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen } from 'lucide-react';

const initialLinks = [
  { id: 'lnk-001', project: 'Support Umum',    desc: 'Link umum untuk client yang butuh bantuan.', url: '/chat/join/abc123', created: '01 Mar 2026', uses: 14 },
  { id: 'lnk-002', project: 'Project Alpha',   desc: 'Chat khusus untuk tim Project Alpha.',        url: '/chat/join/def456', created: '03 Mar 2026', uses: 7  },
  { id: 'lnk-003', project: 'Billing Support', desc: 'Pertanyaan seputar tagihan dan pembayaran.',  url: '/chat/join/ghi789', created: '06 Mar 2026', uses: 3  },
];

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState({ project: '', desc: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!form.project.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const id = `lnk-${Date.now()}`;
      const token = Math.random().toString(36).slice(2, 9);
      const newLink = {
        id,
        project: form.project.trim(),
        desc: form.desc.trim(),
        url: `/chat/join/${token}`,
        created: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        uses: 0,
      };
      setLinks(prev => [newLink, ...prev]);
      setForm({ project: '', desc: '' });
      addToast(`Link untuk "${newLink.project}" berhasil dibuat!`, 'success');
      setLoading(false);
    }, 500);
  };

  const handleCopy = (url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      addToast('Link berhasil disalin!', 'success');
    }).catch(() => {
      addToast('Gagal menyalin link.', 'error');
    });
  };

  const handleDelete = (id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    setDeleteConfirm(null);
    addToast('Link berhasil dihapus.', 'success');
  };

  const filtered = links.filter(l =>
    l.project.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link2 size={20} color="#2563EB" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Kelola Link Chat</h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            Buat dan bagikan link unik agar client dapat langsung bergabung ke sesi chat.
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color="#2563EB" /> Generate Link Baru
          </h2>
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Nama Project <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={form.project}
                  onChange={e => setForm({ ...form, project: e.target.value })}
                  placeholder="contoh: Support Pelanggan Q1"
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
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                  placeholder="Deskripsi singkat (opsional)"
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
            <button
              type="submit"
              disabled={loading || !form.project.trim()}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: loading || !form.project.trim() ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: loading || !form.project.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Link2 size={15} />
              {loading ? 'Generating...' : 'Generate Link'}
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
              Daftar Link ({links.length})
            </h2>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari project..."
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

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <FolderOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {search ? 'Tidak ada link yang cocok.' : 'Belum ada link yang dibuat.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Nama Project', 'Deskripsi', 'URL Link', 'Dibuat', 'Pemakaian', 'Aksi'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left', fontSize: 12,
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
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{link.project}</span>
                    </td>
                    <td style={{ padding: '14px 20px', maxWidth: 200 }}>
                      <span style={{ fontSize: 13, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {link.desc || <em style={{ color: '#D1D5DB' }}>—</em>}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <code style={{
                        fontSize: 12, background: '#F0F9FF', color: '#0369A1',
                        padding: '3px 8px', borderRadius: 5, border: '1px solid #BAE6FD',
                      }}>
                        {link.url}
                      </code>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{link.created}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        background: '#ecfdf5', color: '#059669',
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      }}>
                        {link.uses}x
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleCopy(link.url)}
                          title="Salin link"
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
                          href={link.url}
                          title="Buka link"
                          style={{
                            padding: '6px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#6B7280', textDecoration: 'none',
                          }}
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
                            title="Hapus link"
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
