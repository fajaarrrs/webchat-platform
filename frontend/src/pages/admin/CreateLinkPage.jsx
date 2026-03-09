import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen } from 'lucide-react';

const initialLinks = [
  { id: 'lnk-001', project: 'Support Umum', desc: 'Link umum untuk client yang butuh bantuan.', url: '/chat/join/abc123', created: '01 Mar 2026', uses: 14 },
  { id: 'lnk-002', project: 'Project Alpha', desc: 'Chat khusus untuk tim Project Alpha.', url: '/chat/join/def456', created: '03 Mar 2026', uses: 7 },
  { id: 'lnk-003', project: 'Billing Support', desc: 'Pertanyaan seputar tagihan dan pembayaran.', url: '/chat/join/ghi789', created: '06 Mar 2026', uses: 3 },
];

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState({ project: '', desc: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // --- Logic Handlers ---
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
      addToast(`Link "${newLink.project}" berhasil dibuat!`, 'success');
      setLoading(false);
    }, 600);
  };

  const handleCopy = (url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl)
      .then(() => addToast('Link berhasil disalin!', 'success'))
      .catch(() => addToast('Gagal menyalin link.', 'error'));
  };

  const handleDelete = (id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    setDeleteConfirm(null);
    addToast('Link berhasil dihapus.', 'success');
  };

  const filteredLinks = links.filter(l =>
    l.project.toLowerCase().includes(search.toLowerCase())
  );

  // --- UI Styles (Reusable Objects) ---
  const cardStyle = {
    background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px', overflow: 'hidden'
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box'
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '8px' }}>
              <Link2 size={22} color="#2563EB" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Kelola Link Chat</h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            Buat link unik agar client dapat langsung bergabung ke sesi chat secara instan.
          </p>
        </div>

        {/* Form Section */}
        <div style={{ ...cardStyle, padding: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#2563EB" /> Generate Link Baru
          </h2>
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
                  Nama Project <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text" required value={form.project} placeholder="contoh: Support Pelanggan Q1"
                  style={inputStyle} onChange={e => setForm({ ...form, project: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4B5563', marginBottom: '6px' }}>
                  Deskripsi
                </label>
                <input
                  type="text" value={form.desc} placeholder="Deskripsi singkat (opsional)"
                  style={inputStyle} onChange={e => setForm({ ...form, desc: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading || !form.project.trim()}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none',
                background: loading || !form.project.trim() ? '#93C5FD' : '#2563EB',
                color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
            >
              {loading ? 'Processing...' : <><Link2 size={16} /> Generate Link</>}
            </button>
          </form>
        </div>

        {/* Table Section */}
        <div style={cardStyle}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
              Daftar Link Aktif ({links.length})
            </h2>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text" placeholder="Cari project..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px', width: '240px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {filteredLinks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                <FolderOpen size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <p>Tidak ada link ditemukan.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
                    <th style={{ padding: '12px 24px', color: '#6B7280', fontWeight: 600 }}>Project</th>
                    <th style={{ padding: '12px 24px', color: '#6B7280', fontWeight: 600 }}>URL Chat</th>
                    <th style={{ padding: '12px 24px', color: '#6B7280', fontWeight: 600, textAlign: 'center' }}>Pemakaian</th>
                    <th style={{ padding: '12px 24px', color: '#6B7280', fontWeight: 600 }}>Dibuat</th>
                    <th style={{ padding: '12px 24px', color: '#6B7280', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody style={{ divideY: '1px solid #F3F4F6' }}>
                  {filteredLinks.map((link) => (
                    <tr key={link.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{link.project}</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{link.desc || '—'}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <code style={{ background: '#F3F4F6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#2563EB' }}>{link.url}</code>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>{link.uses}x</span>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#6B7280', fontSize: '13px' }}>{link.created}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleCopy(link.url)} style={{ border: '1px solid #E5E7EB', background: '#fff', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Salin"><Copy size={14} color="#6B7280" /></button>
                          <a href={link.url} style={{ border: '1px solid #E5E7EB', background: '#fff', padding: '6px', borderRadius: '6px' }} title="Buka"><ExternalLink size={14} color="#6B7280" /></a>
                          <button 
                            onClick={() => setDeleteConfirm(link.id)} 
                            style={{ border: '1px solid #E5E7EB', background: '#fff', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} color={deleteConfirm === link.id ? '#EF4444' : '#6B7280'} />
                          </button>
                          {deleteConfirm === link.id && (
                            <button onClick={() => handleDelete(link.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Hapus?</button>
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
      </div>
    </DashboardLayout>
  );
}