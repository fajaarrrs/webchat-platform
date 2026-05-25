import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import './CreateLinkPage.css';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen, Pencil } from 'lucide-react';
import useBreakpoint from '../../hooks/useBreakpoint';
import './CreateLinkPage.css';

const MAX_TITLE_LENGTH = 25;
const MAX_PROJECT_LENGTH = 25;

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState({ title: '', project: '', description: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editLink, setEditLink] = useState(null); // link object being edited
  const [editForm, setEditForm] = useState({ title: '', project: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);

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

  const handleCopy = (identifier) => {
    const fullUrl = `${window.location.origin}/chat/join/${identifier}`;
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

  const openEdit = (link) => {
    setEditLink(link);
    setEditForm({ title: link.title || '', project: link.project || '', description: link.description || '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editLink) return;
    const id = editLink.id;
    if (!editForm.title.trim() || !editForm.project.trim()) return addToast('Judul dan project wajib diisi.', 'error');

    setEditLoading(true);
    try {
      const updated = await api.put(`/forums/${id}`, {
        title: editForm.title.trim(),
        project: editForm.project.trim(),
        description: editForm.description.trim(),
      });

      setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setEditLink(null);
      addToast(`Link "${updated.title}" berhasil diperbarui.`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setEditLoading(false);
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
  
  const pagePadding = isMobile ? '20px 14px' : isTablet ? '28px 20px' : '40px';

  return (
    <DashboardLayout>
      <div
        style={{
          padding: pagePadding,
          maxWidth: '1100px',
          margin: '0 auto',
          fontFamily: 'Inter, sans-serif',
        }}
      >
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 220 : 280}px, 1fr))`,
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div>
                <label className="form-label">
                  Judul Link <span>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={MAX_TITLE_LENGTH}
                  value={form.title}
                  placeholder="contoh: Client A"
                  className="link-input"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {form.title.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.title.length >= MAX_TITLE_LENGTH ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.title.length}/{MAX_TITLE_LENGTH}
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
                  maxLength={MAX_PROJECT_LENGTH}
                  value={form.project}
                  placeholder="contoh: Project Website Sekolah"
                  className="link-input"
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                />
                {form.project.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.project.length >= MAX_PROJECT_LENGTH ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.project.length}/{MAX_PROJECT_LENGTH}
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
                style={{
                  width: isMobile ? '100%' : '240px',
                  paddingLeft: '36px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  background: '#ffffff',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Forum / Project', 'URL Chat', 'Anggota', 'Dibuat', 'Aksi'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 24px',
                          color: '#6B7280',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          textAlign: h === 'Aksi' ? 'center' : h === 'Anggota' ? 'center' : 'left',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredLinks.map((link) => {
                    const joinIdentifier = link.slug || link.token;
                    return (
                    <tr
                      key={link.id}
                      style={{ borderTop: '1px solid #F3F4F6' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{link.title}</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{link.project}</div>
                      </td>

                      <td style={{ padding: '16px 24px' }}>
                        <code
                          style={{
                            background: '#F0F9FF',
                            color: '#0369A1',
                            padding: '3px 8px',
                            borderRadius: 5,
                            fontSize: '12px',
                            border: '1px solid #BAE6FD',
                          }}
                        >
                          /chat/join/{joinIdentifier}
                        </code>
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <span
                          style={{
                            background: '#ECFDF5',
                            color: '#059669',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {link.member_count ?? 0}x
                        </span>
                      </td>

                      <td style={{ padding: '16px 24px', color: '#6B7280', fontSize: '13px' }}>
                        {formatDate(link.created_at)}
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleCopy(joinIdentifier)}
                            title="Salin link"
                            style={{
                              border: '1px solid #E5E7EB',
                              background: '#fff',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '12px',
                              color: '#6B7280',
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
                            <Copy size={13} /> Salin
                          </button>

                          <a
                            href={`/chat/join/${joinIdentifier}`}
                            title="Buka link"
                            style={{
                              border: '1px solid #E5E7EB',
                              background: '#fff',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#6B7280',
                              textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button
                            onClick={() => openEdit(link)}
                            title="Edit link"
                            style={{
                              border: '1px solid #E5E7EB',
                              background: '#fff',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#6B7280',
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
                          </button>

                          {deleteConfirm === link.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => handleDelete(link.id)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#ef4444',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                Ya
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #E5E7EB',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: '#6B7280',
                                }}
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(link.id)}
                              title="Hapus link"
                              style={{
                                border: '1px solid #E5E7EB',
                                background: '#fff',
                                padding: '6px',
                                borderRadius: '6px',
                                cursor: 'pointer',
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
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {editLink && (
        <div className="edit-link-backdrop">
          <form onSubmit={handleUpdate} className="edit-link-form">
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>Edit Link</h3>

            <div className="edit-link-grid">
              <div>
                <label className="form-label">Judul Link <span>*</span></label>
                <input
                  className="link-input"
                  value={editForm.title}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Nama Project <span>*</span></label>
                <input
                  className="link-input"
                  value={editForm.project}
                  maxLength={MAX_PROJECT_LENGTH}
                  onChange={(e) => setEditForm({ ...editForm, project: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="form-label">Deskripsi</label>
              <input
                className="link-input"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setEditLink(null)} className="btn-secondary">Batal</button>
              <button type="submit" disabled={editLoading} className="btn-primary">{editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
            <div className="note">Catatan: Jika Anda mengubah Judul, token/link akan otomatis diperbarui sesuai judul baru.</div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}