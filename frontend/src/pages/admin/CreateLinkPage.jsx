import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Plus, Copy, Trash2, Link2, ExternalLink, Search, FolderOpen } from 'lucide-react';
import useBreakpoint from '../../hooks/useBreakpoint';

export default function CreateLinkPage() {
  const { addToast } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
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

  const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '24px',
    overflow: 'hidden',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #E5E7EB',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', background: '#EFF6FF', borderRadius: '8px' }}>
              <Link2 size={22} color="#2563EB" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Kelola Link Chat
            </h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            Buat link unik agar client dapat langsung bergabung ke sesi chat secara instan.
          </p>
        </div>

        {/* Form Section */}
        <div style={{ ...cardStyle, padding: '28px' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#374151',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={18} color="#2563EB" /> Generate Link Baru
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  Judul Link <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={form.title}
                  placeholder="contoh: Support Pelanggan Q1"
                  style={inputStyle}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                />
                {form.title.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.title.length >= 15 ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.title.length}/15
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  Nama Project <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={form.project}
                  placeholder="contoh: Project Alpha"
                  style={inputStyle}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                />
                {form.project.length > 0 && (
                  <div style={{ textAlign: 'right', fontSize: '11px', color: form.project.length >= 15 ? '#EF4444' : '#9CA3AF', marginTop: '4px' }}>
                    {form.project.length}/15
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#4B5563',
                  marginBottom: '6px',
                }}
              >
                Deskripsi
              </label>
              <input
                type="text"
                value={form.description}
                placeholder="Deskripsi singkat forum ini (opsional)"
                style={inputStyle}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isDisabled ? '#93C5FD' : '#2563EB',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Link2 size={16} />
              {loading ? 'Processing...' : 'Generate Link'}
            </button>
          </form>
        </div>

        {/* Table Section */}
        <div style={cardStyle}>
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
              Daftar Link Aktif ({links.length})
            </h2>

            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                }}
              />
              <input
                type="text"
                placeholder="Cari project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px', width: isMobile ? '100%' : '240px' }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {fetching ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '14px' }}>
                Memuat data...
              </div>
            ) : filteredLinks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
                <FolderOpen
                  size={48}
                  style={{
                    opacity: 0.2,
                    marginBottom: '12px',
                    display: 'block',
                    margin: '0 auto 12px',
                  }}
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
    </DashboardLayout>
  );
}