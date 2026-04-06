import { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  MessagesSquare,
  Search,
  MessageSquare,
  Users,
  Clock,
  Link2,
  UserPlus,
  X,
  ArrowUpRight,
  FolderOpen,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import useBreakpoint from '../hooks/useBreakpoint';

const forumColors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#0891B2', '#BE185D'];
const SOCKET_URL = 'http://localhost:5000';

// Parse timestamps coming from the server (stored in UTC as "YYYY-MM-DD HH:MM:SS").
const parseUtcDate = (value) => {
  if (!value) return null;
  const utc = value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`;
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getActivityTime = (value) => {
  const d = parseUtcDate(value);
  return d ? d.getTime() : 0;
};

const sortForumsByActivity = (items) => [...items].sort((a, b) => getActivityTime(b.last_activity || b.created_at) - getActivityTime(a.last_activity || a.created_at));

const cardBase = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

export default function ForumPage() {
  const { user, addToast } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const navigate = useNavigate();

  const [forums, setForums] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    api
      .get('/forums')
      .then((data) => setForums(data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  // Real-time updates: subscribe to forum preview updates and new_message events
  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on('forum_preview_updated', (payload) => {
      const forumId = payload?.forum_id ?? payload?.id;
      if (!forumId) return;
      setForums((prev) => {
        const updated = prev.map((f) => (f.id === forumId ? { ...f, ...payload, id: f.id } : f));
        return sortForumsByActivity(updated);
      });
    });

    socket.on('new_message', (msg) => {
      setForums((prev) => {
        const updated = prev.map((f) => {
          if (f.id !== msg.forum_id) return f;
          return {
            ...f,
            last_message: msg.content || '',
            last_file_name: msg.file_name || null,
            last_file_type: msg.file_type || null,
            last_activity: msg.created_at || f.last_activity,
            last_sender_id: msg.user_id || f.last_sender_id || null,
            last_sender_username: msg.username || f.last_sender_username || null,
            last_sender_role: msg.role || f.last_sender_role || null,
          };
        });
        return sortForumsByActivity(updated);
      });
    });

    return () => socket.disconnect();
  }, []);

  const filtered = useMemo(() => {
    return forums.filter(
      (f) =>
        f.title?.toLowerCase().includes(search.toLowerCase()) ||
        f.project?.toLowerCase().includes(search.toLowerCase())
    );
  }, [forums, search]);

  const totalMembers = useMemo(() => {
    return forums.reduce((sum, forum) => sum + (forum.member_count ?? 0), 0);
  }, [forums]);

  const totalMessages = useMemo(() => {
    return forums.reduce((sum, forum) => sum + (forum.message_count ?? 0), 0);
  }, [forums]);

  const handleOpenChat = (forum) => {
    navigate(`/${user?.role}/chat`, { state: { forumId: forum.id } });
  };

  const handleJoinForum = async (e) => {
    e.preventDefault();
    const raw = joinLink.trim();
    if (!raw) return;

    const match = raw.match(/\/chat\/join\/([a-zA-Z0-9]+)/);
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

    const d = parseUtcDate(dt);
    if (!d) return 'â€”';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  };

  const formatRelative = (dt) => {
    const d = parseUtcDate(dt);
    if (!d) return 'â€”';
    const diff = Date.now() - d.getTime();

    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;

    return `${Math.floor(hours / 24)} hari lalu`;
  };

  const closeJoinModal = () => {
    setShowJoinModal(false);
    setJoinLink('');
  };

  const isAdmin = user?.role === 'admin';

  const statCardStyle = {
    ...cardBase,
    padding: 18,
  };

  const toggleButtonStyle = (active) => ({
    width: 38,
    height: 38,
    borderRadius: 10,
    border: '1px solid',
    borderColor: active ? '#93C5FD' : '#E5E7EB',
    background: active ? '#EFF6FF' : '#fff',
    color: active ? '#2563EB' : '#6B7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  const pagePadding = isMobile ? '20px 14px' : isTablet ? '26px 20px' : '32px 36px';
  const statsColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';

  return (
    <DashboardLayout>
      <div style={{ padding: pagePadding, width: '100%' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MessagesSquare size={22} color="#2563EB" />
              <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: '#1F2937', margin: 0 }}>
                Forum
              </h1>
            </div>

            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
              {isAdmin
                ? 'Semua forum chat yang telah dibuat dan bisa dikelola dari sini.'
                : 'Forum yang kamu ikuti. Pilih tampilan yang paling nyaman untukmu.'}
            </p>
          </div>

          <button
            onClick={() => (isAdmin ? navigate('/admin/create-link') : setShowJoinModal(true))}
            style={{
              padding: isMobile ? '10px 14px' : '11px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
              color: '#fff',
              fontWeight: 700,
              fontSize: isMobile ? 13 : 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(37,99,235,0.18)',
            }}
          >
            {isAdmin ? <Link2 size={15} /> : <UserPlus size={15} />}
            {isAdmin ? 'Buat Forum' : 'Gabung Forum'}
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: statsColumns,
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={statCardStyle}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              Total Forum
            </p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{forums.length}</p>
          </div>

          <div style={statCardStyle}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              Total Anggota
            </p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{totalMembers}</p>
          </div>

          <div style={statCardStyle}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              Total Pesan
            </p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1F2937' }}>{totalMessages}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div
          style={{
            ...cardBase,
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 220, maxWidth: isMobile ? '100%' : 420 }}>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari forum atau project..."
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 36px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fff',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>
                {filtered.length} forum
              </span>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={toggleButtonStyle(viewMode === 'grid')}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={toggleButtonStyle(viewMode === 'list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Content */}
        {loading ? (

          <div
            style={{
              ...cardBase,
              padding: '64px 0',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: 14,
            }}
          >
            Memuat forum...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              ...cardBase,
              padding: '64px 24px',
              textAlign: 'center',
              color: '#9CA3AF',
            }}
          >
            <FolderOpen size={44} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.28 }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: '#6B7280' }}>
              {search ? 'Tidak ada forum yang cocok' : 'Belum ada forum'}
            </p>

            <p style={{ fontSize: 13, margin: '0 0 18px' }}>
              {search
                ? 'Coba gunakan kata kunci lain.'
                : isAdmin
                ? 'Forum yang dibuat akan muncul di halaman ini.'
                : 'Gunakan link dari admin untuk bergabung ke forum.'}
            </p>

            {!search && !isAdmin && (
              <button
                onClick={() => setShowJoinModal(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <UserPlus size={14} /> Gabung Forum
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 250 : 320}px, 1fr))`,
              gap: 18,
            }}
          >
            {filtered.map((forum, idx) => {
              const accent = forumColors[idx % forumColors.length];

              return (
                <button
                  key={forum.id}
                  type="button"
                  onClick={() => handleOpenChat(forum)}
                  style={{
                    ...cardBase,
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderTop: `4px solid ${accent}`,
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ padding: 22 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            background: `${accent}18`,
                            color: accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {forum.project?.slice(0, 1)?.toUpperCase() || 'F'}
                        </div>

                        <span
                          style={{
                            background: `${accent}14`,
                            color: accent,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '5px 10px',
                            borderRadius: 999,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {forum.project}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, color: '#9CA3AF', fontSize: 11, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={11} />
                          <strong style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Aktif terakhir:</strong>
                          <span style={{ marginLeft: 6 }}>{formatRelative(forum.last_activity)}</span>
                        </div>
                        {forum.last_read_at && (
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Terakhir dibuka: {formatRelative(forum.last_read_at)}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#1F2937',
                          margin: '0 0 6px',
                          lineHeight: 1.3,
                        }}
                      >
                        {forum.title}
                      </h3>

                      <p
                        style={{
                          fontSize: 13,
                          color: '#6B7280',
                          margin: 0,
                          lineHeight: 1.6,
                          minHeight: 42,
                        }}
                      >
                        {forum.description || <em>Tidak ada deskripsi.</em>}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Users size={12} /> {forum.member_count ?? 0} anggota
                        </span>

                        <span
                          style={{
                            fontSize: 12,
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <MessageSquare size={12} /> {forum.message_count ?? 0} pesan
                        </span>
                      </div>

                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {isAdmin
                          ? `Dibuat pada: ${formatDate(forum.created_at)}`
                          : `Masuk forum pada: ${formatDate(forum.joined_at || forum.created_at)}`}
                      </span>
                    </div>
                  </div>

                </button>
              );
            })}
          </div>
        ) : (

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {filtered.map((forum, idx) => {
              const accent = forumColors[idx % forumColors.length];

              return (
                <button
                  key={forum.id}

                  type="button"
                  onClick={() => handleOpenChat(forum)}
                  style={{
                    ...cardBase,
                    padding: 18,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${accent}`,
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    background: '#fff',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                  
                >
                  <div className="forum-card-header">
                    <span 
                      className="forum-badge"
                      style={{ background: `${accent}18`, color: accent }}
                    >
                      {forum.project}
                    </span>

                    <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Clock size={11} /> <strong style={{ fontSize: 11, fontWeight: 600 }}>Aktif terakhir:</strong>&nbsp;{formatRelative(forum.last_activity)}

                    </span>
                  </div>

                  <h3 className="forum-card-title">{forum.title}</h3>
                  
                  <p className="forum-card-desc">
                    {forum.description || <em>Tidak ada deskripsi.</em>}
                  </p>

                  <div className="forum-card-footer">
                    <span className="forum-stat">
                      <Users size={12} /> {forum.member_count ?? 0} anggota
                    </span>
                    <span className="forum-stat">
                      <MessageSquare size={12} /> {forum.message_count ?? 0} pesan
                    </span>

                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
                      {isAdmin
                        ? `Dibuat pada: ${formatDate(forum.created_at)}`
                        : `Masuk forum pada: ${formatDate(forum.joined_at || forum.created_at)}`}

                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Forum Modal */}
      {showJoinModal && (
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
            if (e.target === e.currentTarget) closeJoinModal();
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
                alignItems: 'flex-start',
                marginBottom: 10,
                gap: 12,
              }}
            >

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    background: '#eff6ff',
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Link2 size={18} color="#2563EB" />
                </div>

                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1F2937', margin: 0 }}>Gabung Forum</h2>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                    Paste link atau token forum dari admin.
                  </p>
                </div>
              </div>

              <button
                onClick={closeJoinModal}
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
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinForum}>
              <input
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
                placeholder="Contoh: /chat/join/abc123 atau paste full link"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginTop: 14,
                  marginBottom: 18,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />

              <div style={{ display: 'flex', gap: 10 }}>

                <button
                  type="button"
                  onClick={closeJoinModal}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 10,
                    border: '1.5px solid #E5E7EB',
                    background: '#fff',
                    color: '#6B7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={joinLoading || !joinLink.trim()}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 10,
                    border: 'none',
                    background:
                      joinLoading || !joinLink.trim()
                        ? '#93c5fd'
                        : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: joinLoading || !joinLink.trim() ? 'not-allowed' : 'pointer',

                  }}
                >
                  {joinLoading ? 'Bergabung...' : 'Gabung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}