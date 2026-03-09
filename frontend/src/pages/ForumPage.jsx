import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { MessagesSquare, Plus, Search, MessageSquare, X, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const initialForums = [
  {
    id: 'f-001', title: 'Support Umum', category: 'Support',
    desc: 'Forum untuk pertanyaan umum seputar layanan kami. Tim siap membantu!',
    author: 'admin', participants: 24, messages: 87,
    created: '01 Mar 2026', lastActivity: '10 menit lalu', link: '/chat/join/abc123',
    color: '#2563EB', bg: '#eff6ff',
  },
  {
    id: 'f-002', title: 'Project Alpha', category: 'Project',
    desc: 'Diskusi dan koordinasi tim untuk Project Alpha. Semua update ada di sini.',
    author: 'admin', participants: 8, messages: 142,
    created: '03 Mar 2026', lastActivity: '1 jam lalu', link: '/chat/join/def456',
    color: '#7c3aed', bg: '#f5f3ff',
  },
  {
    id: 'f-003', title: 'Billing & Pembayaran', category: 'Finance',
    desc: 'Pertanyaan seputar tagihan, pembayaran, dan refund.',
    author: 'admin', participants: 12, messages: 34,
    created: '06 Mar 2026', lastActivity: '3 jam lalu', link: '/chat/join/ghi789',
    color: '#059669', bg: '#ecfdf5',
  },
  {
    id: 'f-004', title: 'Pengumuman Platform', category: 'Announcement',
    desc: 'Info terbaru seputar pembaruan fitur dan pengumuman penting.',
    author: 'admin', participants: 30, messages: 15,
    created: '07 Mar 2026', lastActivity: '2 hari lalu', link: '/chat/join/jkl012',
    color: '#d97706', bg: '#fffbeb',
  },
];

const categoryColor = {
  Support:      { bg: '#eff6ff', color: '#2563EB' },
  Project:      { bg: '#f5f3ff', color: '#7c3aed' },
  Finance:      { bg: '#ecfdf5', color: '#059669' },
  Announcement: { bg: '#fffbeb', color: '#d97706' },
};

export default function ForumPage({ role = 'admin' }) {
  const { user, addToast } = useAuth();
  const navigate = useNavigate();
  const [forums, setForums] = useState(initialForums);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', desc: '', category: 'Support' });

  const isAdmin = user?.role === 'admin';

  const handleCreateForum = (e) => {
    e.preventDefault();
    const token = Math.random().toString(36).slice(2, 9);
    const newForum = {
      id: `f-${Date.now()}`,
      title: newForm.title,
      desc: newForm.desc,
      category: newForm.category,
      author: user?.username,
      participants: 1, messages: 0,
      created: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastActivity: 'Baru saja',
      link: `/chat/join/${token}`,
      color: categoryColor[newForm.category]?.color || '#2563EB',
      bg: categoryColor[newForm.category]?.bg || '#eff6ff',
    };
    setForums(prev => [newForum, ...prev]);
    setNewForm({ title: '', desc: '', category: 'Support' });
    setShowCreate(false);
    addToast(`Forum "${newForum.title}" berhasil dibuat!`, 'success');
  };

  const handleJoin = (forum) => {
    addToast(`Bergabung ke forum "${forum.title}"`, 'info');
    navigate(`/${user?.role}/chat`);
  };

  const filtered = forums.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.desc.toLowerCase().includes(search.toLowerCase())
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
              {isAdmin ? 'Buat dan kelola forum diskusi untuk tim dan client.' : 'Pilih forum untuk bergabung ke sesi chat.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Plus size={15} /> Forum Baru
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari forum..."
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
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
            <MessagesSquare size={44} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Belum ada forum.</p>
            {isAdmin && <p style={{ fontSize: 13 }}>Klik "Forum Baru" untuk membuatnya.</p>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map(forum => {
              const catStyle = categoryColor[forum.category] || { bg: '#f3f4f6', color: '#6B7280' };
              return (
                <div
                  key={forum.id}
                  style={{
                    background: '#fff', borderRadius: 14, padding: 22,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
                    cursor: 'pointer', transition: 'all 0.2s',
                    borderTop: `3px solid ${forum.color}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                  onClick={() => handleJoin(forum)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{
                      background: catStyle.bg, color: catStyle.color,
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                    }}>
                      {forum.category}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {forum.lastActivity}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
                    {forum.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.5 }}>
                    {forum.desc}
                  </p>
                  <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> {forum.participants} peserta
                    </span>
                    <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} /> {forum.messages} pesan
                    </span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                      oleh {forum.author}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Forum Modal */}
        {showCreate && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <div style={{
              background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937' }}>Buat Forum Baru</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateForum} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Judul Forum <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text" required
                    value={newForm.title}
                    onChange={e => setNewForm({ ...newForm, title: e.target.value })}
                    placeholder="Nama forum..."
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Kategori
                  </label>
                  <select
                    value={newForm.category}
                    onChange={e => setNewForm({ ...newForm, category: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box', background: '#fff',
                    }}
                  >
                    <option>Support</option>
                    <option>Project</option>
                    <option>Finance</option>
                    <option>Announcement</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Deskripsi
                  </label>
                  <textarea
                    rows={3}
                    value={newForm.desc}
                    onChange={e => setNewForm({ ...newForm, desc: e.target.value })}
                    placeholder="Deskripsi forum..."
                    style={{
                      width: '100%', padding: '10px 12px', resize: 'vertical',
                      border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button" onClick={() => setShowCreate(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8,
                      border: '1.5px solid #E5E7EB', background: '#fff',
                      color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    }}
                  >Batal</button>
                  <button
                    type="submit"
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                      color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >Buat Forum</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
