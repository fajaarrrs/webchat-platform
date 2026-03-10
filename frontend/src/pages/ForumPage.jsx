import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { MessagesSquare, Search, MessageSquare, Users, Clock, Link2, UserPlus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

const forumColors = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#0891b2', '#be185d'];

export default function ForumPage() {
  const { user, addToast } = useAuth();
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    api.get('/forums')
      .then(data => setForums(data))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenChat = (forum) => {
    navigate(`/${user?.role}/chat`, { state: { forumId: forum.id } });
  };

  const handleJoinForum = async (e) => {
    e.preventDefault();
    const raw = joinLink.trim();
    if (!raw) return;
    const match = raw.match(/\/chat\/join\/([a-f0-9]+)/);
    const token = match ? match[1] : raw;
    setJoinLoading(true);
    try {
      const data = await api.post(`/forums/join/${token}`);
      addToast(`Berhasil bergabung ke forum "${data.title}"`, 'success');
      const updated = await api.get('/forums');
      setForums(updated);
      setShowJoinModal(false);
      setJoinLink('');
      navigate(`/${user?.role}/chat`, { state: { forumId: data.forum_id } });
    } catch (err) {
      addToast(err.message || 'Link tidak valid.', 'error');
    }
    setJoinLoading(false);
  };

  const formatDate = (dt) => {
    if (!dt) return 'â€”';
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatRelative = (dt) => {
    if (!dt) return 'â€”';
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  };

  const filtered = forums.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.project.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <MessagesSquare size={20} color="#2563EB" />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Forum</h1>
            </div>
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              {user?.role === 'admin'
                ? 'Semua forum chat yang telah dibuat.'
                : 'Forum yang kamu ikuti. Klik untuk membuka chat.'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/create-link')}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Link2 size={15} /> Buat Forum
            </button>
          )}
          {user?.role !== 'admin' && (
            <button
              onClick={() => setShowJoinModal(true)}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <UserPlus size={15} /> Tambah Forum
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari forum atau project..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
              outline: 'none', boxSizing: 'border-box', background: '#fff',
            }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {/* Forum Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontSize: 14 }}>Memuat forum...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
            <MessagesSquare size={44} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>
              {search ? 'Tidak ada forum yang cocok.' : 'Belum ada forum yang diikuti.'}
            </p>
            {!search && user?.role !== 'admin' && (
              <>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Gunakan link dari admin, atau klik tombol di bawah.</p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <UserPlus size={14} /> Tambah Forum
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map((forum, idx) => {
              const accent = forumColors[idx % forumColors.length];
              return (
                <div
                  key={forum.id}
                  style={{
                    background: '#fff', borderRadius: 14, padding: 22,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
                    cursor: 'pointer', transition: 'all 0.2s',
                    borderTop: `3px solid ${accent}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                  onClick={() => handleOpenChat(forum)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{
                      background: `${accent}18`, color: accent,
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {forum.project}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Clock size={11} /> {formatRelative(forum.last_activity)}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
                    {forum.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.5, minHeight: 38 }}>
                    {forum.description || <em>Tidak ada deskripsi.</em>}
                  </p>
                  <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> {forum.member_count ?? 0} anggota
                    </span>
                    <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} /> {forum.message_count ?? 0} pesan
                    </span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                      {formatDate(forum.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Forum Modal */}
      {showJoinModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowJoinModal(false); setJoinLink(''); } }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 8 }}><Link2 size={18} color="#2563EB" /></div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>Gabung Forum</h2>
              </div>
              <button onClick={() => { setShowJoinModal(false); setJoinLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Paste link atau token yang dikirim admin untuk bergabung ke forum chat.</p>
            <form onSubmit={handleJoinForum}>
              <input
                value={joinLink}
                onChange={e => setJoinLink(e.target.value)}
                placeholder="Contoh: http://...webchat.../chat/join/abc123"
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowJoinModal(false); setJoinLink(''); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, cursor: 'pointer' }}
                >Batal</button>
                <button type="submit" disabled={joinLoading || !joinLink.trim()}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: joinLoading || !joinLink.trim() ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: joinLoading || !joinLink.trim() ? 'not-allowed' : 'pointer' }}
                >{joinLoading ? 'Bergabung...' : 'Gabung'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
