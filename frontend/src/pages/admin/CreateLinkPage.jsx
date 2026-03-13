import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen } from 'lucide-react';
import './CreateLinkPage.css'; // Import newly created CSS file

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title: '', project: '', description: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    api
      .get('/forums')
      .then((data) => setLinks(data))
      .catch(() => {})
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

      setLinks((prev) => [newForum, ...prev]);
      setForm({ title: '', project: '', description: '' });
      addToast(`Link "${newForum.title}" berhasil dibuat!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (token) => {
    const fullUrl = `${window.location.origin}/chat/join/${token}`;
    navigator.clipboard
      .writeText(fullUrl)
      .then(() => addToast('Link berhasil disalin!', 'success'))
      .catch(() => addToast('Gagal menyalin link.', 'error'));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/forums/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      setDeleteConfirm(null);
      addToast('Link berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredLinks = links.filter(
    (l) =>
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.project?.toLowerCase().includes(search.toLowerCase())
  );

  const isDisabled = loading || !form.title.trim() || !form.project.trim();

  // Rendering table row (desktop)
  const renderDesktopRow = (link) => (
    <tr key={link.id}>
      <td>
        <div style={{ fontWeight: 600, color: '#1F2937' }}>{link.title}</div>
        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{link.project}</div>
      </td>
      <td>
        <code
          style={{
            background: '#F0F9FF', color: '#0369A1', padding: '3px 8px',
            borderRadius: 5, fontSize: '12px', border: '1px solid #BAE6FD'
          }}
        >
          /chat/join/{link.token}
        </code>
      </td>
      <td style={{ textAlign: 'center' }}>
        <span
          style={{
            background: '#ECFDF5', color: '#059669', padding: '2px 10px',
            borderRadius: '12px', fontSize: '12px', fontWeight: 700
          }}
        >
          {link.member_count ?? 0}x
        </span>
      </td>
      <td style={{ color: '#6B7280', fontSize: '13px' }}>
        {formatDate(link.created_at)}
      </td>
      <td style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button onClick={() => handleCopy(link.token)} title="Salin link" className="action-btn">
            <Copy size={13} /> Salin
          </button>
          <a href={`/chat/join/${link.token}`} title="Buka link" className="action-btn">
            <ExternalLink size={13} />
          </a>
          {deleteConfirm === link.id ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                onClick={() => handleDelete(link.id)} 
                style={{
                  padding: '6px 10px', borderRadius: '6px', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600
                }}
              >Ya</button>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="action-btn"
              >Batal</button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(link.id)}
              title="Hapus link"
              className="action-btn delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // Rendering mobile card row
  const renderMobileCard = (link) => (
    <div key={`mobile-${link.id}`} className="mobile-card-item">
      <div className="mobile-card-header">
        <div>
          <div className="mobile-card-title">{link.title}</div>
          <div className="mobile-card-subtitle">{link.project}</div>
        </div>
        <span style={{
            background: '#ECFDF5', color: '#059669', padding: '2px 8px',
            borderRadius: '12px', fontSize: '11px', fontWeight: 700
        }}>
          Anggota: {link.member_count ?? 0}
        </span>
      </div>

      <div className="mobile-card-row">
        <code style={{
            background: '#F0F9FF', color: '#0369A1', padding: '3px 6px',
            borderRadius: 4, fontSize: '11px', border: '1px solid #BAE6FD',
            wordBreak: 'break-all'
        }}>
          /chat/join/{link.token}
        </code>
      </div>

      <div className="mobile-card-row" style={{ color: '#6B7280' }}>
        Dibuat: {formatDate(link.created_at)}
      </div>

      <div className="mobile-action-buttons">
        <button onClick={() => handleCopy(link.token)} className="action-btn">
          <Copy size={13} /> Salin
        </button>
        <a href={`/chat/join/${link.token}`} className="action-btn">
          <ExternalLink size={13} /> Buka
        </a>
        {deleteConfirm === link.id ? (
          <>
            <button 
              onClick={() => handleDelete(link.id)} 
              style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none',
                background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600
              }}
            >Ya</button>
            <button onClick={() => setDeleteConfirm(null)} className="action-btn">Batal</button>
          </>
        ) : (
          <button onClick={() => setDeleteConfirm(link.id)} className="action-btn delete">
            <Trash2 size={13} /> Hapus
          </button>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
<<<<<<< HEAD
      <div
        style={{
          padding: '24px 16px',
          maxWidth: '1100px',
          margin: '0 auto',
          fontFamily: 'Inter, sans-serif',
        }}
      >

=======
      <div className="link-page-container">
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div className="link-page-header">
            <div className="icon-container">
              <Link2 size={22} color="#2563EB" />
            </div>
            <h1 className="link-page-title">Kelola Link Chat</h1>
          </div>
          <p className="link-page-subtitle">
            Buat link unik agar client dapat langsung bergabung ke sesi chat secara instan.
          </p>
        </div>

        {/* Form Section */}
        <div className="link-card">
          <h2 className="card-title">
            <Plus size={18} color="#2563EB" /> 
            <span>Generate Link Baru</span>
          </h2>

          <form onSubmit={handleGenerate}>
            <div className="form-grid">
              <div>
                <label className="form-label">
                  Judul Link <span>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={form.title}
                  placeholder="contoh: Support Pelanggan Q1"
                  className="link-input"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {form.title.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.title.length >= 15 ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.title.length}/15
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">
                  Nama Project <span>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={form.project}
                  placeholder="contoh: Project Alpha"
                  className="link-input"
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                />
                {form.project.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.project.length >= 15 ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.project.length}/15
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <input
                type="text"
                value={form.description}
                placeholder="Deskripsi singkat forum ini (opsional)"
                className="link-input"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button type="submit" disabled={isDisabled} className="submit-btn">
              <Link2 size={16} />
              {loading ? 'Processing...' : 'Generate Link'}
            </button>
          </form>
        </div>

        {/* Table Section */}
        <div className="link-card link-table-card">
          <div className="table-header">
            <h2>Daftar Link ({links.length})</h2>

            <div className="search-container">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Cari project..."
                value={search}
                className="link-input search-input"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            {fetching ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '14px' }}>
                Memuat data...
              </div>
            ) : filteredLinks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                <FolderOpen
                  size={48}
                  style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }}
                />
                <p style={{ fontSize: '14px', margin: 0 }}>
                  {search ? 'Tidak ada link yang cocok.' : 'Belum ada link yang dibuat.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="desktop-table-container">
                  <table className="desktop-table">
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['Forum / Project', 'URL Chat', 'Anggota', 'Dibuat', 'Aksi'].map((h) => (
                          <th key={h} style={{ textAlign: h === 'Aksi' || h === 'Anggota' ? 'center' : 'left' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLinks.map(renderDesktopRow)}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="mobile-card-list">
                  {filteredLinks.map(renderMobileCard)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}